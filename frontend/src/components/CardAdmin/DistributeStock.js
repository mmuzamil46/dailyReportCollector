// frontend/src/components/CardAdmin/DistributeStock.js
import React, { useState } from 'react';
import { transferCardStock } from '../../services/api';

const DistributeStock = () => {
  const [formData, setFormData] = useState({
    serviceType: 'Birth',
    startSerial: '',
    endSerial: '',
    toWoreda: ''
  });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const services = ['Birth', 'Marriage', 'Death', 'Divorce', 'Adoption', 'Unmarried'];
  // Assuming 15 woredas or fetching dynamically would be better
  const woredas = Array.from({length: 15}, (_, i) => `Woreda ${String(i+1).padStart(2, '0')}`);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setError('');
    
    try {
      await transferCardStock(formData);
      setMessage('Stock transferred successfully!');
      setFormData({ ...formData, startSerial: '', endSerial: '' });
    } catch (err) {
      setError(err.response?.data?.message || 'Error transferring stock');
    }
  };

  return (
    <div className="card p-4">
      <h4>Distribute Stock to Woreda</h4>
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
          <label className="form-label">Target Woreda</label>
          <select 
            className="form-control"
            value={formData.toWoreda}
            onChange={(e) => setFormData({...formData, toWoreda: e.target.value})}
            required
          >
            <option value="">Select Woreda</option>
            {woredas.map(w => <option key={w} value={w}>{w}</option>)}
          </select>
        </div>
        <div className="row">
          <div className="col-md-6 mb-3">
            <label className="form-label">Start Serial</label>
            <input 
              type="number" 
              className="form-control" 
              value={formData.startSerial}
              onChange={(e) => setFormData({...formData, startSerial: e.target.value})}
              required
            />
          </div>
          <div className="col-md-6 mb-3">
            <label className="form-label">End Serial</label>
            <input 
              type="number" 
              className="form-control" 
              value={formData.endSerial}
              onChange={(e) => setFormData({...formData, endSerial: e.target.value})}
              required
            />
          </div>
        </div>
        <button type="submit" className="btn btn-primary">Transfer Stock</button>
      </form>
    </div>
  );
};

export default DistributeStock;
