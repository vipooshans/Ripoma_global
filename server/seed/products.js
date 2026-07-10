const Category = require('../models/Category');
const Product = require('../models/Product');
const Warehouse = require('../models/Warehouse');
const InventoryItem = require('../models/InventoryItem');
const { seedCategories } = require('./categories');

/**
 * Sample catalog keyed by subcategory name (must match seed/categories.js).
 * Images use placeholder URLs — replace with real assets in production.
 */
const SAMPLE_PRODUCTS = [
  {
    sku: 'ELC-PHN-001',
    name: 'Galaxy Trade Phone X12',
    brand: 'Samsung',
    categoryName: 'Mobile Phones',
    description: 'Business-grade smartphone with dual SIM and long battery life for field teams.',
    sellingPrice: 429,
    unitCost: 310,
    unit: 'pcs',
    countryOfOrigin: 'South Korea',
    tags: ['phone', 'mobile', 'electronics'],
    isFeatured: true,
    stock: 48
  },
  {
    sku: 'ELC-PHN-002',
    name: 'Nordic Lite Handset',
    brand: 'Nokia',
    categoryName: 'Mobile Phones',
    description: 'Rugged entry-level handset for warehouse and logistics staff.',
    sellingPrice: 89,
    unitCost: 55,
    unit: 'pcs',
    countryOfOrigin: 'Finland',
    tags: ['phone', 'rugged'],
    isFeatured: false,
    stock: 120
  },
  {
    sku: 'ELC-PC-001',
    name: 'ProBook 15 Business Laptop',
    brand: 'HP',
    categoryName: 'Computers',
    description: '15-inch laptop with SSD storage, ideal for office and remote work.',
    sellingPrice: 799,
    unitCost: 580,
    unit: 'pcs',
    countryOfOrigin: 'China',
    tags: ['laptop', 'computer'],
    isFeatured: true,
    stock: 25
  },
  {
    sku: 'ELC-PC-002',
    name: 'ThinkCentre Mini Desktop',
    brand: 'Lenovo',
    categoryName: 'Computers',
    description: 'Compact desktop PC for point-of-sale and back-office systems.',
    sellingPrice: 549,
    unitCost: 400,
    unit: 'pcs',
    countryOfOrigin: 'China',
    tags: ['desktop', 'computer'],
    isFeatured: false,
    stock: 0
  },
  {
    sku: 'MCH-CON-001',
    name: 'Compact Excavator CX-35',
    brand: 'Caterpillar',
    categoryName: 'Construction Equipment',
    description: '35-ton class compact excavator for urban construction sites.',
    sellingPrice: 48500,
    unitCost: 42000,
    unit: 'pcs',
    countryOfOrigin: 'USA',
    tags: ['excavator', 'machinery'],
    isFeatured: true,
    stock: 3
  },
  {
    sku: 'MCH-TOL-001',
    name: 'CNC Lathe Pro 200',
    brand: 'Bosch',
    categoryName: 'Manufacturing Tools',
    description: 'Precision CNC lathe for medium-volume metal fabrication.',
    sellingPrice: 12500,
    unitCost: 9800,
    unit: 'pcs',
    countryOfOrigin: 'Germany',
    tags: ['cnc', 'manufacturing'],
    isFeatured: false,
    stock: 6
  },
  {
    sku: 'FOD-GRN-001',
    name: 'Premium Basmati Rice 25kg',
    brand: 'Golden Harvest',
    categoryName: 'Grains & Cereals',
    description: 'Export-grade long-grain basmati rice in 25kg bags.',
    sellingPrice: 42,
    unitCost: 28,
    unit: 'box',
    countryOfOrigin: 'India',
    tags: ['rice', 'food', 'export'],
    isFeatured: true,
    stock: 500
  },
  {
    sku: 'FOD-BEV-001',
    name: 'Sparkling Mineral Water Case',
    brand: 'AquaPure',
    categoryName: 'Beverages',
    description: '24-bottle case of sparkling mineral water for hospitality buyers.',
    sellingPrice: 18,
    unitCost: 11,
    unit: 'carton',
    countryOfOrigin: 'France',
    tags: ['beverage', 'water'],
    isFeatured: false,
    stock: 200
  },
  {
    sku: 'TEX-COT-001',
    name: 'Organic Cotton Fabric Roll',
    brand: 'LoomCraft',
    categoryName: 'Cotton Fabrics',
    description: '100% organic cotton fabric, 50m roll, suitable for apparel manufacturing.',
    sellingPrice: 165,
    unitCost: 110,
    unit: 'roll',
    countryOfOrigin: 'India',
    tags: ['cotton', 'textile'],
    isFeatured: false,
    stock: 80
  },
  {
    sku: 'TEX-GAR-001',
    name: 'Workwear Uniform Set',
    brand: 'SafeWear',
    categoryName: 'Garments',
    description: 'Durable industrial uniform set (shirt + trousers), bulk export packing.',
    sellingPrice: 28,
    unitCost: 16,
    unit: 'set',
    countryOfOrigin: 'Bangladesh',
    tags: ['uniform', 'garment'],
    isFeatured: true,
    stock: 350
  },
  {
    sku: 'AGR-SED-001',
    name: 'Hybrid Maize Seed Pack',
    brand: 'AgriGrow',
    categoryName: 'Seeds & Fertilizers',
    description: 'High-yield hybrid maize seeds for commercial farming, 10kg pack.',
    sellingPrice: 55,
    unitCost: 35,
    unit: 'kg',
    countryOfOrigin: 'Netherlands',
    tags: ['seeds', 'agriculture'],
    isFeatured: false,
    stock: 150
  },
  {
    sku: 'AGR-EQP-001',
    name: 'Irrigation Pump 3HP',
    brand: 'FieldForce',
    categoryName: 'Farm Equipment',
    description: 'Diesel irrigation pump for medium farms, 3 horsepower.',
    sellingPrice: 320,
    unitCost: 210,
    unit: 'pcs',
    countryOfOrigin: 'China',
    tags: ['pump', 'irrigation'],
    isFeatured: true,
    stock: 22
  },
  {
    sku: 'IND-SAF-001',
    name: 'Industrial Safety Helmet',
    brand: '3M',
    categoryName: 'Safety Gear',
    description: 'ANSI-rated hard hat for construction and warehouse use.',
    sellingPrice: 24,
    unitCost: 12,
    unit: 'pcs',
    countryOfOrigin: 'USA',
    tags: ['safety', 'ppe'],
    isFeatured: false,
    stock: 400
  },
  {
    sku: 'IND-PWR-001',
    name: 'Cordless Drill Kit 18V',
    brand: 'Bosch',
    categoryName: 'Power Tools',
    description: '18V cordless drill with two batteries and charger in carry case.',
    sellingPrice: 149,
    unitCost: 95,
    unit: 'set',
    countryOfOrigin: 'Germany',
    tags: ['drill', 'power-tool'],
    isFeatured: true,
    stock: 75
  },
  {
    sku: 'IND-PWR-002',
    name: 'Angle Grinder 125mm',
    brand: 'Makita',
    categoryName: 'Power Tools',
    description: 'Heavy-duty angle grinder for metal and stone cutting.',
    sellingPrice: 98,
    unitCost: 62,
    unit: 'pcs',
    countryOfOrigin: 'Japan',
    tags: ['grinder', 'power-tool'],
    isFeatured: false,
    stock: 0
  }
];

async function ensureDemoWarehouse() {
  let warehouse = await Warehouse.findOne({ code: 'DEMO-WH' });
  if (!warehouse) {
    warehouse = await Warehouse.create({
      name: 'Demo Main Depot',
      code: 'DEMO-WH',
      address: {
        street: '100 Trade Port Ave',
        city: 'Singapore',
        country: 'Singapore',
        postalCode: '018956'
      },
      capacity: 100000,
      status: 'active'
    });
    console.log('[SEED] Created demo warehouse: DEMO-WH');
  }
  return warehouse;
}

async function seedProducts() {
  await seedCategories();

  const existing = await Product.countDocuments({ deleted: { $ne: true } });
  if (existing > 0) {
    return;
  }

  const categories = await Category.find().lean();
  const byName = new Map(categories.map((c) => [c.name, c]));

  const warehouse = await ensureDemoWarehouse();
  let created = 0;

  for (const item of SAMPLE_PRODUCTS) {
    const category = byName.get(item.categoryName);
    if (!category) {
      console.warn(`[SEED] Skipping ${item.sku}: category "${item.categoryName}" not found`);
      continue;
    }

    const product = await Product.create({
      sku: item.sku,
      name: item.name,
      brand: item.brand,
      description: item.description,
      category: category._id,
      sellingPrice: item.sellingPrice,
      unitCost: item.unitCost,
      unit: item.unit,
      currency: 'USD',
      countryOfOrigin: item.countryOfOrigin,
      tags: item.tags,
      isFeatured: item.isFeatured,
      status: 'active',
      images: [],
      lowStockThreshold: 10,
      reorderQuantity: 50
    });

    await InventoryItem.create({
      product: product._id,
      warehouse: warehouse._id,
      quantityOnHand: item.stock,
      quantityReserved: 0,
      location: 'A-01'
    });

    created += 1;
  }

  console.log(`[SEED] Created ${created} sample products with stock in DEMO-WH.`);
}

module.exports = { seedProducts, SAMPLE_PRODUCTS };
