const express = require('express');
const {
  getServices,
  getServiceById,
  createService,
  updateService,
  deleteService,
} = require('../controller/serviceController');
const authMiddleware = require('../middleware/auth');
const authorizedRoles = require('../middleware/authorizedRoles');

const router = express.Router();

router.get('/',  getServices);
router.get('/:id', getServiceById);
router.post('/', authMiddleware, authorizedRoles('Admin'), createService);
router.put('/:id', authMiddleware, authorizedRoles('Admin'), updateService);
router.delete('/:id', authMiddleware, authorizedRoles('Admin'), deleteService);

module.exports = router;