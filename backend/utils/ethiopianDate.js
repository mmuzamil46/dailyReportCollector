// utils/ethiopianDate.js

/**
 * Convert Gregorian date to Ethiopian date
 * Ethiopian calendar starts on September 11/12 (Gregorian)
 */
const toEthiopianDate = (gregorianDate) => {
  try {
    const date = new Date(gregorianDate);
    const gregYear = date.getFullYear();
    const gregMonth = date.getMonth() + 1;
    const gregDay = date.getDate();

    // Ethiopian calendar starts on September 11 (or 12 in Gregorian leap years)
  const isGregorianLeapYear = (gregYear % 4 === 0 && gregYear % 100 !== 0) || (gregYear % 400 === 0);
    const newYearDay = isGregorianLeapYear ? 12 : 11;
    
    // Calculate Ethiopian year
    let ethYear = gregYear - 7;
    if (gregMonth < 9 || (gregMonth === 9 && gregDay < newYearDay)) {
      ethYear++;
    }

    return ethYear;
  } catch (error) {
    console.error('Ethiopian date conversion error:', error);
    // Fallback: current Gregorian year - 7 (approximation)
    return new Date().getFullYear() - 7;
  }
};

/**
 * Get current Ethiopian year
 */
const getCurrentEthiopianYear = () => {
  return toEthiopianDate(new Date());
};

/**
 * Get Ethiopian year from Gregorian date string
 */
const getEthiopianYearFromDate = (dateString) => {
  if (!dateString) return getCurrentEthiopianYear();
  return toEthiopianDate(new Date(dateString));
};

module.exports = {
  toEthiopianDate,
  getCurrentEthiopianYear,
  getEthiopianYearFromDate
};