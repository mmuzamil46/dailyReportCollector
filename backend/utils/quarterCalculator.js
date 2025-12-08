// utils/quarterCalculator.js

/**
 * Cumulative quarter calculation from yearly plan
 * Q1 = yearlyPlan/4 (rounded)
 * Q2 = Q1 + (yearlyPlan/4) 
 * Q3 = Q2 + (yearlyPlan/4)
 * Q4 = yearlyPlan (total)
 */
const calculateCumulativeQuarterlyPlans = (yearlyPlan) => {
  if (!yearlyPlan || yearlyPlan === 0) {
    return { q1: 0, q2: 0, q3: 0, q4: 0 };
  }

  const quarterlyBase = Math.round(yearlyPlan / 4);
  
  return {
    q1: quarterlyBase,
    q2: quarterlyBase * 2,
    q3: quarterlyBase * 3,
    q4: yearlyPlan
  };
};

/**
 * Get cumulative date ranges for Ethiopian quarters
 */
const getCumulativeQuarterDateRange = (budgetYear, quarter) => {
  const gregorianYear = parseInt(budgetYear) + 8;
  
  const startOfYear = new Date(gregorianYear - 1, 6, 1); // July 1 (Hamle)
  
  let endDate;
  switch (quarter) {
    case 1: // End of Meskerem (September)
      endDate = new Date(gregorianYear - 1, 8, 30);
      break;
    case 2: // End of Tahisas (December)
      endDate = new Date(gregorianYear - 1, 11, 31);
      break;
    case 3: // End of Megabit (March)
      endDate = new Date(gregorianYear, 2, 31);
      break;
    case 4: // End of Sene (June)
      endDate = new Date(gregorianYear, 5, 30);
      break;
    default: // Full year
      endDate = new Date(gregorianYear, 5, 30);
  }
  
  return {
    startDate: startOfYear,
    endDate: endDate
  };
};

module.exports = {
  calculateCumulativeQuarterlyPlans,
  getCumulativeQuarterDateRange
};