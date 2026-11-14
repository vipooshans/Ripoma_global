/**
 * Native Storefront Catalog read-path backed directly by Cloudflare D1 (ripoma_db).
 *
 * Runs natively inside Cloudflare Workers without requiring Express or external servers.
 * Single-query SQL aggregations with LEFT JOINs for stock and reviews.
 */

const ACTIVE_SQL = "p.status = 'active' AND p.deleted = 0";

const PRODUCT_SELECT = `
  SELECT
    p.id, p.sku, p.name, p.description, p.brand, p.selling_price, p.images,
    p.tags, p.unit, p.weight, p.dimensions, p.country_of_origin, p.hs_code,
    p.faqs, p.is_featured, p.created_at,
    p.category_id, c.name AS category_name, c.description AS category_description,
    COALESCE(inv.on_hand, 0) AS total_stock,
    COALESCE(rev.avg_rating, 0) AS avg_rating,
    COALESCE(rev.review_count, 0) AS review_count
  FROM products p
  LEFT JOIN categories c ON c.id = p.category_id
  LEFT JOIN (
    SELECT product_id, SUM(quantity_on_hand) AS on_hand
    FROM inventory_items GROUP BY product_id
  ) inv ON inv.product_id = p.id
  LEFT JOIN (
    SELECT product_id, AVG(rating) AS avg_rating, COUNT(*) AS review_count
    FROM product_reviews WHERE status = 'approved' GROUP BY product_id
  ) rev ON rev.product_id = p.id
`;

const parseJson = (text, fallback) => {
  if (text === null || text === undefined) return fallback;
  try {
    const parsed = JSON.parse(text);
    return parsed === null ? fallback : parsed;
  } catch {
    return fallback;
  }
};

const rowToProduct = (row) => ({
  id: row.id,
  sku: row.sku,
  name: row.name,
  description: row.description,
  brand: row.brand || null,
  category: row.category_id
    ? {
        id: row.category_id,
        name: row.category_name,
        description: row.category_description
      }
    : null,
  sellingPrice: row.selling_price,
  currency: 'LKR',
  images: parseJson(row.images, []),
  tags: parseJson(row.tags, []),
  unit: row.unit,
  weight: row.weight,
  dimensions: parseJson(row.dimensions, undefined),
  countryOfOrigin: row.country_of_origin,
  hsCode: row.hs_code || null,
  faqs: parseJson(row.faqs, []).filter((f) => f && f.question && f.answer),
  totalStock: row.total_stock,
  isFeatured: Boolean(row.is_featured),
  reviewSummary: {
    average: Math.round((row.avg_rating || 0) * 10) / 10,
    count: row.review_count || 0
  }
});

const SORT_SQL = {
  price_asc: 'p.selling_price ASC',
  price_desc: 'p.selling_price DESC',
  name_asc: 'p.name ASC',
  name_desc: 'p.name DESC',
  popularity: 'p.is_featured DESC, p.created_at DESC',
  rating: 'avg_rating DESC, review_count DESC',
  newest: 'p.created_at DESC'
};

function buildFilter({ search, category, minPrice, maxPrice, brand, availability }) {
  const where = [ACTIVE_SQL];
  const params = [];
  let cte = '';

  if (search && String(search).trim()) {
    const tokens = String(search).trim().split(/\s+/).filter(Boolean);
    for (const token of tokens) {
      const like = `%${token}%`;
      where.push(
        '(p.name LIKE ? OR p.description LIKE ? OR p.tags LIKE ? OR p.sku LIKE ? OR p.brand LIKE ?)'
      );
      params.push(like, like, like, like, like);
    }
  }

  if (category) {
    cte = `WITH RECURSIVE descendants(id) AS (
      SELECT id FROM categories WHERE id = ?
      UNION ALL
      SELECT c2.id FROM categories c2 JOIN descendants d ON c2.parent_id = d.id
    ) `;
    params.unshift(category);
    where.push('p.category_id IN (SELECT id FROM descendants)');
  }

  if (minPrice !== undefined && minPrice !== '' && !isNaN(Number(minPrice))) {
    where.push('p.selling_price >= ?');
    params.push(Number(minPrice));
  }
  if (maxPrice !== undefined && maxPrice !== '' && !isNaN(Number(maxPrice))) {
    where.push('p.selling_price <= ?');
    params.push(Number(maxPrice));
  }

  if (brand && String(brand).trim()) {
    const brands = String(brand).split(',').map((b) => b.trim()).filter(Boolean);
    if (brands.length === 1) {
      where.push('p.brand = ?');
      params.push(brands[0]);
    } else if (brands.length > 1) {
      const placeholders = brands.map(() => '?').join(', ');
      where.push(`p.brand IN (${placeholders})`);
      params.push(...brands);
    }
  }

  if (availability === 'in_stock') {
    where.push('COALESCE(inv.on_hand, 0) > 0');
  } else if (availability === 'out_of_stock') {
    where.push('COALESCE(inv.on_hand, 0) <= 0');
  }

  return { cte, whereSql: where.join(' AND '), params };
}

// ── 1. Categories Tree ───────────────────────────────────────────────────────
export async function getStorefrontCategories(db) {
  const [catsOutcome, countsOutcome] = await Promise.all([
    db
      .prepare(
        'SELECT id, name, slug, description, icon, parent_id FROM categories ORDER BY sort_order ASC, name ASC'
      )
      .all(),
    db
      .prepare(
        `SELECT p.category_id, COUNT(*) AS count
         FROM products p
         WHERE ${ACTIVE_SQL} AND p.category_id IS NOT NULL
         GROUP BY p.category_id`
      )
      .all()
  ]);

  const categories = catsOutcome?.results || [];
  const counts = countsOutcome?.results || [];
  const directCounts = new Map();
  for (const c of counts) {
    directCounts.set(String(c.category_id), Number(c.count) || 0);
  }

  const childrenMap = new Map();
  for (const cat of categories) {
    const parentKey = cat.parent_id ? String(cat.parent_id) : 'root';
    if (!childrenMap.has(parentKey)) childrenMap.set(parentKey, []);
    childrenMap.get(parentKey).push(cat);
  }

  function rollup(id) {
    const sId = String(id);
    let total = directCounts.get(sId) || 0;
    for (const child of childrenMap.get(sId) || []) {
      total += rollup(child.id);
    }
    return total;
  }

  function formatNode(cat) {
    const sId = String(cat.id);
    const children = childrenMap.get(sId) || [];
    const directCount = directCounts.get(sId) || 0;
    const subcategories = children
      .map(formatNode)
      .filter((n) => n && (n.productCount > 0 || n.subcategories.length > 0));
    const productCount = rollup(cat.id);

    if (productCount === 0 && subcategories.length === 0) return null;

    return {
      id: cat.id,
      name: cat.name,
      slug: cat.slug,
      description: cat.description,
      icon: cat.icon,
      directCount,
      productCount,
      subcategories
    };
  }

  const tree = (childrenMap.get('root') || [])
    .map(formatNode)
    .filter(Boolean);

  return { categories: tree };
}

// ── 2. Category Detail ───────────────────────────────────────────────────────
export async function getStorefrontCategoryDetail(db, id) {
  const row = await db
    .prepare('SELECT id, name, slug, description, icon, parent_id FROM categories WHERE id = ?')
    .bind(id)
    .first();

  if (!row) return null;

  const countRow = await db
    .prepare(
      `WITH RECURSIVE descendants(id) AS (
         SELECT id FROM categories WHERE id = ?
         UNION ALL
         SELECT c.id FROM categories c JOIN descendants d ON c.parent_id = d.id
       )
       SELECT COUNT(*) AS total
       FROM products p
       WHERE ${ACTIVE_SQL} AND p.category_id IN (SELECT id FROM descendants)`
    )
    .bind(id)
    .first();

  return {
    category: {
      id: row.id,
      name: row.name,
      slug: row.slug,
      description: row.description,
      icon: row.icon,
      parentId: row.parent_id,
      productCount: Number(countRow?.total) || 0
    }
  };
}

// ── 3. Featured Products ─────────────────────────────────────────────────────
export async function getStorefrontFeatured(db, limit = 8) {
  const safeLimit = Math.max(1, Math.min(50, Number(limit) || 8));
  let outcome = await db
    .prepare(`${PRODUCT_SELECT} WHERE ${ACTIVE_SQL} AND p.is_featured = 1 ORDER BY p.created_at DESC LIMIT ?`)
    .bind(safeLimit)
    .all();

  let rows = outcome?.results || [];
  if (!rows.length) {
    outcome = await db
      .prepare(`${PRODUCT_SELECT} WHERE ${ACTIVE_SQL} ORDER BY p.created_at DESC LIMIT ?`)
      .bind(safeLimit)
      .all();
    rows = outcome?.results || [];
  }

  return { products: rows.map(rowToProduct) };
}

// ── 4. Product Listing & Filter ──────────────────────────────────────────────
export async function getStorefrontProducts(db, queryParams = {}) {
  const page = Math.max(1, parseInt(queryParams.page, 10) || 1);
  const limit = Math.max(1, Math.min(60, parseInt(queryParams.limit, 10) || 12));
  const offset = (page - 1) * limit;

  const { cte, whereSql, params } = buildFilter(queryParams);
  const sortClause = SORT_SQL[queryParams.sort] || SORT_SQL.newest;

  const countSql = `${cte}
    SELECT COUNT(*) AS total
    FROM products p
    LEFT JOIN (
      SELECT product_id, SUM(quantity_on_hand) AS on_hand
      FROM inventory_items GROUP BY product_id
    ) inv ON inv.product_id = p.id
    WHERE ${whereSql}`;

  const listSql = `${cte}
    ${PRODUCT_SELECT}
    WHERE ${whereSql}
    ORDER BY ${sortClause}
    LIMIT ? OFFSET ?`;

  const [countRes, listRes] = await Promise.all([
    db.prepare(countSql).bind(...params).first(),
    db.prepare(listSql).bind(...params, limit, offset).all()
  ]);

  const total = Number(countRes?.total) || 0;
  const rows = listRes?.results || [];

  return {
    products: rows.map(rowToProduct),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit))
    }
  };
}

// ── 5. Product Detail ────────────────────────────────────────────────────────
export async function getStorefrontProductDetail(db, id) {
  const row = await db
    .prepare(`${PRODUCT_SELECT} WHERE ${ACTIVE_SQL} AND p.id = ?`)
    .bind(id)
    .first();

  if (!row) return null;

  return { product: rowToProduct(row) };
}

// ── 6. Product Facets ────────────────────────────────────────────────────────
export async function getStorefrontFacets(db, queryParams = {}) {
  const { cte, whereSql, params } = buildFilter({
    ...queryParams,
    minPrice: undefined,
    maxPrice: undefined,
    brand: undefined
  });

  const sql = `${cte}
    SELECT
      MIN(p.selling_price) AS min_price,
      MAX(p.selling_price) AS max_price,
      p.brand,
      COUNT(*) AS brand_count
    FROM products p
    LEFT JOIN (
      SELECT product_id, SUM(quantity_on_hand) AS on_hand
      FROM inventory_items GROUP BY product_id
    ) inv ON inv.product_id = p.id
    WHERE ${whereSql} AND p.brand IS NOT NULL AND p.brand != ''
    GROUP BY p.brand`;

  const outcome = await db.prepare(sql).bind(...params).all();
  const rows = outcome?.results || [];

  let minPrice = 0;
  let maxPrice = 0;
  const brands = [];

  for (const r of rows) {
    if (r.min_price != null) {
      minPrice = minPrice === 0 ? r.min_price : Math.min(minPrice, r.min_price);
      maxPrice = Math.max(maxPrice, r.max_price);
    }
    if (r.brand) {
      brands.push({ name: r.brand, count: Number(r.brand_count) || 0 });
    }
  }

  // Also query global price range if no brands exist
  if (!rows.length) {
    const rangeRes = await db
      .prepare(`SELECT MIN(p.selling_price) AS min_price, MAX(p.selling_price) AS max_price FROM products p WHERE ${ACTIVE_SQL}`)
      .first();
    minPrice = rangeRes?.min_price || 0;
    maxPrice = rangeRes?.max_price || 0;
  }

  return {
    brands,
    priceRange: { min: minPrice, max: maxPrice }
  };
}

// ── 7. Storefront Stats ──────────────────────────────────────────────────────
export async function getStorefrontStats(db) {
  const [prodCount, catCount] = await Promise.all([
    db.prepare(`SELECT COUNT(*) AS total FROM products WHERE ${ACTIVE_SQL}`).first(),
    db
      .prepare(
        `SELECT COUNT(DISTINCT category_id) AS total
         FROM products
         WHERE ${ACTIVE_SQL} AND category_id IS NOT NULL`
      )
      .first()
  ]);

  return {
    stats: {
      productCount: Number(prodCount?.total) || 0,
      categoryCount: Number(catCount?.total) || 0
    }
  };
}

// ── 8. Search Suggestions ────────────────────────────────────────────────────
export async function getStorefrontSearchSuggestions(db, q) {
  const trimmed = String(q || '').trim();
  if (!trimmed) return { suggestions: [], categories: [] };

  const like = `%${trimmed}%`;
  const [prodRes, catRes] = await Promise.all([
    db
      .prepare(`SELECT id, name FROM products WHERE ${ACTIVE_SQL} AND name LIKE ? LIMIT 6`)
      .bind(like)
      .all(),
    db
      .prepare('SELECT id, name, slug FROM categories WHERE name LIKE ? LIMIT 4')
      .bind(like)
      .all()
  ]);

  return {
    suggestions: (prodRes?.results || []).map((p) => ({ id: p.id, name: p.name })),
    categories: (catRes?.results || []).map((c) => ({ id: c.id, name: c.name, slug: c.slug }))
  };
}

// ── 9. Storefront Promos ─────────────────────────────────────────────────────
export function getStorefrontPromos() {
  return {
    promos: {
      marquee: [
        { text: 'Verified quality standards', icon: 'shield' },
        { text: 'Same-day order processing', icon: 'zap' },
        { text: 'Worldwide delivery network', icon: 'globe' }
      ],
      cards: [
        {
          title: 'New Season Arrivals',
          subtitle: 'Explore the latest products added to our global catalog',
          link: '/customer/products?sort=newest',
          cta: 'Shop New'
        },
        {
          title: 'Bulk Order Savings',
          subtitle: 'Volume pricing available on select industrial goods',
          link: '/customer/products',
          cta: 'Browse Catalog'
        }
      ]
    }
  };
}

