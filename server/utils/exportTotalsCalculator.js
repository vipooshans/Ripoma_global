/**
 * Computes the line totals and final order sums for export orders.
 * 
 * Formula:
 * lineTotal  = quantityOrdered * unitPrice * (1 - discount/100)
 * subtotal   = SUM(lineTotals before tax)
 * taxTotal   = SUM(quantityOrdered * unitPrice * (1 - discount/100) * tax/100)
 * grandTotal = subtotal + taxTotal + shippingCharge + otherCharges
 */
const calculateExportTotals = (items = [], shippingCharge = 0, otherCharges = 0) => {
  let subtotal = 0;
  let taxTotal = 0;
  let discountTotal = 0;

  const calculatedItems = items.map(item => {
    const qty = parseFloat(item.quantityOrdered) || 0;
    const price = parseFloat(item.unitPrice) || 0;
    const discount = parseFloat(item.discount) || 0; // percentage
    const tax = parseFloat(item.tax) || 0; // percentage

    const baseAmount = qty * price;
    const discountAmount = baseAmount * (discount / 100);
    const afterDiscount = baseAmount - discountAmount;
    const taxAmount = afterDiscount * (tax / 100);
    const lineTotal = afterDiscount; // before tax

    subtotal += afterDiscount;
    taxTotal += taxAmount;
    discountTotal += discountAmount;

    return {
      ...item,
      lineTotal: Math.round(lineTotal * 100) / 100
    };
  });

  const grandTotal = subtotal + taxTotal + (parseFloat(shippingCharge) || 0) + (parseFloat(otherCharges) || 0);

  return {
    items: calculatedItems,
    subtotal: Math.round(subtotal * 100) / 100,
    taxTotal: Math.round(taxTotal * 100) / 100,
    discountTotal: Math.round(discountTotal * 100) / 100,
    grandTotal: Math.round(grandTotal * 100) / 100
  };
};

module.exports = calculateExportTotals;
