const express = require('express');
const router = express.Router();
const { syncReports } = require('../utils/syncService');

// @desc    Manually trigger sync from Atlas
// @route   POST /api/sync/atlas
// @access  Admin only (should add auth middleware)
router.post('/atlas', async (req, res) => {
  try {
    console.log('Manual sync triggered by admin');
    await syncReports();
    res.json({ 
      success: true, 
      message: 'Sync completed successfully. Check console for details.' 
    });
  } catch (error) {
    console.error('Manual sync error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Sync failed', 
      error: error.message 
    });
  }
});

// @desc    Trigger sync repair
router.post('/atlas/repair', async (req, res) => {
  try {
    const { repairSync } = require('../utils/syncService');
    const result = await repairSync();
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// @desc    Trigger duplicate cleanup
router.post('/cleanup-duplicates', async (req, res) => {
  try {
    const { cleanupDuplicates } = require('../utils/syncService');
    const result = await cleanupDuplicates();
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// @desc    Push local reports to Atlas for public website
router.post('/atlas/push', async (req, res) => {
  try {
    const { pushLocalReportsToAtlas } = require('../utils/syncService');
    const result = await pushLocalReportsToAtlas();
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// @desc    Repair missing revenue data
router.post('/repair-revenue', async (req, res) => {
  try {
    const { repairRevenue } = require('../utils/syncService');
    const result = await repairRevenue();
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
