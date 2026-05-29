const calculateTotals = (items = [], shippingCost = 0, otherCharges = 0) => {
  let subtotal = 0;
  let taxTotal = 0;
  let discountTotal = 0;

  const calculatedItems = items.map(item => {
    const qty = parseFloat(item.quantityOrdered) || 0;
    const cost = parseFloat(item.unitCost) || 0;
    const discount = parseFloat(item.discount) || 0; // percentage
    const tax = parseFloat(item.tax) || 0; // percentage

    const baseAmount = qty * cost;
    const discountAmount = baseAmount * (discount / 100);
    const afterDiscount = baseAmount - discountAmount;
    const taxAmount = afterDiscount * (tax / 100);
    const lineTotal = afterDiscount + taxAmount;

    subtotal += afterDiscount;
    taxTotal += taxAmount;
    discountTotal += discountAmount;

    return {
      ...item,
      lineTotal: Math.round(lineTotal * 100) / 100
    };
  });

  const grandTotal = subtotal + taxTotal + (parseFloat(shippingCost) || 0) + (parseFloat(otherCharges) || 0);

  return {
    items: calculatedItems,
    subtotal: Math.round(subtotal * 100) / 100,
    taxTotal: Math.round(taxTotal * 100) / 100,
    discountTotal: Math.round(discountTotal * 100) / 100,
    grandTotal: Math.round(grandTotal * 100) / 100
  };
};

module.exports = calculateTotals;
