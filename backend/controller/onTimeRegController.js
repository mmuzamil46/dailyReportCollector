const OnTimeReg = require('../models/OnTimeReg');
const Report = require('../models/Report');
const Service = require('../models/Service');
const { connectToAtlas } = require('../utils/atlasConnection');
const RemoteOfficer = require('../models/RemoteOfficer');

let RemoteOnTimeReg = null;

const getRemoteModel = async () => {
  if (RemoteOnTimeReg) return RemoteOnTimeReg;
  const connection = await connectToAtlas();
  if (!connection) throw new Error('Could not connect to MongoDB Atlas');
  RemoteOnTimeReg = connection.model('OnTimeReg', OnTimeReg.schema);
  return RemoteOnTimeReg;
};

// @desc    Get today's OnTimeReg statistics grouped by facility and woreda
// @route   GET /api/ontime-reg/stats/today
// @access  Public
// @desc    Get today's OnTimeReg statistics grouped by facility and woreda
// @route   GET /api/ontime-reg/stats/today
// @access  Public
const getTodayStats = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const reports = await OnTimeReg.find({
      date: { $gte: today, $lt: tomorrow }
    });

    // Initialize all woredas (01-14 + 15 for subcity)
    const allWoredas = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12', '13', '14', '15'];
    
    // Fetch all officers from the local database (synced from Atlas)
    let officers = [];
    try {
      officers = await RemoteOfficer.find({ isActive: true }).select('hospitalName woreda');
      console.log(`Fetched ${officers.length} officers from local DB`);
    } catch (err) {
      console.error('Error fetching local officers:', err);
    }
    
    // Group by facility (hospital/court) and woreda
    const stats = {
      byFacility: {},
      byWoreda: {},
      byCategory: {
        'ልደት': 0,
        'ሞት': 0,
        'ፍቺ': 0
      },
      total: reports.length
    };

    // Initialize all woredas with zero counts
    allWoredas.forEach(woreda => {
      stats.byWoreda[woreda] = {
        total: 0,
        'ልደት': 0,
        'ሞት': 0,
        'ፍቺ': 0
      };
    });

    // Initialize all facilities from officers with zero counts
    officers.forEach(officer => {
      if (officer.hospitalName) {
        const normalizedFacility = officer.hospitalName.trim();
        // Only add if not already added
        if (!stats.byFacility[normalizedFacility]) {
          stats.byFacility[normalizedFacility] = {
            total: 0,
            'ልደት': 0,
            'ሞት': 0,
            'ፍቺ': 0,
            woreda: officer.woreda || 'Unknown'
          };
        }
      }
    });

    // Process actual reports
    reports.forEach(report => {
      // Count by category
      stats.byCategory[report.serviceName]++;

      // Group by facility (hospital for birth/death, court for divorce)
      let facility = report.hospitalName || report.courtName || 'Unknown';
      facility = facility.trim(); // Normalize
      
      // If facility exists in our list (from officers), update it
      if (stats.byFacility[facility]) {
        stats.byFacility[facility][report.serviceName]++;
        stats.byFacility[facility].total++;
      } else {
        // If it's a new facility not in officers list, add it dynamically
        stats.byFacility[facility] = {
          total: 1,
          'ልደት': report.serviceName === 'ልደት' ? 1 : 0,
          'ሞት': report.serviceName === 'ሞት' ? 1 : 0,
          'ፍቺ': report.serviceName === 'ፍቺ' ? 1 : 0,
          woreda: report.woreda
        };
      }

      // Group by woreda (already initialized)
      if (stats.byWoreda[report.woreda]) {
        stats.byWoreda[report.woreda][report.serviceName]++;
        stats.byWoreda[report.woreda].total++;
      }
    });

    res.json(stats);
  } catch (error) {
    console.error('Error fetching OnTimeReg stats:', error);
    res.status(500).json({ message: 'Server error while fetching statistics' });
  }
};

const { generateRemoteStatsPDF, getEthiopianDateString } = require('../utils/pdfGenerator');

// @desc    Generate PDF Report for OnTimeReg
// @route   GET /api/ontime-reg/report/pdf
// @access  Public (should be admin)
const getPDFReport = async (req, res) => {
  const { startDate, endDate } = req.query;

  try {
    const start = startDate ? new Date(startDate) : new Date();
    start.setHours(0, 0, 0, 0);
    
    const end = endDate ? new Date(endDate) : new Date();
    end.setHours(23, 59, 59, 999);

    const reports = await OnTimeReg.find({
      date: { $gte: start, $lte: end }
    });

    // --- Reuse Aggregation Logic (Similar to getTodayStats but without day restrictions) ---
    
    // Initialize all woredas (01-14 + 15 for subcity)
    const allWoredas = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12', '13', '14', '15'];
    
    // Fetch all officers from local DB
    let officers = [];
    try {
      officers = await RemoteOfficer.find({ isActive: true }).select('hospitalName woreda');
    } catch (err) {
      console.error('Error fetching officers for report:', err);
    }

    const stats = {
      byFacility: {},
      byWoreda: {},
      total: reports.length
    };

    // Initialize Woredas
    allWoredas.forEach(woreda => {
      stats.byWoreda[woreda] = { total: 0, 'ልደት': 0, 'ሞት': 0, 'ፍቺ': 0 };
    });

    // Initialize Facilities
    officers.forEach(officer => {
      if (officer.hospitalName && !stats.byFacility[officer.hospitalName]) {
        stats.byFacility[officer.hospitalName] = {
           total: 0, 'ልደት': 0, 'ሞት': 0, 'ፍቺ': 0, woreda: officer.woreda || 'Unknown' 
        };
      }
    });

    // Aggregate Data
    reports.forEach(report => {
      // Woreda Stats
      if (stats.byWoreda[report.woreda]) {
          stats.byWoreda[report.woreda][report.serviceName]++;
          stats.byWoreda[report.woreda].total++;
      }
      
      // Facility Stats
      const facility = report.hospitalName || report.courtName || 'Unknown';
      if (stats.byFacility[facility]) {
          stats.byFacility[facility][report.serviceName]++;
          stats.byFacility[facility].total++;
      } else {
          stats.byFacility[facility] = {
              total: 1, 'ልደት': 0, 'ሞት': 0, 'ፍቺ': 0, woreda: report.woreda
          };
          stats.byFacility[facility][report.serviceName] = 1;
      }
    });

    // Generate PDF
    const dateRangeStr = getEthiopianDateString(start, end);
    const title = 'ወቅታዊ ምዝገባ ሪፖርት (Atlas Remote)';

    // Set headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=remote_report_${Date.now()}.pdf`);

    await generateRemoteStatsPDF(res, stats, dateRangeStr, title);

  } catch (error) {
    console.error('Error generating PDF:', error);
    res.status(500).send('Error generating PDF');
  }
};

// @desc    Get aggregated report data (JSON) for on-screen display
// @route   GET /api/ontime-reg/report/data
// @access  Public (should be admin)
const getRemoteReportData = async (req, res) => {
  const { startDate, endDate } = req.query;

  try {
    const start = startDate ? new Date(startDate) : new Date();
    start.setHours(0, 0, 0, 0);
    
    const end = endDate ? new Date(endDate) : new Date();
    end.setHours(23, 59, 59, 999);

    const reports = await OnTimeReg.find({
      date: { $gte: start, $lte: end }
    });

    // Initialize all woredas (01-14 + 15 for subcity)
    const allWoredas = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12', '13', '14', '15'];
    
    // Fetch all officers from local DB
    let officers = [];
    try {
      officers = await RemoteOfficer.find({ isActive: true }).select('hospitalName woreda');
    } catch (err) {
      console.error('Error fetching officers for report data:', err);
    }

    const stats = {
      byFacility: {},
      byWoreda: {},
      total: reports.length
    };

    // Helper to init stats object
    const initStats = () => ({
      'ልደት': { male: 0, female: 0, total: 0 },
      'ሞት': { male: 0, female: 0, total: 0 },
      'ፍቺ': { male: 0, female: 0, total: 0 },
      grandTotal: 0
    });

    // Initialize Woredas
    allWoredas.forEach(woreda => {
      stats.byWoreda[woreda] = initStats();
    });

    // Initialize Facilities
    officers.forEach(officer => {
      if (officer.hospitalName) {
        const normalized = officer.hospitalName.trim();
        if (!stats.byFacility[normalized]) {
          stats.byFacility[normalized] = {
             woreda: officer.woreda || 'Unknown',
             stats: initStats()
          };
        }
      }
    });

    // Aggregate Data
    reports.forEach(report => {
      const genderKey = report.gender === 'ወንድ' ? 'male' : 'female';
      const service = report.serviceName;

      // Normalize woreda (e.g. "4" -> "04")
      let woredaKey = report.woreda;
      if (woredaKey && woredaKey.length === 1 && /^\d$/.test(woredaKey)) {
          woredaKey = '0' + woredaKey;
      }

      // Woreda Stats
      if (stats.byWoreda[woredaKey]) {
          stats.byWoreda[woredaKey][service][genderKey]++;
          stats.byWoreda[woredaKey][service].total++;
          stats.byWoreda[woredaKey].grandTotal++;
      } else {
          // If woreda key is unknown (e.g. "Unknown" or outside range), consider adding it or logging
          // For now, we only track 01-15 as per requirement
      }
      
      // Facility Stats
      let facility = report.hospitalName || report.courtName || 'Unknown';
      facility = facility.trim();

      if (!stats.byFacility[facility]) {
          stats.byFacility[facility] = {
              woreda: woredaKey,
              stats: initStats()
          };
      }
      stats.byFacility[facility].stats[service][genderKey]++;
      stats.byFacility[facility].stats[service].total++;
      stats.byFacility[facility].stats.grandTotal++;
    });

    res.json(stats);

  } catch (error) {
    console.error('Error generating report data:', error);
    res.status(500).json({ error: 'Error generating report data' });
  }
};

// @desc    Update an OnTimeReg record and sync with Atlas and Report
// @route   PUT /api/ontime-reg/:id
// @access  Private/Admin
const updateRemoteReport = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // 1. Update Local OnTimeReg
    const localDoc = await OnTimeReg.findById(id);
    if (!localDoc) {
      return res.status(404).json({ message: 'Record not found in local database' });
    }

    // Capture old values for finding the related Report
    const oldRef = localDoc.referenceNumber;
    const oldWoreda = localDoc.woreda;

    Object.assign(localDoc, updateData);
    await localDoc.save();

    // 2. Update Local Report (if it exists)
    const targetService = await Service.findOne({ name: 'ወቅታዊ ምዝገባ' });
    if (targetService) {
      await Report.findOneAndUpdate(
        { 
          $or: [
            { remoteId: localDoc._id },
            { 
              referenceNo: oldRef, 
              woreda: oldWoreda, 
              serviceId: targetService._id 
            }
          ]
        },
        {
          referenceNo: localDoc.referenceNumber,
          woreda: localDoc.woreda,
          serviceCategory: localDoc.serviceName,
          date: localDoc.date,
          remoteId: localDoc._id // Ensure it's linked now
        }
      );
    }

    // 3. Update Atlas
    try {
      const RemoteModel = await getRemoteModel();
      await RemoteModel.findByIdAndUpdate(id, updateData);
    } catch (atlasErr) {
      console.warn('Failed to update Atlas, but local update succeeded:', atlasErr.message);
    }

    res.json({ message: 'Report updated across all databases successfully', data: localDoc });
  } catch (error) {
    console.error('Update error:', error);
    res.status(500).json({ message: 'Error updating report: ' + error.message });
  }
};

// @desc    Delete an OnTimeReg record and sync with Atlas and Report
// @route   DELETE /api/ontime-reg/:id
// @access  Private/Admin
const deleteRemoteReport = async (req, res) => {
  try {
    const { id } = req.params;

    // 1. Find Local Doc to get reference info
    const localDoc = await OnTimeReg.findById(id);
    if (!localDoc) {
      return res.status(404).json({ message: 'Record not found in local database' });
    }

    const { referenceNumber, woreda } = localDoc;

    // 2. Delete Local Report
    const targetService = await Service.findOne({ name: 'ወቅታዊ ምዝገባ' });
    if (targetService) {
      await Report.deleteOne({ 
        $or: [
            { remoteId: id },
            { 
                referenceNo: referenceNumber, 
                woreda: woreda, 
                serviceId: targetService._id 
            }
        ]
      });
    }

    // 3. Delete Local OnTimeReg
    await OnTimeReg.findByIdAndDelete(id);

    // 4. Delete From Atlas
    try {
      const RemoteModel = await getRemoteModel();
      await RemoteModel.findByIdAndDelete(id);
    } catch (atlasErr) {
      console.warn('Failed to delete from Atlas, but local deletion succeeded:', atlasErr.message);
    }

    res.json({ message: 'Report deleted from all databases successfully' });
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ message: 'Error deleting report: ' + error.message });
  }
};

// @desc    Get OnTimeReg by ID
// @route   GET /api/ontime-reg/:id
// @access  Private/Admin
const getRemoteReportById = async (req, res) => {
  try {
    const report = await OnTimeReg.findById(req.params.id);
    if (!report) {
      return res.status(404).json({ message: 'Report not found' });
    }
    res.json(report);
  } catch (error) {
    console.error('Error fetching OnTimeReg:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = { 
  getTodayStats, 
  getPDFReport, 
  getRemoteReportData,
  getRemoteReportById,
  updateRemoteReport,
  deleteRemoteReport
};
