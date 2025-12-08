// src/utils/ethiopianDate.js
//import  { EthDateTime, limits } from 'ethiopian-calendar-date-converter'
/**
 * Convert Gregorian date to Ethiopian date
 * Accurate Ethiopian calendar calculation
 */
export const toEthiopianDate = (gregorianDate) => {
  try {
    const date = new Date(gregorianDate);
    const gregYear = date.getFullYear();
    const gregMonth = date.getMonth() + 1;
    const gregDay = date.getDate();

    // // Ethiopian calendar starts on September 11 (or 12 in Gregorian leap years)
    const isGregorianLeapYear = (gregYear % 4 === 0 && gregYear % 100 !== 0) || (gregYear % 400 === 0);
    const newYearDay = isGregorianLeapYear ? 12 : 11;
    
    // Calculate Ethiopian year
    let ethYear = gregYear - 7;
    if (gregMonth < 9 || (gregMonth === 9 && gregDay < newYearDay)) {
      ethYear++;
    }

    return ethYear;
    // const etYear = new EthDateTime.fromEuropeanDate(gregorianDate);
    // console.log(etYear);
    
   // return etYear;
  } catch (error) {
    console.error('Ethiopian date conversion error:', error);
    // Fallback approximation
    return new Date().getFullYear() - 7;
  }
};

/**
 * Get current Ethiopian year
 */
export const getCurrentEthiopianYear = () => {
  return toEthiopianDate(new Date());
};

/**
 * Format Ethiopian date for display
 */
export const formatEthiopianYear = (year) => {
  return `${year} E.C.`;
};

/**
 * Get current Ethiopian year as string
 */
export const getCurrentEthiopianYearString = () => {
  return getCurrentEthiopianYear().toString();
};