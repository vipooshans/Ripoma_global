/**
 * D1 fallback for GET /api/storefront/categories when Express returns 500.
 * Matches the storefront category tree shape used by the customer homepage.
 */

function buildChildrenMap(categories) {
  const map = new Map();
  for (const cat of categories) {
    const parentKey = cat.parent ? String(cat.parent) : 'root';
    if (!map.has(parentKey)) map.set(parentKey, []);
    map.get(parentKey).push(cat);
  }
  return map;
}

function rollupProductCount(categoryId, childrenMap, directCounts) {
  const id = String(categoryId);
  let total = directCounts.get(id) || 0;
  for (const child of childrenMap.get(id) || []) {
    total += rollupProductCount(child._id, childrenMap, directCounts);
  }
  return total;
}

function formatNode(cat, childrenMap, directCounts) {
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
}

export async function categoriesResponseFromD1(env) {
  const db = env.ripoma_db;
  if (!db) return null;

  const [catResult, countResult] = await Promise.all([
    db
      .prepare(
        'SELECT id, name, slug, description, icon, parent_id FROM categories ORDER BY sort_order ASC, name ASC'
      )
      .all(),
    db
      .prepare(
        `SELECT category_id, COUNT(*) AS count FROM products
         WHERE status = 'active' AND deleted = 0
         GROUP BY category_id`
      )
      .all()
  ]);

  const catDocs = (catResult.results || []).map((c) => ({
    _id: c.id,
    name: c.name,
    slug: c.slug,
    description: c.description,
    icon: c.icon,
    parent: c.parent_id
  }));

  const directCounts = new Map();
  for (const row of countResult.results || []) {
    if (row.category_id) directCounts.set(String(row.category_id), row.count);
  }

  const childrenMap = buildChildrenMap(catDocs);
  const roots = childrenMap.get('root') || [];
  const categories = roots
    .map((cat) => formatNode(cat, childrenMap, directCounts))
    .filter(Boolean);

  return new Response(JSON.stringify({ categories }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
}
