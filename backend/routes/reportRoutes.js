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
router.get('/:id', authMiddleware, getReportById);
router.post('/', authMiddleware, createReport);
router.put('/:id', authMiddleware, updateReport);
router.delete('/:id', authMiddleware, authorizedRoles('Admin'), deleteReport);

// Public routes for display page
router.get('/public/reports', getPublicReports);
router.get('/public/reports/by-date-service', getPublicReportsByDateAndService);

module.exports = router;