import React, { useState, useContext, useEffect } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import 'bootstrap/dist/css/bootstrap.min.css';

function GenerateReport() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const ethiopianMonths = [
    'መስከረም', 'ጥቅምት', 'ኅዳር', 'ታህሳስ', 'ጥር', 'የካቲት', 
    'መጋቢት', 'ሚያዝያ', 'ግንቦት', 'ሰኔ', 'ሐምሌ', 'ነሐሴ', 'ጳጉሜ'
  ];

  // Simple Ethiopian Date conversion for UI display
  const toEthiopianDate = (gregorianDate) => {
    try {
      const date = new Date(gregorianDate);
      const gregYear = date.getFullYear();
      const gregMonth = date.getMonth() + 1;
      const gregDay = date.getDate();

      let ethYear = gregYear - 8;
      const newYearDay = (gregYear % 4 === 0) ? 12 : 11;
      
      if (gregMonth > 9 || (gregMonth === 9 && gregDay < newYearDay)) {
        ethYear++;
      }
      
      let ethMonth, ethDay;
      const sept11 = new Date(gregYear, 8, newYearDay);
      const diffTime = date - sept11;
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays >= 0) {
        ethMonth = Math.floor(diffDays / 30) + 1;
        ethDay = (diffDays % 30) + 1;
      } else {
        const prevSept11 = new Date(gregYear - 1, 8, (gregYear - 1) % 4 === 0 ? 12 : 11);
        const prevDiffDays = Math.floor((date - prevSept11) / (1000 * 60 * 60 * 24));
        ethMonth = Math.floor(prevDiffDays / 30) + 1;
        ethDay = (prevDiffDays % 30) + 1;
      }
      
      if (ethMonth === 13) {
        const daysInPagume = (ethYear % 4 === 3) ? 6 : 5;
        if (ethDay > daysInPagume) {
          ethMonth = 1;
          ethDay = 1;
          ethYear++;
        }
      }

      return {
        year: ethYear,
        month: ethMonth,
        day: ethDay,
        monthName: ethiopianMonths[ethMonth - 1] || 'መስከረም'
      };
    } catch (error) {
      return null;
    }
  };

  const formatEthDate = (d) => {
    const eth = toEthiopianDate(d);
    if (!eth) return '';
    return `${eth.monthName} ${eth.day}, ${eth.year}`;
  };

  // No internal redirection needed as App.js handles ProtectedRoute
  useEffect(() => {
    // Component cleanup or initial data fetching if needed
  }, []);

  const handleGenerateReport = async () => {
    setLoading(true);
    setError('');

    try {
      const start = startDate.toISOString().split('T')[0];
      const end = endDate.toISOString().split('T')[0];
      
      const config = {
        responseType: 'blob',
      };

      const response = await api.get(`/reports/generate-pdf?startDate=${start}&endDate=${end}`, config);

      if (response.data.type === 'application/json') {
        const text = await response.data.text();
        const errorData = JSON.parse(text);
        setError(errorData.message || 'Failed to generate report');
        setLoading(false);
        return;
      }

      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `ሪፖርት_${start}_እስከ_${end}.pdf`);
      document.body.appendChild(link);
      link.click();
      
      setTimeout(() => {
        window.URL.revokeObjectURL(url);
        link.remove();
      }, 100);

    } catch (err) {
      console.error('Error generating report:', err);
      if (err.response?.data instanceof Blob) {
        const text = await err.response.data.text();
        try {
          const errorData = JSON.parse(text);
          setError(errorData.message || 'Failed to generate report');
        } catch (e) {
          setError('Failed to generate report');
        }
      } else {
        setError(err.response?.data?.message || 'Failed to generate report');
      }
    } finally {
      setLoading(false);
    }
  };

  const isWoredaUser = user?.role !== 'Admin' && user?.woreda;

  return (
    <div className="container mt-5 text-white">
      <h2 className="mb-4 text-center">
        {isWoredaUser ? `የወረዳ ${user.woreda} ሪፖርት ማመንጨት` : 'ጠቅላላ የክፍለ ከተማ ሪፖርት ማመንጨት'}
      </h2>
      
      {error && <div className="alert alert-danger">{error}</div>}
      
      <div className="card p-4 shadow-sm bg-dark text-white border-secondary">
        <div className="row">
          <div className="col-md-6 mb-3">
            <label className="form-label">የመጀመሪያ ቀን (Start Date)</label>
            <DatePicker
              selected={startDate}
              onChange={(date) => setStartDate(date)}
              dateFormat="yyyy-MM-dd"
              className="form-control"
              wrapperClassName="w-100"
            />
            <div className="mt-2 text-info small">
              የኢትዮጵያ ቀን፡ {formatEthDate(startDate)}
            </div>
          </div>
          <div className="col-md-6 mb-3">
            <label className="form-label">የመጨረሻ ቀን (End Date)</label>
            <DatePicker
              selected={endDate}
              onChange={(date) => setEndDate(date)}
              dateFormat="yyyy-MM-dd"
              className="form-control"
              wrapperClassName="w-100"
            />
            <div className="mt-2 text-info small">
              የኢትዮጵያ ቀን፡ {formatEthDate(endDate)}
            </div>
          </div>
        </div>

        <div className="mt-4 p-3 bg-secondary rounded text-center">
          <p className="mb-0">ከ <strong>{formatEthDate(startDate)}</strong> እስከ <strong>{formatEthDate(endDate)}</strong> የሚሆን ሪፖርት ይዘጋጃል።</p>
        </div>

        <div className="text-center mt-4">
          <button
            onClick={handleGenerateReport}
            className="btn btn-primary btn-lg"
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                በማመንጨት ላይ...
              </>
            ) : 'ሪፖርት ያመንጩ (Generate PDF)'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default GenerateReport;