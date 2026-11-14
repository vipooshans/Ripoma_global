const Category = require('../models/Category');
const Product = require('../models/Product');

const ACTIVE_PRODUCT_QUERY = { status: 'active', deleted: false };

function buildChildrenMap(categories) {
  const map = new Map();
  categories.forEach((cat) => {
    const parentKey = cat.parent ? String(cat.parent._id || cat.parent) : 'root';
    if (!map.has(parentKey)) map.set(parentKey, []);
    map.get(parentKey).push(cat);
  });
  return map;
}

async function getDirectProductCounts() {
  const rows = await Product.aggregate([
    { $match: ACTIVE_PRODUCT_QUERY },
    { $group: { _id: '$category', count: { $sum: 1 } } }
  ]);
  const counts = new Map();
  rows.forEach((row) => {
    if (row._id) counts.set(String(row._id), row.count);
  });
  return counts;
}

function rollupProductCount(categoryId, childrenMap, directCounts) {
  const id = String(categoryId);
  let total = directCounts.get(id) || 0;
  const children = childrenMap.get(id) || [];
  for (const child of children) {
    total += rollupProductCount(child._id, childrenMap, directCounts);
  }
  return total;
}

function formatStorefrontNode(cat, childrenMap, directCounts) {
  const id = String(cat._id);
  const children = childrenMap.get(id) || [];
  const directCount = directCounts.get(id) || 0;

  const subcategories = children
    .map((child) => formatStorefrontNode(child, childrenMap, directCounts))
    .filter((node) => node && (node.productCount > 0 || node.subcategories.length > 0));

  const productCount = rollupProductCount(cat._id, childrenMap, directCounts);

  if (productCount === 0 && subcategories.length === 0) {
    return null;
  }

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

async function buildStorefrontCategoryTree() {
  const categories = await Category.find().sort({ sortOrder: 1, name: 1 }).lean();
  const childrenMap = buildChildrenMap(categories);
  const directCounts = await getDirectProductCounts();
  const roots = childrenMap.get('root') || [];

  return roots
    .map((cat) => formatStorefrontNode(cat, childrenMap, directCounts))
    .filter(Boolean);
}

async function getDescendantCategoryIds(categoryId) {
  const categories = await Category.find().select('_id parent').lean();
  const childrenMap = buildChildrenMap(categories);
  const ids = [categoryId];
  const queue = [String(categoryId)];

  while (queue.length > 0) {
    const id = queue.shift();
    const children = childrenMap.get(id) || [];
    for (const child of children) {
      ids.push(child._id);
      queue.push(String(child._id));
    }
  }

  return ids;
}

async function getCategoryBreadcrumb(categoryId) {
  const categories = await Category.find().select('_id name parent slug').lean();
  const byId = new Map(categories.map((c) => [String(c._id), c]));
  const breadcrumb = [];
  let current = byId.get(String(categoryId));

  while (current) {
    breadcrumb.unshift({
      id: current._id,
      name: current.name,
      slug: current.slug
    });
    current = current.parent ? byId.get(String(current.parent)) : null;
  }

  return breadcrumb;
}

async function getStorefrontCategoryDetail(categoryId) {
  const category = await Category.findById(categoryId).lean();
  if (!category) return null;

  const categories = await Category.find().sort({ sortOrder: 1, name: 1 }).lean();
  const childrenMap = buildChildrenMap(categories);
  const directCounts = await getDirectProductCounts();
  const node = formatStorefrontNode(category, childrenMap, directCounts);

  if (!node) {
    const directCount = directCounts.get(String(categoryId)) || 0;
    if (directCount === 0) return null;
  }

  const breadcrumb = await getCategoryBreadcrumb(categoryId);

  return {
    ...(node || {
      id: category._id,
      name: category.name,
      slug: category.slug,
      description: category.description,
      icon: category.icon,
      directCount: directCounts.get(String(categoryId)) || 0,
      productCount: directCounts.get(String(categoryId)) || 0,
      subcategories: []
    }),
    breadcrumb
  };
}

function getDescendantIdsFromList(categoryId, categories) {
  const childrenMap = buildChildrenMap(categories);
  const ids = [categoryId];
  const queue = [String(categoryId)];

  while (queue.length > 0) {
    const id = queue.shift();
    const children = childrenMap.get(id) || [];
    for (const child of children) {
      ids.push(child._id);
      queue.push(String(child._id));
    }
  }

  return ids;
}

module.exports = {
  buildStorefrontCategoryTree,
  getDescendantCategoryIds,
  getStorefrontCategoryDetail,
  getCategoryBreadcrumb,
  getDescendantIdsFromList,
  buildChildrenMap,
  rollupProductCount,
  getDirectProductCounts
};
