const holidays2018EC = [
  '2025-09-11', // Enkutatash (New Year)
  '2025-09-27', // Meskel
  '2026-01-07', // Gena (Christmas)
  '2026-01-20', // Timkat (Epiphany)
  '2026-03-02', // Adwa Victory
  '2026-04-10', // Siklet (Good Friday)
  '2026-04-12', // Fasika (Easter) - Sunday
  '2026-05-05', // Patriots' Day
  '2026-05-28', // Ginbot 20
  // Estimated Islamic Holidays for 2025/2026 (Subject to moon sighting)
  '2026-03-20', // Eid al-Fitr (Estimate)
  '2026-05-27', // Eid al-Adha (Estimate)
  '2026-08-25', // Mawlid (Estimate)
];

const isHoliday = (date) => {
  const dateStr = date.toISOString().split('T')[0];
  return holidays2018EC.includes(dateStr);
};

const isBusinessDay = (date) => {
  const day = date.getDay();
  // Sunday is 0. Saturday (6) is a working day.
  if (day === 0) return false;
  if (isHoliday(date)) return false;
  return true;
};

const getBusinessDaysInMonth = (year, month) => {
  // year and month are Gregorian for the Date object
  // Month is 0-indexed (0 = Jan)
  const date = new Date(year, month, 1);
  let businessDays = 0;
  
  while (date.getMonth() === month) {
    if (isBusinessDay(date)) {
      businessDays++;
    }
    date.setDate(date.getDate() + 1);
  }
  return businessDays;
};


module.exports = { isBusinessDay, getBusinessDaysInMonth, holidays2018EC };
