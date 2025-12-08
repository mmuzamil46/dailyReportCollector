// Updated DailyWoredaReport.js
import React, { useState, useContext, useEffect } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import 'bootstrap/dist/css/bootstrap.min.css';
import axios from 'axios';

function DailyWoredaReport() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedWoreda, setSelectedWoreda] = useState('');
  const [woredas, setWoredas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Redirect if no user
  useEffect(() => {
    if (!user) {
      navigate('/login');
    }
  }, [user, navigate]);

  // Fetch woredas based on role
  useEffect(() => {
    const fetchWoredas = async () => {
      try {
        const config = {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        };
        const response = [1,3,4,5,6,8,9,10,11,12,13,14,15];
        setWoredas(response);
        // Preselect if user has woreda or first one for admin
        if (user.woreda) {
          setSelectedWoreda(user.woreda);
        } else if (response.length > 0) {
          setSelectedWoreda(response[0]);
        }
      } catch (err) {
        console.error('Error fetching woredas:', err);
        setError('Failed to load woredas');
      }
    };

    if (user) {
      fetchWoredas();
    }
  }, [user]);

  const handleGenerateReport = async () => {
    if (!selectedWoreda) {
      setError('Please select a woreda');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const formattedDate = selectedDate.toISOString().split('T')[0];
      const config = {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        responseType: 'blob',
      };

      const response = await axios.get(`/api/reports/daily-pdf?woreda=${selectedWoreda}&date=${formattedDate}`, config);

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `daily_report_${selectedWoreda}_${formattedDate}.pdf`);
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
const showWoredaDropdown = user && (user.role === 'Admin' || user.role === 'Staff');
  return (
    <div className="container mt-5">
      <h2 className="mb-4 text-center">Generate Daily Woreda Report</h2>
      {error && <div className="alert alert-danger">{error}</div>}
      <div className="card p-4 shadow-sm">
       {showWoredaDropdown && (
          <div className="mb-3">
            <label htmlFor="woredaSelect" className="form-label">Select Woreda</label>
            <select
              id="woredaSelect"
              className="form-select"
              value={selectedWoreda}
              onChange={(e) => setSelectedWoreda(e.target.value)}
              disabled={loading}
            >
              <option value="">-- Select Woreda --</option>
              {woredas.map((woreda) => (
                <option key={woreda} value={woreda}>
                  {woreda}
                </option>
              ))}
            </select>
          </div>
        )}
        <div className="mb-3">
          <label htmlFor="datePicker" className="form-label">Select Date</label>
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
            disabled={loading || !selectedWoreda}
          >
            {loading ? 'Generating...' : 'Generate PDF Report'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default DailyWoredaReport;