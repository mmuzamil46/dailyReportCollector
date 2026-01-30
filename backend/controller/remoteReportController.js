const OnTimeReg = require('../models/OnTimeReg');

// @desc    Create a new remote report (OnTimeReg)
// @route   POST /api/ontime-reg
// @access  Public (or protected if you add auth)
const createRemoteReport = async (req, res) => {
  try {
    const { serviceName, referenceNumber, gender, woreda, hospitalName, courtName, date } = req.body;

    // Basic Validation
    if (!serviceName || !referenceNumber || !gender || !woreda) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const newReport = new OnTimeReg({
      serviceName,
      referenceNumber,
      gender,
      woreda,
      hospitalName,
      courtName,
      date: date || new Date()
    });

    const savedReport = await newReport.save();
    res.status(201).json(savedReport);
  } catch (error) {
    console.error('Error creating remote report:', error);
    res.status(500).json({ message: 'Server error while creating remote report' });
  }
};

module.exports = { createRemoteReport };
