/**
 * GIGSTR Accounting Service
 * Handles Waterfall logic, currency detection, and balance math.
 */

// 1. SMART CURRENCY DETECTION
// If value > 500, we assume RSD (per your rules)
export const detectCurrency = (amount) => {
  return parseFloat(amount) > 500 ? 'RSD' : 'EUR';
};

// 2. CONVERSION LOGIC
export const convertToEur = (amount, rate) => {
  const currency = detectCurrency(amount);
  if (currency === 'RSD') {
    return parseFloat(amount) / parseFloat(rate);
  }
  return parseFloat(amount);
};

// 3. THE WATERFALL CALCULATION (For UI Preview)
// This simulates how the bulk pay will be distributed before we save to DB
export const simulateWaterfall = (unpaidGigs, paymentAmountEur) => {
  let remaining = paymentAmountEur;
  const updates = [];

  for (let gig of unpaidGigs) {
    if (remaining <= 0) break;

    const owed = gig.datePrice - (gig.datePaidAmount || 0);
    const paymentToThisGig = Math.min(remaining, owed);
    
    updates.push({
      dateID: gig.dateID,
      venue: gig.dateVenue,
      applied: paymentToThisGig,
      isFullyPaid: paymentToThisGig >= owed
    });

    remaining -= paymentToThisGig;
  }

  return { updates, leftover: remaining };
};

// 4. DASHBOARD CALCULATIONS
export const getFinancialSummary = (data, carryOverFromPreviousYear = 0) => {
  const now = new Date();
  const currentYear = now.getFullYear();

  return data.reduce((acc, item) => {
    const itemYear = new Date(item.dateDate).getFullYear();
    const price = parseFloat(item.datePrice) || 0;
    const paid = parseFloat(item.datePaidAmount) || 0;

    if (itemYear === currentYear) {
      acc.totalOwedYTD += price;
      acc.totalPaidYTD += paid;
    } else if (itemYear < currentYear) {
      // Logic for leftovers from previous years
      acc.carryOverDebt += (price - paid);
    }

    return acc;
  }, { totalOwedYTD: 0, totalPaidYTD: 0, carryOverDebt: carryOverFromPreviousYear });
};
