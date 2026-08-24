/**
 * Storefront catalog read path backed by Cloudflare D1.
 *
 * First slice of the MongoDB -> D1 migration. Enabled per-request from
 * storefront.controller.js when DATA_BACKEND=d1. Returns data in exactly the
 * same shapes the Mongo-backed controller produces, so the API contract is
 * unchanged.
 *
 * Unlike the Mongo path (one stock lookup per product), every list here is a
 * single SQL query with JOINed stock and review aggregates.
 */

const d1 = require('../utils/d1');
const {
  buildChildrenMap,
  rollupProductCount
} = require('../utils/categoryHelpers');

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

/**
 * Translates the storefront list query params into a WHERE clause + params.
 * Category filtering uses a recursive CTE over categories.parent_id.
 */
const buildFilter = ({ search, category, minPrice, maxPrice, brand, availability }) => {
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

  if (minPrice !== undefined && minPrice !== '' && !Number.isNaN(Number(minPrice))) {
    where.push('p.selling_price >= ?');
    params.push(Number(minPrice));
  }
  if (maxPrice !== undefined && maxPrice !== '' && !Number.isNaN(Number(maxPrice))) {
    where.push('p.selling_price <= ?');
    params.push(Number(maxPrice));
  }
  if (brand && String(brand).trim()) {
    where.push('LOWER(p.brand) = LOWER(?)');
    params.push(String(brand).trim());
  }

  if (availability === 'in_stock') {
    where.push('COALESCE(inv.on_hand, 0) > 0');
  } else if (availability === 'out_of_stock') {
    where.push('COALESCE(inv.on_hand, 0) <= 0');
  }

  return { cte, whereSql: where.join(' AND '), params };
};

exports.listProducts = async (queryParams) => {
  const { sort, page, limit } = queryParams;
  const pageNum = parseInt(page, 10) || 1;
  const limitNum = parseInt(limit, 10) || 12;
  const orderBy = SORT_SQL[sort] || SORT_SQL.newest;

  const { cte, whereSql, params } = buildFilter(queryParams);

  const countSql = `${cte}SELECT COUNT(*) AS total FROM products p
    LEFT JOIN (
      SELECT product_id, SUM(quantity_on_hand) AS on_hand
      FROM inventory_items GROUP BY product_id
    ) inv ON inv.product_id = p.id
    WHERE ${whereSql}`;

  const listSql = `${cte}${PRODUCT_SELECT} WHERE ${whereSql}
    ORDER BY ${orderBy} LIMIT ? OFFSET ?`;

  const [countRow, rows] = await Promise.all([
    d1.first(countSql, params),
    d1.all(listSql, [...params, limitNum, (pageNum - 1) * limitNum])
  ]);

  const total = countRow?.total || 0;
  return {
    products: rows.map(rowToProduct),
    pagination: {
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum) || 1
    }
  };
};

exports.getFacets = async (queryParams) => {
  const { cte, whereSql, params } = buildFilter(queryParams);

  const sql = `${cte}SELECT
      MIN(p.selling_price) AS min_price,
      MAX(p.selling_price) AS max_price
    FROM products p
    LEFT JOIN (
      SELECT product_id, SUM(quantity_on_hand) AS on_hand
      FROM inventory_items GROUP BY product_id
    ) inv ON inv.product_id = p.id
    WHERE ${whereSql}`;

  const brandsSql = `${cte}SELECT DISTINCT p.brand FROM products p
    LEFT JOIN (
      SELECT product_id, SUM(quantity_on_hand) AS on_hand
      FROM inventory_items GROUP BY product_id
    ) inv ON inv.product_id = p.id
    WHERE ${whereSql} AND p.brand IS NOT NULL AND p.brand != ''`;

  const [priceRow, brandRows] = await Promise.all([
    d1.first(sql, params),
    d1.all(brandsSql, params)
  ]);

  return {
    brands: brandRows
      .map((r) => r.brand)
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b)),
    priceRange: {
      min: priceRow?.min_price ?? 0,
      max: priceRow?.max_price ?? 0
    }
  };
};

exports.getFeatured = async (limit = 8) => {
  let rows = await d1.all(
    `${PRODUCT_SELECT} WHERE ${ACTIVE_SQL} AND p.is_featured = 1
     ORDER BY p.updated_at DESC LIMIT ?`,
    [limit]
  );
  if (rows.length === 0) {
    rows = await d1.all(
      `${PRODUCT_SELECT} WHERE ${ACTIVE_SQL} ORDER BY p.created_at DESC LIMIT ?`,
      [limit]
    );
  }
  return rows.map(rowToProduct);
};

exports.getProductDetail = async (id) => {
  const row = await d1.first(
    `${PRODUCT_SELECT} WHERE ${ACTIVE_SQL} AND p.id = ?`,
    [id]
  );
  if (!row) return null;

  const relatedRows = await d1.all(
    `${PRODUCT_SELECT} WHERE ${ACTIVE_SQL} AND p.category_id = ? AND p.id != ? LIMIT 4`,
    [row.category_id, id]
  );

  return {
    product: rowToProduct(row),
    related: relatedRows.map(rowToProduct)
  };
};

/* ── Categories ─────────────────────────────────────────────────────────── */

const fetchCategoryRows = async () => {
  const [categories, countRows] = await Promise.all([
    d1.all(
      'SELECT id, name, slug, description, icon, parent_id FROM categories ORDER BY sort_order ASC, name ASC'
    ),
    d1.all(
      `SELECT category_id, COUNT(*) AS count FROM products p
       WHERE ${ACTIVE_SQL} GROUP BY category_id`
    )
  ]);

  // Shape rows like lean Mongoose docs so the shared tree helpers work as-is.
  const catDocs = categories.map((c) => ({
    _id: c.id,
    name: c.name,
    slug: c.slug,
    description: c.description,
    icon: c.icon,
    parent: c.parent_id
  }));

  const directCounts = new Map();
  countRows.forEach((r) => {
    if (r.category_id) directCounts.set(String(r.category_id), r.count);
  });

  return { catDocs, directCounts };
};

const formatNode = (cat, childrenMap, directCounts) => {
  const id = String(cat._id);
  const children = childrenMap.get(id) || [];
  const directCount = directCounts.get(id) || 0;

  const subcategories = children
    .map((child) => formatNode(child, childrenMap, directCounts))
    .filter((node) => node && (node.productCount > 0 || node.subcategories.length > 0));

  const productCount = rollupProductCount(cat._id, childrenMap, directCounts);
  if (productCount === 0 && subcategories.length === 0) return null;

  return {
    id: cat._id,
    name: cat.name,
    slug: cat.slug,
    description: cat.description,
    icon: cat.icon,
    directCount,
    productCount,
    subcategories
  };
};

exports.getCategoryTree = async () => {
  const { catDocs, directCounts } = await fetchCategoryRows();
  const childrenMap = buildChildrenMap(catDocs);
  const roots = childrenMap.get('root') || [];
  return roots.map((cat) => formatNode(cat, childrenMap, directCounts)).filter(Boolean);
};

exports.getCategoryDetail = async (categoryId) => {
  const { catDocs, directCounts } = await fetchCategoryRows();
  const category = catDocs.find((c) => String(c._id) === String(categoryId));
  if (!category) return null;

  const childrenMap = buildChildrenMap(catDocs);
  const node = formatNode(category, childrenMap, directCounts);
  const directCount = directCounts.get(String(categoryId)) || 0;
  if (!node && directCount === 0) return null;

  const byId = new Map(catDocs.map((c) => [String(c._id), c]));
  const breadcrumb = [];
  let current = byId.get(String(categoryId));
  while (current) {
    breadcrumb.unshift({ id: current._id, name: current.name, slug: current.slug });
    current = current.parent ? byId.get(String(current.parent)) : null;
  }

  return {
    ...(node || {
      id: category._id,
      name: category.name,
      slug: category.slug,
      description: category.description,
      icon: category.icon,
      directCount,
      productCount: directCount,
      subcategories: []
    }),
    breadcrumb
  };
};

/* ── Search suggestions & stats ─────────────────────────────────────────── */

exports.getSearchSuggestions = async (q) => {
  const trimmed = String(q || '').trim();
  if (trimmed.length < 2) return { suggestions: [], categories: [] };

  const like = `%${trimmed}%`;
  const rows = await d1.all(
    `SELECT id, name, sku, images, selling_price, brand FROM products p
     WHERE ${ACTIVE_SQL} AND (p.name LIKE ? OR p.sku LIKE ? OR p.brand LIKE ?)
     LIMIT 24`,
    [like, like, like]
  );

  const qLower = trimmed.toLowerCase();
  const suggestions = rows
    .sort((a, b) => {
      const aPrefix = String(a.name).toLowerCase().startsWith(qLower) ? 0 : 1;
      const bPrefix = String(b.name).toLowerCase().startsWith(qLower) ? 0 : 1;
      if (aPrefix !== bPrefix) return aPrefix - bPrefix;
      return String(a.name).localeCompare(String(b.name));
    })
    .slice(0, 6)
    .map((p) => ({
      type: 'product',
      id: p.id,
      name: p.name,
      sku: p.sku,
      image: parseJson(p.images, [])[0] || null,
      sellingPrice: p.selling_price,
      currency: 'LKR',
      brand: p.brand || null
    }));

  const tree = await exports.getCategoryTree();
  const flat = [];
  const flatten = (nodes) => {
    for (const node of nodes || []) {
      flat.push(node);
      if (node.subcategories?.length) flatten(node.subcategories);
    }
  };
  flatten(tree);

  const categories = flat
    .filter((c) => c.name && String(c.name).toLowerCase().includes(qLower) && c.productCount > 0)
    .sort((a, b) => {
      const aPrefix = String(a.name).toLowerCase().startsWith(qLower) ? 0 : 1;
      const bPrefix = String(b.name).toLowerCase().startsWith(qLower) ? 0 : 1;
      if (aPrefix !== bPrefix) return aPrefix - bPrefix;
      return String(a.name).localeCompare(String(b.name));
    })
    .slice(0, 4)
    .map((c) => ({
      type: 'category',
      id: c.id,
      name: c.name,
      productCount: c.productCount
    }));

  return { suggestions, categories };
};

exports.getStats = async () => {
  const row = await d1.first(
    `SELECT COUNT(*) AS product_count, COUNT(DISTINCT category_id) AS category_count
     FROM products p WHERE ${ACTIVE_SQL}`
  );
  return {
    productCount: row?.product_count || 0,
    categoryCount: row?.category_count || 0
  };
};
