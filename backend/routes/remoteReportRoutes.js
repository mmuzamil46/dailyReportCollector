const express = require('express');
const router = express.Router();
const { createRemoteReport } = require('../controller/remoteReportController');
const { getTodayStats, getPDFReport, getRemoteReportData, getRemoteReportById, updateRemoteReport, deleteRemoteReport } = require('../controller/onTimeRegController');

router.post('/', createRemoteReport);
router.get('/stats/today', getTodayStats);
router.get('/report/pdf', getPDFReport);
router.get('/report/data', getRemoteReportData);
router.get('/:id', getRemoteReportById);
router.put('/:id', updateRemoteReport);
router.delete('/:id', deleteRemoteReport);

module.exports = router;
