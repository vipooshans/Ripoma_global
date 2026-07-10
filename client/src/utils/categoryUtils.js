/**
 * Client-side helpers for hierarchical category display in admin forms and filters.
 */

export function buildCategoryTree(categories = []) {
  const byParent = new Map();
  categories.forEach((cat) => {
    const parentKey = cat.parent?._id || cat.parent || 'root';
    const key = String(parentKey);
    if (!byParent.has(key)) byParent.set(key, []);
    byParent.get(key).push(cat);
  });

  byParent.forEach((list) => {
    list.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.name.localeCompare(b.name));
  });

  return byParent;
}

export function getDescendantIds(categoryId, categories = []) {
  const byParent = buildCategoryTree(categories);
  const ids = [categoryId];
  const queue = [String(categoryId)];

  while (queue.length > 0) {
    const id = queue.shift();
    const children = byParent.get(id) || [];
    for (const child of children) {
      ids.push(child._id);
      queue.push(String(child._id));
    }
  }

  return ids;
}

export function getExcludedParentIds(categoryId, categories = []) {
  if (!categoryId) return [];
  return getDescendantIds(categoryId, categories).map(String);
}

export function flattenCategoryOptions(categories = [], prefix = '') {
  const byParent = buildCategoryTree(categories);
  const roots = byParent.get('root') || [];
  const options = [];

  const walk = (nodes, parentLabel = '') => {
    nodes.forEach((cat) => {
      const label = parentLabel ? `${parentLabel} → ${cat.name}` : cat.name;
      options.push({ id: cat._id, label, name: cat.name, depth: parentLabel ? parentLabel.split('→').length : 0 });
      const children = byParent.get(String(cat._id)) || [];
      if (children.length > 0) walk(children, label);
    });
  };

  walk(roots);
  return options;
}

export function flattenStorefrontCategories(tree = [], depth = 0) {
  const flat = [];
  tree.forEach((cat) => {
    flat.push({ ...cat, depth });
    if (cat.subcategories?.length) {
      flat.push(...flattenStorefrontCategories(cat.subcategories, depth + 1));
    }
  });
  return flat;
}

export function findStorefrontCategory(tree = [], id) {
  for (const cat of tree) {
    if (String(cat.id) === String(id)) return cat;
    if (cat.subcategories?.length) {
      const found = findStorefrontCategory(cat.subcategories, id);
      if (found) return found;
    }
  }
  return null;
}
