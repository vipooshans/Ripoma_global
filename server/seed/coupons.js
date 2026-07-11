const Coupon = require('../models/Coupon');

const SAMPLE_COUPONS = [
  {
    code: 'SAVE10',
    type: 'percent',
    value: 10,
    minSubtotal: 50,
    active: true
  },
  {
    code: 'FLAT25',
    type: 'fixed',
    value: 25,
    minSubtotal: 100,
    active: true
  },
  {
    code: 'FREESHIP',
    type: 'free_shipping',
    value: 0,
    minSubtotal: 0,
    active: true
  }
];

async function seedCoupons() {
  for (const def of SAMPLE_COUPONS) {
    const existing = await Coupon.findOne({ code: def.code });
    if (!existing) {
      await Coupon.create(def);
      console.log(`[SEED] Created coupon: ${def.code}`);
    }
  }
}

module.exports = { seedCoupons, SAMPLE_COUPONS };
