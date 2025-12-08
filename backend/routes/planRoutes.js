const express = require('express');
const {
  upsertPlan,
  getPlanSummary,
  getPlanByWoredaAndYear,
} = require('../controller/planController');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

router.post('/', authMiddleware, upsertPlan);
router.get('/summary', authMiddleware, getPlanSummary);
router.get('/:woreda/:year', authMiddleware, getPlanByWoredaAndYear);

module.exports = router;