// frontend/src/components/CardAdmin/AddStock.js
import React, { useState } from 'react';
import { addCardStock } from '../../services/api';

const AddStock = () => {
  const [formData, setFormData] = useState({
    serviceType: 'Birth', // Default
    startSerial: '',
    endSerial: '',
  });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const services = ['Birth', 'Marriage', 'Death', 'Divorce', 'Adoption', 'Unmarried'];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setError('');
    
    try {
      await addCardStock(formData);
      setMessage('Stock added successfully!');
      setFormData({ ...formData, startSerial: '', endSerial: '' });
    } catch (err) {
      setError(err.response?.data?.message || 'Error adding stock');
    }
  };

  return (
    <div className="card p-4">
      <h4>Add New Bulk Stock (Subcity)</h4>
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
        <button type="submit" className="btn btn-primary">Add Stock</button>
      </form>
    </div>
  );
};

export default AddStock;
