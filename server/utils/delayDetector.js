/**
 * Computes delay status and day counts by comparing original estimated arrival date
 * against the latest estimated or actual arrival dates.
 * 
 * @param {Object} shipment - The shipment document (raw object or mongoose doc)
 * @returns {Object} { isDelayed, delayDays, delayReason }
 */
const detectDelay = (shipment) => {
  const original = shipment.originalEstimatedArrivalDate ? new Date(shipment.originalEstimatedArrivalDate) : null;
  const currentEst = shipment.estimatedArrivalDate ? new Date(shipment.estimatedArrivalDate) : null;
  const actual = shipment.actualArrivalDate ? new Date(shipment.actualArrivalDate) : null;
  
  let isDelayed = false;
  let delayDays = 0;
  let delayReason = '';

  if (!original) {
    return { isDelayed, delayDays, delayReason };
  }

  // 1. Compare estimated/actual arrival against original arrival date
  const targetDate = actual || currentEst;
  if (targetDate) {
    const diffTime = targetDate.getTime() - original.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays > 0) {
      isDelayed = true;
      delayDays = diffDays;
      delayReason = `Estimated/actual arrival date shifted by ${diffDays} day(s) from original plan.`;
    }
  }

  // 2. Overdue Check: If not delivered, and estimated arrival is in the past
  if (!isDelayed && shipment.status !== 'delivered' && currentEst) {
    const now = new Date();
    if (now > currentEst) {
      const diffTime = now.getTime() - currentEst.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays > 0) {
        isDelayed = true;
        delayDays = diffDays;
        delayReason = `Shipment overdue by ${diffDays} day(s) based on current time.`;
      }
    }
  }

  return { isDelayed, delayDays, delayReason };
};

module.exports = detectDelay;
