const express = require('express');
const router = express.Router();
const cardController = require('../controller/cardController');
const protect = require('../middleware/auth');

// Define routes
// Protect all routes
router.use(protect);

router.post('/stock', cardController.addStock);
router.post('/transfer', cardController.transferStock);
router.post('/void', cardController.reportVoid);
router.get('/stats', cardController.getStats);
router.get('/dashboard', cardController.getDashboardData);

module.exports = router;
