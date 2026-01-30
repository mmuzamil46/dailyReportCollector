const bcrypt = require('bcryptjs');
const { connectToAtlas } = require('../utils/atlasConnection');
const { getRemoteOfficerModel } = require('../models/RemoteOfficer');

// @desc    Create a new officer in the Remote Database (Atlas)
// @route   POST /api/remote-officers
// @access  Private (Admin only)
const createRemoteOfficer = async (req, res) => {
  const { fullName, username, phone, password, woreda, role, hospitalName } = req.body;

  if (!fullName || !username || !password) {
    return res.status(400).json({ message: 'Please add all required fields' });
  }

  try {
    // 1. Get Connection
    const connection = await connectToAtlas();
    if (!connection) {
      return res.status(503).json({ message: 'Remote database connection unavailable' });
    }

    // 2. Get Model
    const RemoteOfficer = getRemoteOfficerModel(connection);

    // 3. Check if exists (Remote check)
    const officerExists = await RemoteOfficer.findOne({ username });
    if (officerExists) {
      return res.status(400).json({ message: 'Officer already exists in remote database' });
    }

    // 4. Hash password (Local computation)
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // 5. Create Officer (Remote save)
    const officer = await RemoteOfficer.create({
      fullName,
      username,
      phone,
      password: hashedPassword,
      woreda,
      role: role || 'User',
      hospitalName
    });

    if (officer) {
      // 6. Mirror locally for faster fetching in reports
      try {
        const RemoteOfficerLocal = require('../models/RemoteOfficer');
        await RemoteOfficerLocal.create({
          fullName: officer.fullName,
          username: officer.username,
          phone: officer.phone,
          password: officer.password, 
          woreda: officer.woreda,
          role: officer.role,
          hospitalName: officer.hospitalName,
          isActive: officer.isActive,
          atlasId: officer._id
        });
      } catch (localMirrorErr) {
        console.warn('Failed to mirror officer locally, but remote creation succeeded:', localMirrorErr.message);
      }

      res.status(201).json({
        _id: officer.id,
        username: officer.username,
        fullName: officer.fullName,
        message: 'Remote Officer created successfully and mirrored locally'
      });
    } else {
      res.status(400).json({ message: 'Invalid officer data' });
    }

  } catch (error) {
    console.error('Error creating remote officer:', error);
    res.status(500).json({ message: 'Server error while creating remote officer' });
  }
};

module.exports = { createRemoteOfficer };
