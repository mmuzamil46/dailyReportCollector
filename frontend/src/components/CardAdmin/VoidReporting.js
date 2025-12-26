// frontend/src/components/CardAdmin/VoidReporting.js
import React, { useState } from 'react';
import { reportVoidCard } from '../../services/api';

const VoidReporting = () => {
  const [formData, setFormData] = useState({
    serviceType: 'Birth',
    serialNumber: '',
    reason: ''
  });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const services = ['Birth', 'Marriage', 'Death', 'Divorce', 'Adoption', 'Unmarried'];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setError('');
    
    try {
      await reportVoidCard(formData);
      setMessage('Void card reported successfully!');
      setFormData({ ...formData, serialNumber: '', reason: '' });
    } catch (err) {
      setError(err.response?.data?.message || 'Error reporting void card');
    }
  };

  return (
    <div className="card p-4">
      <h4>Report Void/Error Card</h4>
      {message && <div className="alert alert-success">{message}</div>}
      {error && <div className="alert alert-danger">{error}</div>}
      
      <form onSubmit={handleSubmit}>
        <div className="mb-3">
          <label className="form-label">Service Type</label>
          <select 
            className="form-control"
            value={formData.serviceType}
            onChange={(e) => setFormData({...formData, serviceType: e.target.value})}
          >
            {services.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div className="mb-3">
          <label className="form-label">Serial Number</label>
          <input 
            type="text" 
            className="form-control" 
            value={formData.serialNumber}
            onChange={(e) => setFormData({...formData, serialNumber: e.target.value})}
            required
            placeholder="e.g. 1005"
          />
        </div>
        <div className="mb-3">
          <label className="form-label">Reason</label>
          <textarea 
            className="form-control" 
            value={formData.reason}
            onChange={(e) => setFormData({...formData, reason: e.target.value})}
            required
            placeholder="e.g. Printer error, Torn paper..."
          />
        </div>
        <button type="submit" className="btn btn-danger">Report Void</button>
      </form>
    </div>
  );
};

export default VoidReporting;
