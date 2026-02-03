const Report = require('../models/Report');
const { normalizeWoreda } = require('../utils/woredaUtils');
const Service = require('../models/Service');
const User = require('../models/User');
const OnTimeReg = require('../models/OnTimeReg');
const Plan = require('../models/Plan');
const Winner = require('../models/Winner');
const Notification = require('../models/Notification');
const { connectToAtlas } = require('../utils/atlasConnection');
const aggregateSyncService = require('../services/aggregateSyncService');
const syncScheduler = require('../services/syncScheduler');
const path = require('path');
const PDFDocument = require('pdfkit');
const pdfTable = require('pdfkit-table');
const { toEthiopian } = require('ethiopian-date');
const { prepareReportSummary, generateReportPDF } = require('../utils/pdfGenerator');

function getCurrentEthiopianYear() {
  const today = new Date();
  return toEthiopian(today.getFullYear(), today.getMonth() + 1, today.getDate())[0];
}

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
  const { 
    serviceId, woreda, serviceCategory, cardSerial, referenceNo, 
    registrationNumber, letterNumber, evidenceType, sourceWoreda, 
    priceVariant, price, payment, count 
  } = req.body;

  if (!serviceId) {
    return res.status(400).json({ message: 'Service ID is required' });
  }

  if (!req.user.woreda) {
    return res.status(403).json({ message: 'User has no woreda assigned' });
  }

  try {
    const service = await Service.findById(serviceId).select('name showCardSerial showReferenceNo showRegistrationNumber showLetterNumber');
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

    // Dynamic Validation based on Service Configuration
    if (service.showRegistrationNumber && !registrationNumber) {
      return res.status(400).json({ message: 'Registration number is required for this service' });
    }
    if (service.showLetterNumber && !letterNumber) {
      return res.status(400).json({ message: 'Letter number is required for this service' });
    }
    if (service.showCardSerial && !cardSerial) {
      return res.status(400).json({ message: 'Card serial is required for this service' });
    }
    if (service.showReferenceNo && !referenceNo) {
      return res.status(400).json({ message: 'Reference number is required for this service' });
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
      evidenceType,
      sourceWoreda,
      priceVariant,
      price,
      payment,
      count: count || 1,
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
    io.emit('rankingUpdate', { timestamp: new Date() });
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
  const { 
    serviceId, woreda, serviceCategory, date, cardSerial, referenceNo, 
    registrationNumber, letterNumber, evidenceType, sourceWoreda, 
    priceVariant, price, payment, count 
  } = req.body;

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

    const service = await Service.findById(serviceId || report.serviceId).select('name showCardSerial showReferenceNo showRegistrationNumber showLetterNumber');
    if (!service) {
      return res.status(404).json({ message: 'Service not found' });
    }

    // Dynamic Validation for Update
    if (service.showRegistrationNumber && registrationNumber === undefined && !report.registrationNumber) {
       // if it's being shown but not provided and not already there, it's missing (though update usually provides what's changed)
       // usually for update we only validate if it's being changed or if we want to enforce full validity
    }
    // To keep it simple and useful, we'll only validate if the fields are actually being passed in the update
    if (registrationNumber !== undefined && service.showRegistrationNumber && !registrationNumber) return res.status(400).json({ message: 'Registration number cannot be empty' });
    if (letterNumber !== undefined && service.showLetterNumber && !letterNumber) return res.status(400).json({ message: 'Letter number cannot be empty' });
    if (cardSerial !== undefined && service.showCardSerial && !cardSerial) return res.status(400).json({ message: 'Card serial cannot be empty' });
    if (referenceNo !== undefined && service.showReferenceNo && !referenceNo) return res.status(400).json({ message: 'Reference number cannot be empty' });

    report.serviceId = serviceId || report.serviceId;
    report.woreda = (req.user.role === 'Admin' && woreda) ? woreda : report.woreda;
    report.serviceCategory = serviceCategory || report.serviceCategory;
    report.cardSerial = cardSerial || report.cardSerial;
    report.referenceNo = referenceNo || report.referenceNo;
    report.registrationNumber = registrationNumber || report.registrationNumber;
    report.letterNumber = letterNumber || report.letterNumber;
    report.evidenceType = evidenceType || report.evidenceType;
    report.sourceWoreda = sourceWoreda || report.sourceWoreda;
    report.priceVariant = priceVariant || report.priceVariant;
    report.price = price !== undefined ? price : report.price;
    report.payment = payment !== undefined ? payment : report.payment;
    report.date = date || report.date;
    report.count = count !== undefined ? count : report.count;

    const updatedReport = await report.save();

    // RESTORE SYNC: If this is a remote report, update Atlas and local mirror
    if (report.remoteId) {
        try {
            const updateData = {
                referenceNumber: report.referenceNo,
                woreda: report.woreda,
                serviceName: service.name,
                date: report.date
            };
            // Update local mirror
            await OnTimeReg.findByIdAndUpdate(report.remoteId, updateData);
            
            // Update Atlas
            const connection = await connectToAtlas();
            if (connection) {
                const RemoteOnTimeReg = connection.model('OnTimeReg', OnTimeReg.schema);
                await RemoteOnTimeReg.findByIdAndUpdate(report.remoteId, updateData);
            }
        } catch (syncErr) {
            console.warn('Sync update failed:', syncErr.message);
        }
    }

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

    // RESTORE TRIPLE DELETE
    if (report.remoteId) {
        try {
            // 1. Delete Local Mirror
            await OnTimeReg.findByIdAndDelete(report.remoteId);
            
            // 2. Delete from Atlas
            const connection = await connectToAtlas();
            if (connection) {
                const RemoteOnTimeReg = connection.model('OnTimeReg', OnTimeReg.schema);
                await RemoteOnTimeReg.findByIdAndDelete(report.remoteId);
            }
        } catch (syncErr) {
            console.warn('Sync delete failed:', syncErr.message);
        }
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
    // Allow Admin, Staff, OR users in Woreda 15 (Subcity) to see all woredas
    if (req.user.role === 'Admin' || req.user.role === 'Staff' || normalizeWoreda(req.user.woreda) === '15') {
      woredas = await User.find({ role: { $in: ['Staff', 'User'] }, woreda: { $ne: null } }).distinct('woreda');
    } else {
      if (!req.user.woreda) {
        return res.status(403).json({ message: 'No woreda assigned' });
      }
      woredas = [req.user.woreda];
    }
    
    // Normalize and ensure uniqueness
    const normalizedWoredas = [...new Set(woredas.map(w => normalizeWoreda(w)))].sort((a, b) => {
      // Sort numerically if possible
      const numA = parseInt(a);
      const numB = parseInt(b);
      if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
      return a.localeCompare(b);
    });

    res.status(200).json(normalizedWoredas);
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
    const { startDate, endDate: queryEndDate } = req.query;
    let start, end, displayStartDate, displayEndDate;

    if (startDate && queryEndDate) {
      start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      
      end = new Date(queryEndDate);
      end.setHours(23, 59, 59, 999);
      
      displayStartDate = start;
      displayEndDate = end;
    } else if (startDate) {
      start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      end = new Date(start);
      end.setHours(23, 59, 59, 999);
      displayStartDate = start;
    } else {
      start = new Date();
      start.setHours(0, 0, 0, 0);
      end = new Date(start);
      end.setHours(23, 59, 59, 999);
      displayStartDate = start;
    }

    const query = {
      date: { $gte: start, $lte: end },
    };

    // Role-based filtering
    let titleContext = "ጠቅላላ የክፍለ ከተማ";
    if (req.user.role === 'User' || (req.user.role === 'Staff' && req.user.woreda)) {
      if (req.user.woreda) {
        query.woreda = req.user.woreda;
        titleContext = `የወረዳ ${req.user.woreda}`;
      }
    }

    const reports = await Report.find(query).populate('serviceId', 'name');
    const services = await Service.find().select('name');
    
    const reportSummary = prepareReportSummary(reports, services);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=report_${startDate || 'daily'}.pdf`);

    const title = `በአዲስ ከተማ ክፍለ ከተማ የሲቪል ምዝገባ እና የነዋሪነት አገልግሎት ጽ/ቤት ${titleContext} ሪፖርት`;
    
    await generateReportPDF(res, reportSummary, reports.length, displayStartDate, title, displayEndDate);

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

    await generateReportPDF(res, reportSummary, reports.length, displayDate, title);

  } catch (error) {
    console.error('Error generating PDF report:', error);
    if (!res.headersSent) {
      res.status(500).json({ message: 'Server error while generating PDF report: ' + error.message });
    }
  }
};
// @desc    Get today's report summary (count and revenue by service/category)
// @access  Private
const getTodaySummary = async (req, res) => {
  try {
    const { woreda } = req.query; // Get woreda from query params
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    // Build query - filter by woreda if provided
    const query = {
      date: { $gte: today, $lt: tomorrow }
    };
    
    // Apply role-based filtering
    if (req.user.role === 'User') {
      if (!req.user.woreda) {
        return res.status(403).json({ message: 'User has no woreda assigned' });
      }
      query.woreda = req.user.woreda;
    } else if (woreda && (req.user.role === 'Admin' || req.user.role === 'Staff')) {
      // Allow Admin and Staff to specify woreda in query params
      query.woreda = woreda;
    }

    const reports = await Report.find(query).populate('serviceId');

    const summary = {
      totalCount: 0,
      totalRevenue: 0,
      byService: {}
    };

    reports.forEach(report => {
      const serviceName = report.serviceId.name;
      const category = report.serviceCategory || 'N/A';
      // Use payment field, but ensure it's properly calculated from price variants
      const payment = report.payment || report.price || 0;

      if (!summary.byService[serviceName]) {
        summary.byService[serviceName] = {
          total: 0,
          revenue: 0,
          categories: {}
        };
      }

      summary.totalCount++;
      summary.totalRevenue += payment;
      summary.byService[serviceName].total++;
      summary.byService[serviceName].revenue += payment;

      if (!summary.byService[serviceName].categories[category]) {
        summary.byService[serviceName].categories[category] = 0;
      }
      summary.byService[serviceName].categories[category]++;
    });

    res.json(summary);
  } catch (error) {
    console.error('Error in getTodaySummary:', error);
    res.status(500).json({ message: 'Server error while fetching summary' });
  }
};

// @desc    Get standalone user summary logic (for testing without auth)
// @access  Public
const getStandaloneUserSummary = async (req, res) => {
  try {
    const { woreda } = req.query; // Get woreda from query params
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    // Build query - filter by woreda if provided
    const query = {
      date: { $gte: today, $lt: tomorrow }
    };
    if (woreda) {
      query.woreda = woreda;
    }

    const reports = await Report.find(query).populate('serviceId');

    const summary = {
      totalCount: 0,
      totalRevenue: 0,
      byService: {}
    };

    reports.forEach(report => {
      const serviceName = report.serviceId.name;
      const category = report.serviceCategory || 'N/A';
      // Use payment field, but ensure it's properly calculated from price variants
      const payment = report.payment || report.price || 0;

      if (!summary.byService[serviceName]) {
        summary.byService[serviceName] = {
          total: 0,
          revenue: 0,
          categories: {}
        };
      }

      summary.totalCount++;
      summary.totalRevenue += payment;
      summary.byService[serviceName].total++;
      summary.byService[serviceName].revenue += payment;

      if (!summary.byService[serviceName].categories[category]) {
        summary.byService[serviceName].categories[category] = 0;
      }
      summary.byService[serviceName].categories[category]++;
    });

    res.json(summary);
  } catch (error) {
    console.error('Error in getStandaloneUserSummary:', error);
    res.status(500).json({ message: 'Server error while fetching standalone user summary' });
  }
};

// @desc    Get public today's report summary (count and revenue by service/category)
// @access  Public
const getPublicTodaySummary = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    const query = {
      date: { $gte: today, $lt: tomorrow }
    };

    const reports = await Report.find(query).populate('serviceId');

    const summary = {
      totalCount: 0,
      totalRevenue: 0,
      byService: {}
    };

    reports.forEach(report => {
      const serviceName = report.serviceId.name;
      const category = report.serviceCategory || 'N/A';
      // Use payment field, but ensure it's properly calculated from price variants
      const payment = report.payment || report.price || 0;

      if (!summary.byService[serviceName]) {
        summary.byService[serviceName] = {
          total: 0,
          revenue: 0,
          categories: {}
        };
      }

      summary.totalCount++;
      summary.totalRevenue += payment;
      summary.byService[serviceName].total++;
      summary.byService[serviceName].revenue += payment;

      if (!summary.byService[serviceName].categories[category]) {
        summary.byService[serviceName].categories[category] = 0;
      }
      summary.byService[serviceName].categories[category]++;
    });

    res.json(summary);
  } catch (error) {
    console.error('Error in getPublicTodaySummary:', error);
    res.status(500).json({ message: 'Server error while fetching public summary' });
  }
};

// @desc    Get daily service progress for a woreda
// @access  Private
const getDailyServiceProgress = async (req, res) => {
  try {
    const { woreda } = req.query;
    if (!woreda) return res.status(400).json({ message: 'Woreda is required' });

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    const reports = await Report.find({
      woreda,
      date: { $gte: today, $lt: tomorrow }
    }).populate('serviceId');

    const budgetYear = getCurrentEthiopianYear().toString();
    const woredaPlanDoc = await Plan.findOne({ woreda, budgetYear }).lean();

    const allServices = await Service.find({ isActive: true });
    
    const progress = {
      overallAverage: 0,
      services: []
    };

    let totalPercentage = 0;
    let count = 0;

    allServices.forEach(service => {
      // Skip subcity services for regular woredas and vice versa
      if (woreda === '15' && !service.isSubcityOnly) return;
      if (woreda !== '15' && service.isSubcityOnly) return;
      
      const actual = reports.filter(r => r.serviceId._id.toString() === service._id.toString()).length;
      
      // Calculate dailyGoal: Sum plans for ALL categories of this service in Woreda Plan, fallback to global
      let yearlyTarget = 0;
      if (woredaPlanDoc && woredaPlanDoc.services) {
        const totalWoredaPlan = woredaPlanDoc.services
          .filter(s => s.serviceId.toString() === service._id.toString())
          .reduce((sum, s) => sum + (s.plan || 0), 0);
        
        if (totalWoredaPlan > 0) {
          yearlyTarget = totalWoredaPlan;
        } else {
          yearlyTarget = service.yearlyPlan || 0;
        }
      } else {
        yearlyTarget = service.yearlyPlan || 0;
      }

      const dailyGoal = yearlyTarget > 0 ? Math.ceil(yearlyTarget / 300) : 5; // Always round UP, fallback to 5
      const percentage = Math.min(Math.round((actual / dailyGoal) * 100), 100);

      progress.services.push({
        name: service.name,
        actual,
        dailyGoal,
        percentage
      });

      totalPercentage += percentage;
      count++;
    });

    if (count > 0) {
      progress.overallAverage = Math.round(totalPercentage / count);
    }

    res.json(progress);
  } catch (error) {
    console.error('Error in getDailyServiceProgress:', error);
    res.status(500).json({ message: 'Server error while fetching progress' });
  }
};

// @desc    Get public daily service progress for a woreda (defaults to subcity)
// @access  Public
const getPublicDailyProgress = async (req, res) => {
  try {
    const { woreda = '15' } = req.query; // Default to subcity for public display

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    // Build query: if woreda is 15 (subcity), fetch reports from ALL woredas for aggregate progress
    const query = {
      date: { $gte: today, $lt: tomorrow }
    };
    if (woreda !== '15') {
      query.woreda = woreda;
    }

    const reports = await Report.find(query).populate('serviceId');

    const allServices = await Service.find({ isActive: true });
    
    const progress = {
      overallAverage: 0,
      services: []
    };

    let totalPercentage = 0;
    let count = 0;

    const budgetYear = getCurrentEthiopianYear().toString();
    const woredaPlanDoc = woreda !== '15' ? await Plan.findOne({ woreda, budgetYear }).lean() : null;

    allServices.forEach(service => {
      // Logic for filtering services:
      // If a specific woreda is requested (not '15'), skip subcity-only services.
      // If '15' (subcity) is requested, show all active services.
      if (woreda !== '15' && service.isSubcityOnly) return;
      
      const actual = reports.filter(r => r.serviceId._id.toString() === service._id.toString()).length;
      
      // Calculate dailyGoal: Sum plans for ALL categories of this service in Woreda Plan, fallback to global
      let yearlyTarget = 0;
      if (woredaPlanDoc && woredaPlanDoc.services) {
        const totalWoredaPlan = woredaPlanDoc.services
          .filter(s => s.serviceId.toString() === service._id.toString())
          .reduce((sum, s) => sum + (s.plan || 0), 0);
        
        if (totalWoredaPlan > 0) {
          yearlyTarget = totalWoredaPlan;
        } else {
          yearlyTarget = service.yearlyPlan || 0;
        }
      } else {
        yearlyTarget = service.yearlyPlan || 0;
      }

      const dailyGoal = yearlyTarget > 0 ? Math.ceil(yearlyTarget / 300) : 5; // Always round UP, fallback to 5
      const percentage = Math.min(Math.round((actual / dailyGoal) * 100), 100);

      progress.services.push({
        name: service.name,
        actual,
        dailyGoal,
        percentage
      });

      totalPercentage += percentage;
      count++;
    });

    if (count > 0) {
      progress.overallAverage = Math.round(totalPercentage / count);
    }

    res.json(progress);
  } catch (error) {
    console.error('Error in getPublicDailyProgress:', error);
    res.status(500).json({ message: 'Server error while fetching public progress' });
  }
};


// @desc    Get ranking of woredas based on daily performance
const getDailyWoredaRanking = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    // 1. Get all reports for today
    const reports = await Report.find({
      date: { $gte: today, $lt: tomorrow }
    }).lean();

    // 2. Get all plans to calculate goals
    const currentYear = getCurrentEthiopianYear().toString();
    const plans = await Plan.find({ budgetYear: currentYear }).populate('services.serviceId').lean();

    // 3. Group reports by woreda
    const woredaStats = {};
    
    // Initialize woredas from plans (so even woredas with 0 reports appear)
    plans.forEach(plan => {
      const wName = plan.woreda;
      if (!woredaStats[wName]) {
        woredaStats[wName] = {
          woreda: wName,
          totalReports: 0,
          totalDailyGoal: 0,
          services: {}
        };
      }
      
      // Calculate total daily goal for this woreda
      let woredaDailyGoal = 0;
      plan.services.forEach(s => {
        // Daily goal = Yearly / 300 working days, rounded up
        const daily = yearly > 0 ? Math.ceil(yearly / 300) : 0;
        woredaDailyGoal += daily;
      });
      woredaStats[wName].totalDailyGoal = woredaDailyGoal || 1; // Already ceiled individually
    });

    // Count reports
    reports.forEach(r => {
      const wName = r.woreda;
      // If woreda not in plans, init it (fallback goal)
      if (!woredaStats[wName]) {
        woredaStats[wName] = { 
          woreda: wName, 
          totalReports: 0, 
          totalDailyGoal: 50 // Fallback generic goal if no plan
        };
      }
      woredaStats[wName].totalReports++;
    });

    // 4. Calculate Scores
    const ranking = Object.values(woredaStats).map(stat => {
      const rawScore = (stat.totalReports / stat.totalDailyGoal) * 100;
      return {
        woreda: stat.woreda,
        reports: stat.totalReports,
        goal: stat.totalDailyGoal,
        score: parseFloat(rawScore.toFixed(1))
      };
    });

    // 5. Sort Descending
    ranking.sort((a, b) => b.score - a.score);

    // 6. Assign Ranks
    const finalRanking = ranking.map((item, index) => ({
      ...item,
      rank: index + 1
    }));

    res.json({
      date: today,
      rankings: finalRanking,
      winner: finalRanking.length > 0 ? finalRanking[0] : null
    });

  } catch (error) {
    console.error('Error in getRanking:', error);
    res.status(500).json({ message: 'Server error fetching ranking' });
  }
};

// @desc    Calculate today's winner and notify everyone
const announceDailyWinner = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    // 1. Get rankings (logic same as getDailyWoredaRanking but internal)
    const reports = await Report.find({ date: { $gte: today, $lt: tomorrow } }).lean();
    const currentYear = getCurrentEthiopianYear().toString();
    const plans = await Plan.find({ budgetYear: currentYear }).lean();

    const woredaStats = {};
    plans.forEach(plan => {
      const wName = plan.woreda;
      if (!woredaStats[wName]) {
        woredaStats[wName] = { woreda: wName, totalReports: 0, totalDailyGoal: 0 };
      }
      let woredaDailyGoal = 0;
      (plan.services || []).forEach(s => {
        const yearly = s.plan || 0;
        woredaDailyGoal += yearly > 0 ? Math.ceil(yearly / 300) : 0;
      });
      woredaStats[wName].totalDailyGoal = woredaDailyGoal || 1;
    });

    reports.forEach(r => {
      const wName = r.woreda;
      if (!woredaStats[wName]) woredaStats[wName] = { woreda: wName, totalReports: 0, totalDailyGoal: 50 };
      woredaStats[wName].totalReports++;
    });

    const ranking = Object.values(woredaStats).map(stat => {
      const rawScore = (stat.totalReports / stat.totalDailyGoal) * 100;
      return {
        woreda: stat.woreda,
        reports: stat.totalReports,
        goal: stat.totalDailyGoal,
        score: parseFloat(rawScore.toFixed(1))
      };
    });

    ranking.sort((a, b) => b.score - a.score);

    if (ranking.length === 0) {
      return res.status(400).json({ message: 'No data available to announce a winner today.' });
    }

    const winnerData = ranking[0];

    // 2. Save to Winner collection (auto-deactivates previous via pre-save hook)
    const newWinner = new Winner({
      woreda: winnerData.woreda,
      score: winnerData.score,
      reportCount: winnerData.reports,
      dailyGoal: winnerData.goal,
      announcementDate: new Date()
    });
    await newWinner.save();

    // 3. Create Notification for all woredas
    const notification = new Notification({
      message: `🏆 እንኳን ደስ አላችሁ! የዛሬው የዕለቱ አሸናፊ ${winnerData.woreda} ወረዳ በ ${winnerData.score}% አፈጻጸም ሆኗል።`,
      targetWoreda: null, // All woredas
      sender: req.user.id
    });
    await notification.save();

    res.json({ message: 'Winner announced and notifications sent successfully!', winner: newWinner });

  } catch (error) {
    console.error('Error in announcing winner:', error);
    res.status(500).json({ message: 'Server error while announcing winner' });
  }
};

// @desc    Get the latest announced winner for the banner
const getLatestWinner = async (req, res) => {
  try {
    const winner = await Winner.findOne({ isActive: true }).sort({ announcementDate: -1 });
    res.json(winner);
  } catch (error) {
    console.error('Error fetching latest winner:', error);
    res.status(500).json({ message: 'Server error while fetching winner' });
  }
};

// @desc    Fix existing reports by updating price/payment fields based on price variants and category base prices
// @access  Private/Admin
const fixReportPrices = async (req, res) => {
  try {
    console.log('Starting to fix report prices...');
    
    // Get all services to build price lookup
    const services = await Service.find();
    const priceVariantLookup = {};
    const categoryPriceLookup = {};
    
    services.forEach(service => {
      service.categories?.forEach(category => {
        // Build price variant lookup
        if (category.hasPriceVariants && category.priceVariants) {
          category.priceVariants.forEach(variant => {
            const key = `${service._id}-${category.name}-${variant.label}`;
            priceVariantLookup[key] = variant.price;
          });
        }
        
        // Build category base price lookup
        if (!category.hasPriceVariants && category.price && category.price > 0) {
          const key = `${service._id}-${category.name}`;
          categoryPriceLookup[key] = category.price;
        }
      });
    });
    
    console.log('Built price variant lookup with', Object.keys(priceVariantLookup).length, 'variants');
    console.log('Built category price lookup with', Object.keys(categoryPriceLookup).length, 'category prices');
    
    // Find reports that need price updates
    const reportsToUpdate = await Report.find({
      $or: [
        { price: { $in: [null, undefined, 0] } },
        { payment: { $in: [null, undefined, 0] } }
      ]
    }).populate('serviceId');
    
    console.log('Found', reportsToUpdate.length, 'reports to check for price updates');
    
    let updatedCount = 0;
    let totalRevenueAdded = 0;
    let variantUpdates = 0;
    let categoryUpdates = 0;
    
    for (const report of reportsToUpdate) {
      let correctPrice = null;
      
      // First check if report has price variant
      if (report.priceVariant && report.priceVariant !== '') {
        const variantKey = `${report.serviceId._id}-${report.serviceCategory || 'N/A'}-${report.priceVariant}`;
        correctPrice = priceVariantLookup[variantKey];
        if (correctPrice) variantUpdates++;
      }
      
      // If no price variant found, check category base price
      if (!correctPrice && report.serviceCategory) {
        const categoryKey = `${report.serviceId._id}-${report.serviceCategory}`;
        correctPrice = categoryPriceLookup[categoryKey];
        if (correctPrice) categoryUpdates++;
      }
      
      if (correctPrice && correctPrice > 0) {
        await Report.findByIdAndUpdate(report._id, {
          price: correctPrice,
          payment: correctPrice
        });
        updatedCount++;
        totalRevenueAdded += correctPrice;
      }
    }
    
    console.log(`Updated ${updatedCount} reports, added ${totalRevenueAdded} ETB in revenue`);
    console.log(`- Price variant updates: ${variantUpdates}`);
    console.log(`- Category base price updates: ${categoryUpdates}`);
    
    res.json({
      message: 'Report prices fixed successfully',
      reportsUpdated: updatedCount,
      totalRevenueAdded: totalRevenueAdded,
      variantUpdates: variantUpdates,
      categoryUpdates: categoryUpdates
    });
    
  } catch (error) {
    console.error('Error fixing report prices:', error);
    res.status(500).json({ message: 'Server error while fixing report prices' });
  }
};

// @desc    Manual sync of aggregate service counts to Atlas
// @access  Private (Admin/Staff)
const syncAggregateStats = async (req, res) => {
  try {
    console.log('Manual aggregate sync requested by user:', req.user.fullName);
    
    const result = await aggregateSyncService.performSync();
    
    if (result.success) {
      console.log(`Manual sync completed: ${result.stats.length} services synced`);
      res.json({
        success: true,
        message: result.message,
        stats: result.stats,
        syncTime: result.syncTime,
        summary: result.summary
      });
    } else {
      console.error('Manual sync failed:', result.message);
      res.status(500).json({
        success: false,
        message: result.message
      });
    }
  } catch (error) {
    console.error('Error in manual aggregate sync:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during sync'
    });
  }
};

// @desc    Get current aggregate stats status
// @access  Private (Admin/Staff)
const getAggregateStatsStatus = async (req, res) => {
  try {
    const status = aggregateSyncService.getSyncStatus();
    const localStats = await aggregateSyncService.getCurrentLocalStats();
    
    res.json({
      syncStatus: status,
      localStats: localStats,
      totalServices: localStats.length,
      totalReports: localStats.reduce((sum, stat) => sum + stat.totalCount, 0)
    });
  } catch (error) {
    console.error('Error getting aggregate stats status:', error);
    res.status(500).json({
      message: 'Server error while fetching stats status'
    });
  }
};

// @desc    Get Atlas stats for comparison
// @access  Private (Admin/Staff)
const getAtlasStats = async (req, res) => {
  try {
    const atlasConnection = await connectToAtlas();
    
    if (!atlasConnection) {
      return res.status(503).json({
        message: 'Atlas connection not available'
      });
    }

    const CumulativeStats = atlasConnection.model('CumulativeStats', require('../models/CumulativeStats').schema);
    
    const atlasStats = await CumulativeStats.find({})
      .sort({ lastUpdated: -1 });
    
    res.json({
      success: true,
      stats: atlasStats,
      totalServices: atlasStats.length,
      totalReports: atlasStats.reduce((sum, stat) => sum + stat.totalCount, 0),
      lastUpdated: atlasStats.length > 0 ? atlasStats[0].lastUpdated : null
    });
  } catch (error) {
    console.error('Error getting Atlas stats:', error);
    res.status(500).json({
      message: 'Server error while fetching Atlas stats'
    });
  }
};

// @desc    Get scheduler status
// @access  Private (Admin/Staff)
const getSchedulerStatus = async (req, res) => {
  try {
    const status = syncScheduler.getSchedulerStatus();
    res.json({
      success: true,
      scheduler: status
    });
  } catch (error) {
    console.error('Error getting scheduler status:', error);
    res.status(500).json({
      message: 'Server error while fetching scheduler status'
    });
  }
};

// @desc    Force sync (bypass scheduler)
// @access  Private (Admin/Staff)
const forceSync = async (req, res) => {
  try {
    console.log('Force sync requested by user:', req.user.fullName);
    const result = await syncScheduler.forceSync();
    
    if (result.success) {
      res.json({
        success: true,
        message: result.message,
        stats: result.stats,
        syncTime: result.syncTime,
        summary: result.summary
      });
    } else {
      res.status(500).json({
        success: false,
        message: result.message
      });
    }
  } catch (error) {
    console.error('Error in force sync:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during force sync'
    });
  }
};

// @desc    Get public aggregate stats (Calculated locally for current Ethiopian Year)
// @access  Public
const getPublicAggregateStats = async (req, res) => {
  try {
    const localStats = await aggregateSyncService.getCurrentLocalStats();
    
    res.json({
      success: true,
      stats: localStats,
      totalServices: localStats.length,
      totalReports: localStats.reduce((sum, stat) => sum + stat.totalCount, 0),
      lastUpdated: new Date()
    });
  } catch (error) {
    console.error('Error getting public aggregate stats:', error);
    res.status(500).json({
      message: 'Server error while fetching public aggregate stats'
    });
  }
};


// @desc    Get public woreda ranking with trends
// @route   GET /api/reports/public/woreda-ranking
// @access  Public
const getPublicWoredaRanking = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    // Get today's reports grouped by woreda
    const reports = await Report.find({
      date: { $gte: today, $lt: tomorrow }
    }).lean();

    // Calculate total services per woreda
    const woredaStats = {};
    reports.forEach(report => {
      const woreda = report.woreda;
      if (!woredaStats[woreda]) {
        woredaStats[woreda] = { woreda, totalServices: 0 };
      }
      woredaStats[woreda].totalServices++;
    });

    // Convert to array and sort by totalServices descending
    const currentRanking = Object.values(woredaStats)
      .sort((a, b) => b.totalServices - a.totalServices)
      .map((item, index) => ({
        ...item,
        rank: index + 1
      }));

    // Get previous ranking (from 5 minutes ago) to calculate trends
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const WoredaRanking = require('../models/WoredaRanking');
    const previousRankings = await WoredaRanking.find({
      date: { $gte: today, $lt: tomorrow },
      createdAt: { $lte: fiveMinutesAgo }
    }).sort({ createdAt: -1 }).limit(20).lean();

    // Create a map of previous ranks
    const previousRankMap = {};
    previousRankings.forEach(pr => {
      if (!previousRankMap[pr.woreda]) {
        previousRankMap[pr.woreda] = pr.rank;
      }
    });

    // Calculate trends
    const rankingWithTrends = currentRanking.map(item => {
      const previousRank = previousRankMap[item.woreda];
      let trend = 'same';
      
      if (previousRank !== undefined) {
        if (item.rank < previousRank) trend = 'up';
        else if (item.rank > previousRank) trend = 'down';
      }

      return {
        ...item,
        trend,
        previousRank: previousRank || item.rank
      };
    });

    // Save current ranking snapshot for future trend calculation
    const bulkOps = rankingWithTrends.map(item => ({
      insertOne: {
        document: {
          woreda: item.woreda,
          rank: item.rank,
          totalServices: item.totalServices,
          date: today
        }
      }
    }));

    if (bulkOps.length > 0) {
      await WoredaRanking.bulkWrite(bulkOps);
    }

    res.json({
      success: true,
      rankings: rankingWithTrends,
      timestamp: new Date()
    });
  } catch (error) {
    console.error('Error getting public woreda ranking:', error);
    res.status(500).json({
      message: 'Server error while fetching woreda ranking'
    });
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
  getWoredas,
  getTodaySummary,
  getPublicTodaySummary,
  getStandaloneUserSummary,
  getDailyServiceProgress,
  getPublicDailyProgress,
  getDailyWoredaRanking,
  announceDailyWinner,
  getLatestWinner,
  fixReportPrices,
  syncAggregateStats,
  getAggregateStatsStatus,
  getAtlasStats,
  getSchedulerStatus,
  forceSync,
  getPublicAggregateStats,
  getPublicWoredaRanking
};
