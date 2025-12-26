// frontend/src/components/CardAdmin/StockReport.js
import React, { useState, useEffect } from 'react';
import { getCardStats } from '../../services/api';

const StockReport = () => {
  const [filters, setFilters] = useState({
    startDate: '', // defaults to all time if empty? Or this month?
    endDate: '',
    woreda: '',
    serviceType: ''
  });
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);

  const services = ['Birth', 'Marriage', 'Death', 'Divorce', 'Adoption', 'Unmarried'];
  const woredas = Array.from({length: 15}, (_, i) => `Woreda ${String(i+1).padStart(2, '0')}`);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const res = await getCardStats(filters);
      setStats(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []); // Initial load

  const handleFilterChange = (e) => {
     setFilters({...filters, [e.target.name]: e.target.value});
  };

  return (
    <div className="card p-4">
      <h4>Card Utilization Report</h4>
      
      {/* Filters */}
      <div className="row mb-4">
        <div className="col-md-3">
          <label>Start Date</label>
          <input type="date" className="form-control" name="startDate" onChange={handleFilterChange} />
        </div>
        <div className="col-md-3">
          <label>End Date</label>
          <input type="date" className="form-control" name="endDate" onChange={handleFilterChange} />
        </div>
        <div className="col-md-3">
          <label>Woreda</label>
          <select className="form-control" name="woreda" onChange={handleFilterChange}>
            <option value="">All Woredas</option>
            {woredas.map(w => <option key={w} value={w}>{w}</option>)}
          </select>
        </div>
        <div className="col-md-3">
          <label>Service</label>
          <select className="form-control" name="serviceType" onChange={handleFilterChange}>
            <option value="">All Services</option>
            {services.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div className="col-md-12 mt-2">
           <button className="btn btn-info text-white" onClick={fetchStats}>Generate Report</button>
        </div>
      </div>

      {loading && <p>Loading...</p>}

      {stats && (
        <div className="row">
          <div className="col-md-6">
            <div className="card p-3 mb-3 bg-light">
              <h5>Period Statistics (Selected Range)</h5>
              <p><strong>Assigned:</strong> {stats.periodStats.assigned}</p>
              <p><strong>Used:</strong> {stats.periodStats.used}</p>
              <p><strong>Void:</strong> {stats.periodStats.void}</p>
            </div>
          </div>
          
          <div className="col-md-6">
            <div className="card p-3 mb-3 bg-light">
               <h5>Current Balance (Snapshot)</h5>
               {/* Display only if filtering by Woreda/Service makes sense, or show aggregate */}
               <p><strong>Total Assigned (Life-time):</strong> {stats.currentBalance.assigned}</p>
               <p><strong>Total Used:</strong> {stats.currentBalance.used}</p>
               <p><strong>Total Void:</strong> {stats.currentBalance.void}</p>
               <p className="text-primary fs-4"><strong>Remaining Left:</strong> {stats.currentBalance.left}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StockReport;
