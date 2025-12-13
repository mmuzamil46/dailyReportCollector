const Report = require('../models/Report');
const Service = require('../models/Service');
const User = require('../models/User')
const path = require('path');
const PDFDocument = require('pdfkit');
const pdfTable = require('pdfkit-table');
const { toEthiopian } = require('ethiopian-date');
const { prepareReportSummary, generateReportPDF } = require('../utils/pdfGenerator');

// @desc    Get all reports (public, for display page)
// @route   GET /api/reports/public/reports
// @access  Public
const getPublicReports = async (req, res) => {
  try {
    let query = {};
    if (req.query.date === 'today') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      query.date = { $gte: today, $lt: tomorrow };
    }
    if (req.query.year) {
      const year = parseInt(req.query.year);
      query.date = {
        $gte: new Date(year, 0, 1),
        $lt: new Date(year + 1, 0, 1),
      };
    }
    const reports = await Report.find(query)
      .populate('serviceId', 'name yearlyplan')
      .populate('reportedBy', 'woreda')
      .sort({ date: -1 });
    res.status(200).json(reports);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error while fetching public reports' });
  }
};

// @desc    Get reports by date and service (public, for display page)
// @route   GET /api/reports/public/reports/by-date-service
// @access  Public
const getPublicReportsByDateAndService = async (req, res) => {
  const { date, serviceId } = req.query;

  if (!date || !serviceId) {
    return res.status(400).json({ message: 'Date and serviceId are required' });
  }

  try {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const reports = await Report.find({
      serviceId,
      date: { $gte: startOfDay, $lte: endOfDay },
    })
      .populate('serviceId', 'name yearlyplan')
      .populate('reportedBy', 'woreda')
      .sort({ date: -1 });
    res.status(200).json(reports);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error while fetching public reports by date and service' });
  }
};

// @desc    Get all reports (protected)
// @route   GET /api/reports
// @access  Private
// @desc    Get all reports (protected)
// @route   GET /api/reports
// @access  Private
const getAllReports = async (req, res) => {
  try {
    let query = {};
    if (req.query.date === 'today') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      query.date = { $gte: today, $lt: tomorrow };
    }
    if (req.query.year) {
      const year = parseInt(req.query.year);
      query.date = {
        $gte: new Date(year, 0, 1),
        $lt: new Date(year + 1, 0, 1),
      };
    }
    if (req.query.serviceId) query.serviceId = req.query.serviceId;
    if (req.query.woreda && (req.user.role === 'Admin' || req.user.role === 'Staff')) query.woreda = req.query.woreda;

    // Allow both Admin and Staff to see all reports, restrict regular Users to their woreda
    if (req.user.role === 'User') {
      if (!req.user.woreda) {
        return res.status(403).json({ message: 'User has no woreda assigned' });
      }
      query.woreda = req.user.woreda;
    }

    const reports = await Report.find(query)
      .populate('serviceId', 'name description yearlyplan')
      .populate('reportedBy', 'username fullName role woreda')
      .sort({ date: -1 });
    res.status(200).json(reports);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error while fetching reports' });
  }
};

// @desc    Get report by ID
// @route   GET /api/reports/:id
// @access  Private
// @desc    Get report by ID
// @route   GET /api/reports/:id
// @access  Private
const getReportById = async (req, res) => {
  try {
    const query = { _id: req.params.id };
    // Allow both Admin and Staff to see all reports, restrict regular Users to their woreda
    if (req.user.role === 'User') {
      if (!req.user.woreda) {
        return res.status(403).json({ message: 'User has no woreda assigned' });
      }
      query.woreda = req.user.woreda;
    }

    const report = await Report.findOne(query)
      .populate('serviceId', 'name description yearlyplan')
      .populate('reportedBy', 'username fullName role woreda');
    if (!report) {
      return res.status(404).json({ message: 'Report not found or access denied' });
    }
    res.status(200).json(report);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error while fetching report' });
  }
};

// @desc    Create a new report
// @route   POST /api/reports
// @access  Private
const createReport = async (req, res) => {
  const { serviceId, woreda, serviceCategory, cardSerial, referenceNo, registrationNumber, letterNumber } = req.body;

  if (!serviceId) {
    return res.status(400).json({ message: 'Service ID is required' });
  }

  if (!req.user.woreda) {
    return res.status(403).json({ message: 'User has no woreda assigned' });
  }

  try {
    const service = await Service.findById(serviceId).select('name');
    if (!service) {
      return res.status(404).json({ message: 'Service not found' });
    }

    const serviceName = service.name;
    const kunetServices = ['ልደት', 'ጋብቻ', 'ሞት', 'ፍቺ', 'ጉዲፈቻ','እርማት፣እድሳት እና ግልባጭ'];
    const newariServices = ['የነዋሪነት ምዝገባ', 'መታወቂያ', 'ያላገባ', 'መሸኛ', 'የዝምድና አገልግሎት', 'የነዋሪነት ማረጋገጫ', 'በህይወት ስለመኖር'];

    // Validate service category
    const kunetWithCategories = ['ልደት', 'ጋብቻ', 'ሞት', 'ፍቺ', 'ጉዲፈቻ'];
    const newariWithCategories = ['መታወቂያ', 'ያላገባ'];
    if (kunetWithCategories.includes(serviceName) && !['በወቅቱ', 'በዘገየ', 'በነባር'].includes(serviceCategory)) {
      return res.status(400).json({ message: 'Invalid category for የኩነት service' });
    }
    if (serviceName === 'መታወቂያ' && !['አዲስ', 'እድሳት', 'ምትክ'].includes(serviceCategory)) {
      return res.status(400).json({ message: 'Invalid category for መታወቂያ' });
    }
    if (serviceName === 'ያላገባ' && !['አዲስ', 'እድሳት', 'እርማት', 'ምትክ'].includes(serviceCategory)) {
      return res.status(400).json({ message: 'Invalid category for ያላገባ' });
    }
    /*if (['እርማት፣እድሳት እና ግልባጭ', 'የነዋሪነት ምዝገባ', 'መሸኛ', 'የዝምድና አገልግሎት', 'የነዋሪነት ማረጋገጫ', 'በህይወት ስለመኖር'].includes(serviceName) && serviceCategory) {
      return res.status(400).json({ message: 'No category allowed for this service' });
    }*/

    // Validate input fields
    if (['የነዋሪነት ምዝገባ', 'መታወቂያ'].includes(serviceName)) {
      if (!registrationNumber || cardSerial || referenceNo || letterNumber) {
        return res.status(400).json({ message: 'Only registration number is allowed for this service' });
      }
    } else if (['መሸኛ', 'የዝምድና አገልግሎት', 'የነዋሪነት ማረጋገጫ', 'በህይወት ስለመኖር'].includes(serviceName)) {
      if (!letterNumber || cardSerial || referenceNo || registrationNumber) {
        return res.status(400).json({ message: 'Only letter number is allowed for this service' });
      }
    } else {
      if (!cardSerial || !referenceNo || registrationNumber || letterNumber) {
        return res.status(400).json({ message: 'Card serial and reference number are required for this service' });
      }
    }

  if (cardSerial && referenceNo && serviceId) {
  const existing = await Report.findOne({ 
    cardSerial, 
    referenceNo, 
    serviceId 
  });
  
  if (existing) {
    return res.status(400).json({ message: 'ይህ ሪፖርት ከዚህ በፊት ተመዝግቧል!' });
  }
}
  
    if (letterNumber) {
      const existing = await Report.findOne({ letterNumber });
      if (existing) return res.status(400).json({ message: 'Letter number already exists' });
    }

    const report = new Report({
      serviceId,
      woreda: req.user.woreda,
      serviceCategory,
      date: req.body.date || Date.now(),
      reportedBy: req.user.id,
      cardSerial,
      referenceNo,
      registrationNumber,
      letterNumber,
    });

    const createdReport = await report.save();

      const io = req.app.get('io');
    io.emit('newReport', {
      _id: createdReport._id,
      serviceId: { _id: createdReport.serviceId, name: serviceName },
      woreda: createdReport.woreda,
      serviceCategory: createdReport.serviceCategory,
      date: createdReport.date,
    });
    res.status(201).json(createdReport);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error while creating report' });
  }
};

// @desc    Update a report
// @route   PUT /api/reports/:id
// @access  Private (reporter or admin)
const updateReport = async (req, res) => {
  const { serviceId, woreda, serviceCategory, date, cardSerial, referenceNo, registrationNumber, letterNumber } = req.body;

  try {
    const report = await Report.findById(req.params.id);
    if (!report) {
      return res.status(404).json({ message: 'Report not found' });
    }

    if (req.user.id.toString() !== report.reportedBy.toString() && req.user.role !== 'Admin') {
      return res.status(403).json({ message: 'Not authorized to update this report' });
    }

    if (woreda && req.user.role !== 'Admin') {
      return res.status(403).json({ message: 'Not authorized to update woreda' });
    }

    const service = await Service.findById(serviceId || report.serviceId).select('name');
    if (!service) {
      return res.status(404).json({ message: 'Service not found' });
    }

    const serviceName = service.name;
    const kunetServices = ['ልደት', 'ጋብቻ', 'ሞት', 'ፍቺ', 'ጉዲፈቻ', 'እርማት፣እድሳት እና ግልባጭ'];
    const newariServices = ['የነዋሪነት ምዝገባ', 'መታወቂያ', 'ያላገባ', 'መሸኛ', 'የዝምድና አገልግሎት', 'የነዋሪነት ማረጋገጫ', 'በህይወት ስለመኖር'];

    // Validate service category
    const kunetWithCategories = ['ልደት', 'ጋብቻ', 'ሞት', 'ፍቺ', 'ጉዲፈቻ'];
    const newariWithCategories = ['መታወቂያ', 'ያላገባ'];
    if (kunetWithCategories.includes(serviceName) && !['በወቅቱ', 'በዘገየ', 'በነባር'].includes(serviceCategory)) {
      return res.status(400).json({ message: 'Invalid category for የኩነት service' });
    }
    if (serviceName === 'መታወቂያ' && !['አዲስ', 'እድሳት', 'ምትክ'].includes(serviceCategory)) {
      return res.status(400).json({ message: 'Invalid category for መታወቂዤ' });
    }
    if (serviceName === 'ያላገባ' && !['አዲስ', 'እድሳት', 'እርማት', 'ምትክ'].includes(serviceCategory)) {
      return res.status(400).json({ message: 'Invalid category for ያላገባ' });
    }
    if (['እርማት፣እድሳት እና ግልባጭ', 'የነዋሪነት ምዝገባ', 'መሸኛ', 'የዝምድና አገልግሎት', 'የነዋሪነት ማረጋገጫ', 'በህይወት ስለመኖር'].includes(serviceName) && serviceCategory) {
      return res.status(400).json({ message: 'No category allowed for this service' });
    }

    // Validate input fields
    if (['የነዋሪነት ምዝገባ', 'መታወቂያ'].includes(serviceName)) {
      if (!registrationNumber || cardSerial || referenceNo || letterNumber) {
        return res.status(400).json({ message: 'Only registration number is allowed for this service' });
      }
    } else if (['መሸኛ', 'የዝምድና አገልግሎት', 'የነዋሪነት ማረጋገጫ', 'በህይወት ስለመኖር'].includes(serviceName)) {
      if (!letterNumber || cardSerial || referenceNo || registrationNumber) {
        return res.status(400).json({ message: 'Only letter number is allowed for this service' });
      }
    } else {
      if (!cardSerial || !referenceNo || registrationNumber || letterNumber) {
        return res.status(400).json({ message: 'Card serial and reference number are required for this service' });
      }
    }

    report.serviceId = serviceId || report.serviceId;
    report.woreda = (req.user.role === 'Admin' && woreda) ? woreda : report.woreda;
    report.serviceCategory = serviceCategory || report.serviceCategory;
    report.date = date || report.date;
    report.cardSerial = cardSerial || report.cardSerial;
    report.referenceNo = referenceNo || report.referenceNo;
    report.registrationNumber = registrationNumber || report.registrationNumber;
    report.letterNumber = letterNumber || report.letterNumber;

    const updatedReport = await report.save();
    res.status(200).json(updatedReport);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error while updating report' });
  }
};

// @desc    Delete a report
// @route   DELETE /api/reports/:id
// @access  Private/Admin
const deleteReport = async (req, res) => {
  try {
    const report = await Report.findById(req.params.id);
    if (!report) {
      return res.status(404).json({ message: 'Report not found' });
    }

    if (req.user.role !== 'Admin') {
      return res.status(403).json({ message: 'Not authorized to delete reports' });
    }

    await report.deleteOne();
    res.status(200).json({ message: 'Report deleted' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error while deleting report' });
  }
};

// @desc    Get reports by date and serviceId (protected)
// @route   GET /api/reports/by-date-service
// @access  Private
// @desc    Get reports by date and serviceId (protected)
// @route   GET /api/reports/by-date-service
// @access  Private
const getReportsByDateAndService = async (req, res) => {
  const { date, serviceId } = req.query;

  if (!date || !serviceId) {
    return res.status(400).json({ message: 'Date and serviceId are required' });
  }

  try {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const query = {
      serviceId,
      date: { $gte: startOfDay, $lte: endOfDay },
    };

    // Allow both Admin and Staff to see all reports, restrict regular Users to their woreda
    if (req.user.role === 'User') {
      if (!req.user.woreda) {
        return res.status(403).json({ message: 'User has no woreda assigned' });
      }
      query.woreda = req.user.woreda;
    }

    const reports = await Report.find(query)
      .populate('serviceId', 'name description yearlyplan')
      .populate('reportedBy', 'username fullName role woreda')
      .sort({ date: -1 });
    res.status(200).json(reports);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error while fetching reports by date and service' });
  }
};
const getWoredas = async (req, res) => {
  try {
    let woredas;
    // Allow both Admin and Staff to see all woredas
    if (req.user.role === 'Admin' || req.user.role === 'Staff') {
      woredas = await User.find({ role: 'Staff', woreda: { $ne: null } }).distinct('woreda');
    } else {
      if (!req.user.woreda) {
        return res.status(403).json({ message: 'No woreda assigned' });
      }
      woredas = [req.user.woreda];
    }
    res.status(200).json(woredas.sort());
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error while fetching woredas' });
  }
};
// @desc    Generate PDF report for a specific date
// @route   GET /api/reports/generate-pdf?date=YYYY-MM-DD
// @access  Private/Admin
// const generatePDFReport = async (req, res) => {
//   try {
//     const { date } = req.query;
//     let startDate, endDate, displayDate;

//     // Validate and parse date
//     if (date) {
//       const parsedDate = new Date(date);
//       if (isNaN(parsedDate)) {
//         return res.status(400).json({ message: 'Invalid date format. Use YYYY-MM-DD' });
//       }
//       startDate = new Date(parsedDate);
//       startDate.setHours(0, 0, 0, 0);
//       endDate = new Date(startDate);
//       endDate.setDate(endDate.getDate() + 1);
//       displayDate = parsedDate;
//     } else {
//       startDate = new Date();
//       startDate.setHours(0, 0, 0, 0);
//       endDate = new Date(startDate);
//       endDate.setDate(endDate.getDate() + 1);
//       displayDate = new Date();
//     }

//     console.log('Input date:', date);
//     console.log('Parsed displayDate:', displayDate.toISOString());

//     const reports = await Report.find({
//       date: { $gte: startDate, $lt: endDate },
//     }).populate('serviceId', 'name');

//     const services = await Service.find().select('name');

//     const kunetCategories = ['በወቅቱ', 'በዘገየ', 'በነባር'];
//     const idCategories = ['አዲስ', 'እድሳት', 'ምትክ'];
//     const unmarriedCategories = ['አዲስ', 'እድሳት', 'እርማት', 'ምትክ'];
//     const noCategory = [];

//     const serviceCategories = {
//       'ልደት': kunetCategories,
//       'ጋብቻ': kunetCategories,
//       'ሞት': kunetCategories,
//       'ፍቺ': kunetCategories,
//       'ጉዲፈቻ': kunetCategories,
//       'እርማት፣እድሳት እና ግልባጭ': noCategory,
     
//       'የነዋሪነት ምዝገባ': noCategory,
//       'መታወቂያ': idCategories,
//       'ያላገባ': unmarriedCategories,
//       'መሸኛ': noCategory,
//       'የዝምድና አገልግሎት': noCategory,
//       'የነዋሪነት ማረጋገጫ': noCategory,
//       'በህይወት ስለመኖር': noCategory,
//     };

//     // Initialize report summary
//     const reportSummary = {};
//     services.forEach(service => {
//       const serviceName = service.name;
//       reportSummary[serviceName] = { categories: {}, total: 0 };
//       const cats = serviceCategories[serviceName] || noCategory;

//       cats.forEach(cat => {
//         reportSummary[serviceName].categories[cat] = 0;
//       });

//       const serviceReports = reports.filter(r => r.serviceId.name === serviceName);
//       serviceReports.forEach(report => {
//         const cat = report.serviceCategory || 'N/A';
//         if (reportSummary[serviceName].categories[cat] !== undefined) {
//           reportSummary[serviceName].categories[cat]++;
//         } else if (serviceCategories[serviceName].length === 0 && cat === 'N/A') {
//           reportSummary[serviceName].total++;
//         }
//       });
//       reportSummary[serviceName].total += serviceReports.length;
//     });

//     // Generate PDF
//     const doc = new PDFDocument({ size: 'A4', margin: 50 });
//     res.setHeader('Content-Type', 'application/pdf');
//     res.setHeader('Content-Disposition', `attachment; filename=daily_report_${date || displayDate.toISOString().split('T')[0]}.pdf`);

//     // Register Noto Sans Ethiopic font
//     const fontPath = path.join(__dirname, '../fonts/NotoSansEthiopic-VariableFont_wdth,wght.ttf');
//     doc.registerFont('NotoSansEthiopic-VariableFont_wdth,wght', fontPath);
//     doc.font('NotoSansEthiopic-VariableFont_wdth,wght');

//     doc.pipe(res);

//     // Header
//     doc.fontSize(20).text('ዕለታዊ ሪፖርት', { align: 'center' });
//     let ethiopianDateStr;
//     try {
//       const ethiopianDate = toEthiopian(displayDate);
//       ethiopianDateStr = `${ethiopianDate[2]}/${ethiopianDate[1]}/${ethiopianDate[0]}`;
//       console.log('Ethiopian date:', ethiopianDateStr);
//     } catch (e) {
//       console.error('Ethiopian date conversion failed:', e.message);
//       ethiopianDateStr = displayDate.toLocaleDateString('en-US');
//       console.log('Fallback date:', ethiopianDateStr);
//     }
//     doc.fontSize(12).text(ethiopianDateStr, { align: 'center' });
//     doc.moveDown(2);

//     // Prepare table data
//     const table = {
//       headers: ['ኣገልግሎት', 'ምድብ', 'ክንውን'],
//       rows: [],
//     };

//     // Populate table rows
//     Object.keys(reportSummary).forEach(serviceName => {
//       const summary = reportSummary[serviceName];
//       if (serviceCategories[serviceName].length === 0) {
//         table.rows.push([serviceName, 'ጠቅላላ', summary.total.toString()]);
//       } else {
//         Object.keys(summary.categories).forEach(cat => {
//           table.rows.push([serviceName, cat, summary.categories[cat].toString()]);
//         });
//         table.rows.push([serviceName, 'ጠቅላላ', summary.total.toString()]);
//       }
//     });

//     // Render table
//     await doc.table(table, {
//       width: 500,
//       columnsSize: [200, 200, 100],
//       padding: 5,
//       headerColor: '#d3d3d3',
//       headerOpacity: 0.7,
//       headerTextSize: 12,
//       textSize: 10,
//       borderWidth: 1,
//       borderColor: '#000000',
//       x: 50,
//       y: doc.y,
//     });

//     doc.end();
//   } catch (error) {
//     console.error('Error generating PDF report:', error);
//     if (!res.headersSent) {
//       res.status(500).json({ message: 'Server error while generating PDF report' });
//     }
//   }
// };
// @desc    Generate PDF report for a specific date
// @route   GET /api/reports/generate-pdf?date=YYYY-MM-DD
// @access  Private/Admin
// @desc    Generate PDF report for a specific date
// @route   GET /api/reports/generate-pdf?date=YYYY-MM-DD
// @access  Private/Admin
// @desc    Generate PDF report for a specific date
// @route   GET /api/reports/generate-pdf?date=YYYY-MM-DD
// @access  Private/Admin
// @desc    Generate PDF report for a specific date
// @route   GET /api/reports/generate-pdf?date=YYYY-MM-DD
// @access  Private/Admin
// @desc    Generate PDF report for a specific date
// @route   GET /api/reports/generate-pdf?date=YYYY-MM-DD
// @access  Private/Admin
const generatePDFReport = async (req, res) => {
  try {
    const { date } = req.query;
    let startDate, endDate, displayDate;

    // Validate and parse date
    if (date) {
      const parsedDate = new Date(date);
      if (isNaN(parsedDate)) {
        return res.status(400).json({ message: 'Invalid date format. Use YYYY-MM-DD' });
      }
      startDate = new Date(parsedDate);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 1);
      displayDate = parsedDate;
    } else {
      startDate = new Date();
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 1);
      displayDate = new Date();
    }

    console.log('Fetching reports for date range:', startDate, 'to', endDate);

    const reports = await Report.find({
      date: { $gte: startDate, $lt: endDate },
    }).populate('serviceId', 'name');

    console.log(`Found ${reports.length} reports`);

    const services = await Service.find().select('name');
    
    // Use utility to prepare data
    const reportSummary = prepareReportSummary(reports, services);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=daily_report_${date || new Date().toISOString().split('T')[0]}.pdf`);

    const title = 'በአዲስ ከተማ ክፍለ ከተማ የሲቪል ምዝገባ እና የነዋሪነት አገልግሎት ጽ/ቤት ዕለታዊ ሪፖርት';
    
    // Generate PDF
    generateReportPDF(res, reportSummary, reports.length, displayDate, title);

  } catch (error) {
    console.error('Error generating PDF report:', error);
    if (!res.headersSent) {
      res.status(500).json({ message: 'Server error while generating PDF report: ' + error.message });
    }
  }
};
const generateWoredaPDFReport = async (req, res) => {
  try {
    const { date, woreda } = req.query;
    if (!woreda) {
      return res.status(403).json({ message: 'User has no woreda assigned' });
    }

    let startDate, endDate, displayDate;

    if (date) {
      const parsedDate = new Date(date);
      if (isNaN(parsedDate)) {
        return res.status(400).json({ message: 'Invalid date format. Use YYYY-MM-DD' });
      }
      startDate = new Date(parsedDate);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 1);
      displayDate = parsedDate;
    } else {
      return res.status(400).json({ message: 'Date is required' });
    }

    console.log('Generating woreda report for woreda:', woreda, 'date:', displayDate.toISOString());

    const reports = await Report.find({
      woreda,
      date: { $gte: startDate, $lt: endDate },
    }).populate('serviceId', 'name');

    const services = await Service.find().select('name');

    // Use utility to prepare data
    const reportSummary = prepareReportSummary(reports, services);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=daily_report_${woreda}_${date || new Date().toISOString().split('T')[0]}.pdf`);

    const title = `በአዲስ ከተማ ክፍለ ከተማ የሲቪል ምዝገባ እና የነዋሪነት አገልግሎት ጽ/ቤት የወረዳ ${woreda} ዕለታዊ ሪፖርት`;

    generateReportPDF(res, reportSummary, reports.length, displayDate, title);

  } catch (error) {
    console.error('Error generating PDF report:', error);
    if (!res.headersSent) {
      res.status(500).json({ message: 'Server error while generating PDF report: ' + error.message });
    }
  }
};
module.exports = {
  getAllReports,
  getReportById,
  createReport,
  updateReport,
  deleteReport,
  getReportsByDateAndService,
  getPublicReports,
  getPublicReportsByDateAndService,
  generatePDFReport,
  generateWoredaPDFReport,
  getWoredas
};