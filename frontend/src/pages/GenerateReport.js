import React, { useState, useContext, useEffect } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import 'bootstrap/dist/css/bootstrap.min.css';

function GenerateReport() {
  const { user, token } = useContext(AuthContext);
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Redirect non-adminsgtf
  useEffect(() => {
    if (!user || user.role === 'User') {
      navigate('/login');
    }
  }, [user, navigate]);

  const handleGenerateReport = async () => {
    setLoading(true);
    setError('');

    try {
      const formattedDate = selectedDate.toISOString().split('T')[0]; // YYYY-MM-DD
      const config = {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob',
      };

      const response = await axios.get(`http://localhost:1000/api/reports/generate-pdf?date=${formattedDate}`, config);

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `ዕለታዊ_ሪፖርት_${formattedDate}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error('Error generating report:', err);
      setError(err.response?.data?.message || 'Failed to generate report');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mt-5 text-white">
      <h2 className="mb-4 text-center">ዕለታዊ ሪፖርት ማመንጨት</h2>
      {error && <div className="alert alert-danger">{error}</div>}
      <div className="card p-4 shadow-sm">
        <div className="mb-3">
          <label htmlFor="datePicker" className="form-label">ቀን ይምረጡ</label>
          <DatePicker
            id="datePicker"
            selected={selectedDate}
            onChange={(date) => setSelectedDate(date)}
            dateFormat="yyyy-MM-dd"
            className="form-control"
            wrapperClassName="w-100"
          />
        </div>
        <div className="text-center">
          <button
            onClick={handleGenerateReport}
            className="btn btn-primary"
            disabled={loading}
          >
            {loading ? 'በማመንጨት ላይ...' : 'ሪፖርት ያመንጩ'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default GenerateReport;