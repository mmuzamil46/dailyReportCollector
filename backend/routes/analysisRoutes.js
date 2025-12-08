// routes/analysisRoutes.js
const express = require('express');
const {
  getPlanVsReportAnalysis,
  getWoredaDetailedAnalysis
} = require('../controller/analysisController');
const authMiddleware = require('../middleware/auth');
const authorizedRoles = require('../middleware/authorizedRoles');

const router = express.Router();

router.get('/plan-vs-report', authMiddleware, authorizedRoles('Admin', 'Staff'), getPlanVsReportAnalysis);
router.get('/woreda/:woreda', authMiddleware, authorizedRoles('Admin', 'Staff'), getWoredaDetailedAnalysis);

module.exports = router;