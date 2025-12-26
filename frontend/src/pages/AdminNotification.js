import React, { useState, useEffect } from 'react';
import api from '../services/api';

function AdminNotification() {
  const [message, setMessage] = useState('');
  const [targetWoreda, setTargetWoreda] = useState('');
  const [woredas, setWoredas] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [showReadBy, setShowReadBy] = useState(null); // ID of notification to show readBy for

  const fetchData = async () => {
    try {
      const [woredaRes, notifyRes] = await Promise.all([
        api.get('/reports/woredas'),
        api.get('/notifications')
      ]);
      setWoredas(woredaRes.data || []);
      setNotifications(notifyRes.data || []);
    } catch (err) {
      console.error('Error fetching data:', err);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setSuccess('');
    setError('');

    try {
      if (editingId) {
        await api.put(`/notifications/${editingId}`, {
          message,
          targetWoreda: targetWoreda || null
        });
        setSuccess('ማሳሰቢያው ተሻሽሏል (Notification updated)');
      } else {
        await api.post('/notifications', {
          message,
          targetWoreda: targetWoreda || null
        });
        setSuccess('ማሳሰቢያው ተልኳል (Notification sent)');
      }
      setMessage('');
      setTargetWoreda('');
      setEditingId(null);
      fetchData();
    } catch (err) {
      setError('ክንውኑ አልተሳካም (Operation failed)');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (n) => {
    setEditingId(n._id);
    setMessage(n.message);
    setTargetWoreda(n.targetWoreda || '');
    window.scrollTo(0, 0);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this notification?')) return;
    try {
      await api.delete(`/notifications/${id}`);
      fetchData();
    } catch (err) {
      setError('መሰረዝ አልተቻለም (Delete failed)');
    }
  };

  const cancelEdit = () => {
    setEditingId(null);
    setMessage('');
    setTargetWoreda('');
  };

  return (
    <div className="container mt-5 text-white pb-5">
      <h2 className="mb-4 text-center">የማሳሰቢያዎች አስተዳደር (Notification Management)</h2>
      
      {success && <div className="alert alert-success">{success}</div>}
      {error && <div className="alert alert-danger">{error}</div>}

      <div className="row">
        {/* Form Section */}
        <div className="col-md-5">
          <div className="card p-4 bg-dark text-white border-secondary shadow sticky-top" style={{ top: '20px' }}>
            <h4>{editingId ? 'ማሳሰቢያ ማስተካከል (Edit)' : 'አዲስ ማሳሰቢያ መላክ (New)'}</h4>
            <form onSubmit={handleSubmit} className="mt-3">
              <div className="mb-3">
                <label className="form-label">ማሳሰቢያ (Message)</label>
                <textarea
                  className="form-control"
                  rows="4"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="መልዕክትዎን እዚህ ያስገቡ..."
                  required
                ></textarea>
              </div>

              <div className="mb-3">
                <label className="form-label">ተቀባይ ወረዳ (Target Woreda)</label>
                <select
                  className="form-select"
                  value={targetWoreda}
                  onChange={(e) => setTargetWoreda(e.target.value)}
                >
                  <option value="">ሁሉም ወረዳዎች (All Woredas)</option>
                  {woredas.map((w) => (
                    <option key={w} value={w}>ወረዳ {w}</option>
                  ))}
                </select>
              </div>

              <div className="d-grid gap-2">
                <button type="submit" className="btn btn-primary" disabled={loading || !message}>
                  {loading ? 'በመላክ ላይ...' : (editingId ? 'አድስ (Update)' : 'ላክ (Send)')}
                </button>
                {editingId && (
                  <button type="button" className="btn btn-outline-light" onClick={cancelEdit}>
                    አቁም (Cancel)
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>

        {/* List Section */}
        <div className="col-md-7">
          <h4 className="mb-3">የተላኩ ማሳሰቢያዎች (Sent Notifications)</h4>
          {notifications.map((n) => (
            <div key={n._id} className="card mb-3 bg-secondary text-white border-0 shadow-sm">
              <div className="card-body">
                <div className="d-flex justify-content-between align-items-start mb-2">
                  <span className="badge bg-warning text-dark">
                    {n.targetWoreda ? `ወረዳ ${n.targetWoreda}` : 'ለአጠቃላይ (Public)'}
                  </span>
                  <small>{new Date(n.createdAt).toLocaleString()}</small>
                </div>
                <p className="card-text">{n.message}</p>
                <hr className="bg-white" />
                <div className="d-flex justify-content-between align-items-center">
                  <div>
                    <button className="btn btn-sm btn-info me-2" onClick={() => handleEdit(n)}>አስተካክል (Edit)</button>
                    <button className="btn btn-sm btn-danger" onClick={() => handleDelete(n._id)}>ሰርዝ (Delete)</button>
                  </div>
                  <button 
                    className="btn btn-sm btn-light" 
                    onClick={() => setShowReadBy(showReadBy === n._id ? null : n._id)}
                  >
                    ያነበቡት ({n.readBy?.length || 0})
                  </button>
                </div>

                {showReadBy === n._id && (
                  <div className="mt-3 p-2 bg-dark rounded">
                    <h6>ያነበቡ ሰዎች (Read By):</h6>
                    {n.readBy?.length > 0 ? (
                      <ul className="list-unstyled mb-0 smal">
                        {n.readBy.map(u => (
                          <li key={u._id} className="border-bottom border-secondary py-1">
                             {u.fullName || u.username} - {u.woreda ? `ወረዳ ${u.woreda}` : 'Subcity'}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <small className="text-muted">ገና ማንም አላነበበውም (No one read yet)</small>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default AdminNotification;
