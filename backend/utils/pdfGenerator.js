const PDFDocument = require('pdfkit');
const path = require('path');

const serviceCategories = {
  'ልደት': ['በወቅቱ', 'በዘገየ', 'በነባር'],
  'ጋብቻ': ['በወቅቱ', 'በዘገየ', 'በነባር'],
  'ሞት': ['በወቅቱ', 'በዘገየ', 'በነባር'],
  'ፍቺ': ['በወቅቱ', 'በዘገየ', 'በነባር'],
  'ጉዲፈቻ': ['በወቅቱ', 'በዘገየ', 'በነባር'],
  'እርማት፣እድሳት እና ግልባጭ': [],
  'የነዋሪነት ምዝገባ': [],
  'መታወቂያ': ['አዲስ', 'እድሳት', 'ምትክ'],
  'ያላገባ': ['አዲስ', 'እድሳት', 'እርማት', 'ምትክ'],
  'መሸኛ': [],
  'የዝምድና አገልግሎት': [],
  'የነዋሪነት ማረጋገጫ': [],
  'በህይወት ስለመኖር': [],
};

const prepareReportSummary = (reports, services) => {
  const reportSummary = {};
  services.forEach(service => {
    const serviceName = service.name;
    reportSummary[serviceName] = { categories: {}, total: 0 };
    const cats = serviceCategories[serviceName] || [];

    cats.forEach(cat => {
      reportSummary[serviceName].categories[cat] = 0;
    });

    const serviceReports = reports.filter(r => r.serviceId && r.serviceId.name === serviceName);
    
    serviceReports.forEach(report => {
      const cat = report.serviceCategory || 'N/A';
      if (cats.length > 0) {
        if (reportSummary[serviceName].categories[cat] !== undefined) {
          reportSummary[serviceName].categories[cat]++;
        }
      } else {
        // For services with no categories
        reportSummary[serviceName].total++;
      }
    });
    
    // For services with categories, calculate total from categories
    if (cats.length > 0) {
      reportSummary[serviceName].total = Object.values(reportSummary[serviceName].categories).reduce((sum, count) => sum + count, 0);
    }
  });
  return reportSummary;
};

const toEthiopianDate = (gregorianDate) => {
  try {
    const date = new Date(gregorianDate);
    const gregYear = date.getFullYear();
    const gregMonth = date.getMonth() + 1;
    const gregDay = date.getDate();

    // Simple calculation based on the 8-year difference
    let ethYear = gregYear - 8;
    
    // Ethiopian New Year is September 11 (or 12 in Gregorian leap years)
    const newYearDay = (gregYear % 4 === 0) ? 12 : 11;
    
    // If date is before Ethiopian New Year, subtract one year
    if (gregMonth > 9 || (gregMonth === 9 && gregDay < newYearDay)) {
      ethYear++;
    }
    
    // Calculate month and day
    let ethMonth, ethDay;
    
    // Days from September new year
    const sept11 = new Date(gregYear, 8, newYearDay); // September newYearDay
    const diffTime = date - sept11;
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays >= 0) {
      // After Ethiopian New Year
      ethMonth = Math.floor(diffDays / 30) + 1;
      ethDay = (diffDays % 30) + 1;
    } else {
      // Before Ethiopian New Year (previous Ethiopian year)
      const prevEthYear = ethYear;
      const prevSept11 = new Date(gregYear - 1, 8, (gregYear - 1) % 4 === 0 ? 12 : 11);
      const prevDiffDays = Math.floor((date - prevSept11) / (1000 * 60 * 60 * 24));
      ethMonth = Math.floor(prevDiffDays / 30) + 1;
      ethDay = (prevDiffDays % 30) + 1;
    }
    
    // Handle Pagume (13th month)
    if (ethMonth === 13) {
      const daysInPagume = (ethYear % 4 === 3) ? 6 : 5;
      if (ethDay > daysInPagume) {
        ethMonth = 1;
        ethDay = 1;
        ethYear++;
      }
    }

    return {
      year: ethYear,
      month: ethMonth,
      day: ethDay
    };
  } catch (error) {
    console.error('Ethiopian date conversion error:', error);
    return null;
  }
};

const getEthiopianDateString = (displayDate) => {
    let ethiopianDateStr = displayDate + ""; // Default fallback
    const ethiopianDate = toEthiopianDate(displayDate);
    
    if (ethiopianDate) {
      const ethiopianMonths = [
        'መስከረም', 'ጥቅምት', 'ኅዳር', 'ታህሳስ', 'ጥር', 'የካቲት', 
        'መጋቢት', 'ሚያዝያ', 'ግንቦት', 'ሰኔ', 'ሐምሌ', 'ነሐሴ', 'ጳጉሜ'
      ];
      const monthName = ethiopianMonths[ethiopianDate.month - 1] || 'ጥቅምት';
      ethiopianDateStr = `${monthName}/${ethiopianDate.day}/${ethiopianDate.year}`;
    } else {
      // Fallback to Gregorian date in Amharic numbers if conversion fails
      const gregorianDate = displayDate;
      const day = gregorianDate.getDate();
      const month = gregorianDate.getMonth() + 1;
      const year = gregorianDate.getFullYear();
      
      // Convert numbers to Amharic
      const amharicNumbers = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
      const toAmharicNumber = (num) => {
        return num.toString().split('').map(digit => amharicNumbers[parseInt(digit)]).join('');
      };
      
      ethiopianDateStr = `${toAmharicNumber(month)}/${toAmharicNumber(day)}/${toAmharicNumber(year)}`;
    }
    return ethiopianDateStr;
};

const generateReportPDF = (res, reportSummary, totalReports, displayDate, title) => {
    const doc = new PDFDocument({ 
      size: 'A4', 
      margin: 50
    });
    
    // Font handling
    let amharicFont;
    try {
      const fontPath = path.join(__dirname, '../fonts/NotoSansEthiopic-VariableFont_wdth,wght.ttf');
      amharicFont = fontPath;
      doc.registerFont('Amharic', fontPath);
    } catch (fontError) {
      console.warn('Could not register Amharic font:', fontError.message);
      amharicFont = 'Helvetica';
    }

    doc.pipe(res);

    // Use Amharic font if available, otherwise fallback
    const contentFont = amharicFont !== 'Helvetica' ? 'Amharic' : 'Helvetica';

    const ethiopianDateStr = getEthiopianDateString(displayDate);

    // Header - Main Title
    doc.font(contentFont).fontSize(18).text(title, { 
      align: 'center',
      underline: true
    });
    
    doc.moveDown(0.5);

    // Date header
    doc.font(contentFont).fontSize(14).text(ethiopianDateStr, { align: 'center' });
    doc.moveDown(1.5);

    // Check if we have any data
    if (Object.keys(reportSummary).length === 0) {
      doc.font(contentFont).fontSize(14).text('ለተመረጠው ቀን ምንም ሪፖርት አልተገኘም።', { align: 'center' });
      doc.end();
      return;
    }

    // Create table with template format
    const tableTop = doc.y;
    const colWidths = [200, 150, 100];
    const rowHeight = 25;

    // Table headers with background
    doc.rect(50, tableTop, colWidths[0] + colWidths[1] + colWidths[2], rowHeight)
       .fill('#f0f0f0');
    
    doc.font(contentFont).fontSize(12).fillColor('#000000');
    doc.text('የአገልግሎት ስም', 55, tableTop + 8, { width: colWidths[0] - 10 });
    doc.text('ምድብ', 55 + colWidths[0], tableTop + 8, { width: colWidths[1] - 10 });
    doc.text('ብዛት', 55 + colWidths[0] + colWidths[1], tableTop + 8, { width: colWidths[2] - 10 });

    // Draw header border
    doc.rect(50, tableTop, colWidths[0] + colWidths[1] + colWidths[2], rowHeight)
       .stroke();
    
    let currentY = tableTop + rowHeight;

    // Table rows
    Object.keys(reportSummary).forEach(serviceName => {
      const summary = reportSummary[serviceName];
      const cats = serviceCategories[serviceName] || [];
      
      if (cats.length === 0) {
        // Services with no categories (like መሸኛ)
        if (summary.total > 0) {
          // Row background
          const isEvenRow = Math.floor((currentY - tableTop) / rowHeight) % 2 === 0;
          if (isEvenRow) {
            doc.rect(50, currentY, colWidths[0] + colWidths[1] + colWidths[2], rowHeight)
               .fill('#fafafa');
          }

          doc.font(contentFont).fontSize(10).fillColor('#000000');
          doc.text(serviceName, 55, currentY + 8, { width: colWidths[0] - 10 });
          doc.text('ጠቅላላ', 55 + colWidths[0], currentY + 8, { width: colWidths[1] - 10 });
          
          doc.font('Helvetica').text(summary.total.toString(), 55 + colWidths[0] + colWidths[1], currentY + 8, { 
            width: colWidths[2] - 10,
            align: 'center'
          });
          
          doc.rect(50, currentY, colWidths[0] + colWidths[1] + colWidths[2], rowHeight)
             .stroke();
          
          currentY += rowHeight;
        }
      } else {
        // Services with categories (like ልደት)
        let hasData = false;
        
        cats.forEach(cat => {
          const count = summary.categories[cat] || 0;
          if (count > 0) {
            // Row background
            const isEvenRow = Math.floor((currentY - tableTop) / rowHeight) % 2 === 0;
            if (isEvenRow) {
              doc.rect(50, currentY, colWidths[0] + colWidths[1] + colWidths[2], rowHeight)
                 .fill('#fafafa');
            }
            
            doc.font(contentFont).fontSize(10).fillColor('#000000');
            doc.text(serviceName, 55, currentY + 8, { width: colWidths[0] - 10 });
            doc.text(cat, 55 + colWidths[0], currentY + 8, { width: colWidths[1] - 10 });
            
            doc.font('Helvetica').text(count.toString(), 55 + colWidths[0] + colWidths[1], currentY + 8, { 
              width: colWidths[2] - 10,
              align: 'center'
            });
            
            doc.rect(50, currentY, colWidths[0] + colWidths[1] + colWidths[2], rowHeight)
               .stroke();
            
            currentY += rowHeight;
            hasData = true;
          }
        });
        
        // Add total row for categorized services
        if (hasData && summary.total > 0) {
          // Highlight total row
          doc.rect(50, currentY, colWidths[0] + colWidths[1] + colWidths[2], rowHeight)
             .fill('#e8f4fd');
          
          doc.font(contentFont).fontSize(10).fillColor('#000000');
          doc.text(serviceName, 55, currentY + 8, { width: colWidths[0] - 10 });
          doc.text('ጠቅላላ', 55 + colWidths[0], currentY + 8, { width: colWidths[1] - 10 });
          
          doc.font('Helvetica-Bold').text(summary.total.toString(), 55 + colWidths[0] + colWidths[1], currentY + 8, { 
            width: colWidths[2] - 10,
            align: 'center'
          });
          
          doc.rect(50, currentY, colWidths[0] + colWidths[1] + colWidths[2], rowHeight)
             .stroke();
          
          currentY += rowHeight;
        }
      }
      
      // Page break check
      if (currentY > 700) {
        doc.addPage();
        currentY = 50;
        // Redraw header
        doc.rect(50, currentY, colWidths[0] + colWidths[1] + colWidths[2], rowHeight)
           .fill('#f0f0f0');
        doc.font(contentFont).fontSize(12).fillColor('#000000');
        doc.text('የአገልግሎት ስም', 55, currentY + 8, { width: colWidths[0] - 10 });
        doc.text('ምድብ', 55 + colWidths[0], currentY + 8, { width: colWidths[1] - 10 });
        doc.text('ብዛት', 55 + colWidths[0] + colWidths[1], currentY + 8, { width: colWidths[2] - 10 });
        doc.rect(50, currentY, colWidths[0] + colWidths[1] + colWidths[2], rowHeight)
           .stroke();
        currentY += rowHeight;
      }
    });

    // Final summary
    doc.moveDown(1.5);
    
    const summaryY = doc.y;
    doc.rect(50, summaryY, colWidths[0] + colWidths[1] + colWidths[2], 30)
       .fill('#e8f4fd')
       .stroke();
    
    doc.font(contentFont).fontSize(12).fillColor('#000000');
    doc.text('ጠቅላላ የአገልግሎት ብዛት፡', 55, summaryY + 10, { width: colWidths[0] + colWidths[1] - 10 });
    doc.font('Helvetica-Bold').text(totalReports.toString(), 55 + colWidths[0] + colWidths[1], summaryY + 10, { 
      width: colWidths[2] - 10,
      align: 'center'
    });

    doc.end();
};

module.exports = { prepareReportSummary, generateReportPDF };
