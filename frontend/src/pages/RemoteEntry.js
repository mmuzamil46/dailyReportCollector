import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './RemoteEntry.css';

const RemoteEntry = () => {
  const [selectedType, setSelectedType] = useState(null);
  const [formData, setFormData] = useState({
    referenceNumber: '',
    gender: '',
    woreda: '',
    hospitalName: '',
    courtName: '',
    date: new Date().toISOString().split('T')[0]
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const navigate = useNavigate();

  const handleTypeSelect = (type) => {
    setSelectedType(type);
    setMessage('');
    setFormData(prev => ({ ...prev, referenceNumber: '', gender: '' }));
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      // In a real deployed remote app, this URL would point to the Cloud Backend.
      // For this user's context (Assuming they might deploy this frontend separately or use the same codebase),
      // we'll assume the API endpoint matches the OnTimeReg controller we haven't created yet?
      // Wait, we didn't create an endpoint for OnTimeReg in the tasks!
      // We need to create the endpoint for this form to submit to.
      // I will assume for now we post to /api/ontime-reg (need to implement).
      
      const payload = {
        serviceName: selectedType,
        ...formData
      };

      // Since we are running locally to test, we need to create this route locally too.
      await axios.post('http://localhost:3000/api/ontime-reg', payload); // Adjust URL as needed

      setMessage('በተሳካ ሁኔታ ተመዝግቧል (Registered Successfully)!');
      setTimeout(() => {
        setSelectedType(null); // Reset to main screen
        setFormData({ ...formData, referenceNumber: '', gender: '' });
        setMessage('');
      }, 2000);

    } catch (error) {
      console.error('Error submitting report:', error);
      setMessage('ስህተት ተፈጥሯል (Error occurred).');
    } finally {
      setLoading(false);
    }
  };

  if (!selectedType) {
    return (
      <div className="remote-container">
        <h1>Remote Reporting</h1>
        <div className="button-grid">
          <button className="large-btn birth" onClick={() => handleTypeSelect('ልደት')}>
            <span className="icon">👶</span>
            <span className="label">ልደት (Birth)</span>
          </button>
          <button className="large-btn death" onClick={() => handleTypeSelect('ሞት')}>
            <span className="icon">⚰️</span>
            <span className="label">ሞት (Death)</span>
          </button>
          <button className="large-btn divorce" onClick={() => handleTypeSelect('ፍቺ')}>
            <span className="icon">💔</span>
            <span className="label">ፍቺ (Divorce)</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="remote-container form-view">
      <div className="header">
        <button className="back-btn" onClick={() => setSelectedType(null)}>← Back</button>
        <h2>{selectedType} መመዝገቢያ</h2>
      </div>

      {message && <div className={`message ${message.includes('Error') ? 'error' : 'success'}`}>{message}</div>}

      <form onSubmit={handleSubmit} className="remote-form">
        <div className="form-group">
            <label>ቀን (Date)</label>
            <input 
                type="date" 
                name="date" 
                value={formData.date} 
                onChange={handleChange} 
                required 
            />
        </div>

        <div className="form-group">
          <label>የመዝገብ ቁጥር (Reference No)</label>
          <input
            type="text"
            name="referenceNumber"
            value={formData.referenceNumber}
            onChange={handleChange}
            required
            placeholder="Enter reference number"
            className="large-input"
          />
        </div>

        <div className="form-group">
          <label>ጾታ (Gender)</label>
          <div className="radio-group">
            <label className={`radio-btn ${formData.gender === 'ወንድ' ? 'selected' : ''}`}>
              <input
                type="radio"
                name="gender"
                value="ወንድ"
                checked={formData.gender === 'ወንድ'}
                onChange={handleChange}
                required
              />
              ወንድ (Male)
            </label>
            <label className={`radio-btn ${formData.gender === 'ሴት' ? 'selected' : ''}`}>
              <input
                type="radio"
                name="gender"
                value="ሴት"
                checked={formData.gender === 'ሴት'}
                onChange={handleChange}
                required
              />
              ሴት (Female)
            </label>
          </div>
        </div>

        <div className="form-group">
            <label>ወረዳ (Woreda)</label>
            <input 
                type="text" 
                name="woreda" 
                value={formData.woreda} 
                onChange={handleChange} 
                required 
                placeholder="Enter Woreda"
            />
        </div>

        {(selectedType === 'ልደት' || selectedType === 'ሞት') && (
          <div className="form-group">
            <label>የጤና ተቋም ስም (Hospital Name)</label>
            <input
              type="text"
              name="hospitalName"
              value={formData.hospitalName}
              onChange={handleChange}
              placeholder="Enter Hospital Name"
            />
          </div>
        )}

        {selectedType === 'ፍቺ' && (
          <div className="form-group">
            <label>የፍርድ ቤት ስም (Court Name)</label>
            <input
              type="text"
              name="courtName"
              value={formData.courtName}
              onChange={handleChange}
              placeholder="Enter Court Name"
            />
          </div>
        )}

        <button type="submit" className="submit-btn" disabled={loading}>
          {loading ? 'እየመዘገበ ነው...' : 'መዝግብ (Submit)'}
        </button>
      </form>
    </div>
  );
};

export default RemoteEntry;
