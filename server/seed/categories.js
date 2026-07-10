const Category = require('../models/Category');

const SAMPLE_CATEGORIES = [
  {
    name: 'Electronics',
    icon: '🖥️',
    description: 'Consumer and industrial electronic components and devices.',
    children: ['Mobile Phones', 'Computers']
  },
  {
    name: 'Machinery',
    icon: '⚙️',
    description: 'Heavy machinery and industrial equipment.',
    children: ['Construction Equipment', 'Manufacturing Tools']
  },
  {
    name: 'Food Products',
    icon: '🧴',
    description: 'Packaged foods and agricultural produce.',
    children: ['Grains & Cereals', 'Beverages']
  },
  {
    name: 'Textiles',
    icon: '🎨',
    description: 'Fabrics, garments, and textile raw materials.',
    children: ['Cotton Fabrics', 'Garments']
  },
  {
    name: 'Agriculture',
    icon: '🌿',
    description: 'Farming supplies, seeds, and agricultural goods.',
    children: ['Seeds & Fertilizers', 'Farm Equipment']
  },
  {
    name: 'Industrial Equipment',
    icon: '🏗️',
    description: 'Tools and equipment for industrial operations.',
    children: ['Safety Gear', 'Power Tools']
  }
];

async function seedCategories() {
  const existing = await Category.countDocuments();
  if (existing > 0) {
    return;
  }

  for (const [index, item] of SAMPLE_CATEGORIES.entries()) {
    const parent = await Category.create({
      name: item.name,
      description: item.description,
      icon: item.icon,
      sortOrder: index
    });

    for (const [childIndex, childName] of item.children.entries()) {
      await Category.create({
        name: childName,
        parent: parent._id,
        sortOrder: childIndex
      });
    }
  }

  console.log('[SEED] Created sample product categories with subcategories.');
}

module.exports = { seedCategories };
