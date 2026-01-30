const express = require('express');
const {
  getAllReports,
  getReportById,
  createReport,
  updateReport,
  deleteReport,
  getReportsByDateAndService,
  getPublicReports, // New public endpoint
  getPublicReportsByDateAndService, // New public endpoint
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
} = require('../controller/reportController');
const authMiddleware = require('../middleware/auth');
const authorizedRoles = require('../middleware/authorizedRoles');

const router = express.Router();

// Protected routes - updated to allow both Admin and Staff
router.get('/', authMiddleware, getAllReports);
router.get('/by-date-service', authMiddleware, getReportsByDateAndService);
router.get('/generate-pdf', authMiddleware, authorizedRoles('Admin', 'Staff', 'User'), generatePDFReport);
router.get('/daily-pdf', authMiddleware, generateWoredaPDFReport);
router.get('/woredas', authMiddleware, getWoredas);
router.get('/summary/today', authMiddleware, getTodaySummary);
router.get('/summary/progress', authMiddleware, getDailyServiceProgress);
router.get('/:id', authMiddleware, getReportById);
router.post('/', authMiddleware, createReport);
router.put('/:id', authMiddleware, updateReport);
router.delete('/:id', authMiddleware, authorizedRoles('Admin'), deleteReport);

// Public routes for display page
router.get('/public/reports', getPublicReports);
router.get('/public/reports/by-date-service', getPublicReportsByDateAndService);
router.get('/public/summary/today', getPublicTodaySummary);
router.get('/public/summary/progress', getPublicDailyProgress);
router.get('/public/winner/latest', getLatestWinner);
router.get('/public/user-summary', getStandaloneUserSummary);
router.get('/public/sync/aggregate-stats', getPublicAggregateStats);
router.get('/public/woreda-ranking', getPublicWoredaRanking);

// Admin route to trigger calculation and announcement
router.post('/winner/announce', authMiddleware, authorizedRoles('Admin', 'Staff'), announceDailyWinner);

// Admin route to fix existing report prices
router.post('/fix-prices', authMiddleware, authorizedRoles('Admin'), fixReportPrices);

// Aggregate sync routes
router.post('/sync/aggregate', authMiddleware, authorizedRoles('Admin', 'Staff'), syncAggregateStats);
router.get('/sync/aggregate/status', authMiddleware, authorizedRoles('Admin', 'Staff'), getAggregateStatsStatus);
router.get('/sync/atlas-stats', authMiddleware, authorizedRoles('Admin', 'Staff'), getAtlasStats);
router.get('/sync/scheduler/status', authMiddleware, authorizedRoles('Admin', 'Staff'), getSchedulerStatus);
router.post('/sync/force', authMiddleware, authorizedRoles('Admin', 'Staff'), forceSync);

module.exports = router;