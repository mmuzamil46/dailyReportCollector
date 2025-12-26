const express = require('express');
const router = express.Router();
const notificationController = require('../controller/notificationController');
const authMiddleware = require('../middleware/auth');
const authorizedRoles = require('../middleware/authorizedRoles');

// Apply auth middleware to all routes
router.use(authMiddleware);

// Get notifications (Common for all roles)
router.get('/', notificationController.getNotifications);

// Create notification (Admin and Staff only)
router.post('/', authorizedRoles('Admin', 'Staff'), notificationController.createNotification);

// Update notification (Admin and Staff only)
router.put('/:id', authorizedRoles('Admin', 'Staff'), notificationController.updateNotification);

// Delete notification (Admin and Staff only)
router.delete('/:id', authorizedRoles('Admin', 'Staff'), notificationController.deleteNotification);

// Mark as read (Common)
router.put('/:id/read', notificationController.markAsRead);

module.exports = router;
