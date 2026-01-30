const express = require('express');
const router = express.Router();
const { createRemoteOfficer } = require('../controller/remoteOfficerController');
// const authMiddleware = require('../middleware/auth'); // Uncomment if you want to protect this

// Ideally protect this route so only local Admins can create remote officers
// router.use(authMiddleware);

router.post('/', createRemoteOfficer);

module.exports = router;
