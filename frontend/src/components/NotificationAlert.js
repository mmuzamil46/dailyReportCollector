import React, { useState, useEffect, useContext } from 'react';
import api from '../services/api';
import { AuthContext } from '../context/AuthContext';

function NotificationAlert() {
  const [notifications, setNotifications] = useState([]);
  const { user } = useContext(AuthContext);

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const response = await api.get('/notifications');
        // Filter for unread ones (handle both ID strings and populated objects)
        const unread = response.data.filter(n => {
          return !n.readBy.some(read => {
            const readId = typeof read === 'string' ? read : read._id;
            return readId === user.id;
          });
        });
        setNotifications(unread);
      } catch (err) {
        console.error('Error fetching notifications:', err);
      }
    };

    if (user) {
      fetchNotifications();
      // Set up polling or socket.io here if real-time is needed
      const interval = setInterval(fetchNotifications, 60000); // Poll every minute
      return () => clearInterval(interval);
    }
  }, [user]);

  const handleMarkAsRead = async (id) => {
    try {
      await api.put(`/notifications/${id}/read`);
      setNotifications(notifications.filter(n => n._id !== id));
    } catch (err) {
      console.error('Error marking as read:', err);
    }
  };

  if (notifications.length === 0) return null;

  return (
    <div className="notification-container sticky-top w-100" style={{ zIndex: 1050 }}>
      {notifications.map((n) => (
        <div key={n._id} className="alert alert-warning alert-dismissible fade show mb-0 border-0 rounded-0 shadow-sm" role="alert">
          <div className="container d-flex justify-content-between align-items-center">
            <div>
              <strong>ማሳሰቢያ (Notification):</strong> {n.message}
              <small className="ms-3 text-muted">
                {new Date(n.createdAt).toLocaleString()}
              </small>
            </div>
            <button 
              type="button" 
              className="btn btn-sm btn-outline-dark" 
              onClick={() => handleMarkAsRead(n._id)}
            >
              አንብቤዋለሁ (Mark as Read)
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

export default NotificationAlert;
