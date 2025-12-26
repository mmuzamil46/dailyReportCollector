const Notification = require('../models/Notification');

// Create a new notification
exports.createNotification = async (req, res) => {
  try {
    const { message, targetWoreda } = req.body;
    const notification = new Notification({
      message,
      targetWoreda,
      sender: req.user.id
    });
    await notification.save();
    res.status(201).json(notification);
  } catch (error) {
    res.status(500).json({ message: 'Error creating notification', error: error.message });
  }
};

// Get notifications for the logged-in user
exports.getNotifications = async (req, res) => {
  try {
    const isAdmin = req.user.role === 'Admin' || req.user.role === 'Staff';
    let query = {};
    
    if (!isAdmin) {
      query = {
        $or: [
          { targetWoreda: null },
          { targetWoreda: '' },
          { targetWoreda: req.user.woreda }
        ]
      };
    }

    let notificationsQuery = Notification.find(query)
      .populate('sender', 'name username')
      .sort({ createdAt: -1 });

    if (isAdmin) {
      notificationsQuery = notificationsQuery.populate('readBy', 'username fullName woreda');
    }

    const notifications = await notificationsQuery;
    res.json(notifications);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching notifications', error: error.message });
  }
};

// Update a notification
exports.updateNotification = async (req, res) => {
  try {
    const { message, targetWoreda } = req.body;
    const notification = await Notification.findById(req.params.id);
    
    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    notification.message = message || notification.message;
    notification.targetWoreda = targetWoreda !== undefined ? targetWoreda : notification.targetWoreda;
    
    await notification.save();
    res.json(notification);
  } catch (error) {
    res.status(500).json({ message: 'Error updating notification', error: error.message });
  }
};

// Delete a notification
exports.deleteNotification = async (req, res) => {
  try {
    const notification = await Notification.findByIdAndDelete(req.params.id);
    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }
    res.json({ message: 'Notification deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting notification', error: error.message });
  }
};

// Mark a notification as read
exports.markAsRead = async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);
    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }
    if (!notification.readBy.includes(req.user.id)) {
      notification.readBy.push(req.user.id);
      await notification.save();
    }
    res.json(notification);
  } catch (error) {
    res.status(500).json({ message: 'Error marking notification as read', error: error.message });
  }
};
