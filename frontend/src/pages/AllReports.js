import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { getReports } from '../services/api';
import { toEthiopian } from 'ethiopian-date';
import 'bootstrap/dist/css/bootstrap.min.css';

function AllReports() {
  const { user, token } = useContext(AuthContext);
  const navigate = useNavigate();
  const [reports, setReports] = useState([]);
  const [filteredReports, setFilteredReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [woredas, setWoredas] = useState([]);
  const [selectedWoreda, setSelectedWoreda] = useState('');
  const [services, setServices] = useState([]);
  const [selectedService, setSelectedService] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const recordsPerPage = 50;

  // Redirect non-admins
  useEffect(() => {
    if (!user || user.role === 'User') {
      navigate('/login');
    }
  }, [user, navigate]);

  // Fetch reports
  useEffect(() => {
    const fetchAllReports = async () => {
      try {
        const config = {
          headers: { Authorization: `Bearer ${token}` },
        };
        const response = await getReports(config);
        const sortedReports = response.data.sort((a, b) => new Date(b.date) - new Date(a.date));
        setReports(sortedReports);
        setFilteredReports(sortedReports);

        // Extract unique woredas
        const uniqueWoredas = [...new Set(sortedReports.map(report => report.woreda))].sort();
        setWoredas(uniqueWoredas);

        // Extract unique services
        const uniqueServices = [...new Set(sortedReports.map(report => report.serviceId.name))].sort();
        setServices(uniqueServices);

        setLoading(false);
      } catch (err) {
        console.error('Error fetching reports:', err);
        setError(err.response?.data?.message || 'Failed to load reports');
        setLoading(false);
      }
    };
    if (token) {
      fetchAllReports();
    }
  }, [token]);

  // Filter reports by woreda, service, and search term
  useEffect(() => {
    let filtered = reports;

    if (selectedWoreda) {
      filtered = filtered.filter(report => report.woreda === selectedWoreda);
    }

    if (selectedService) {
      filtered = filtered.filter(report => report.serviceId.name === selectedService);
    }

    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase();
      filtered = filtered.filter(report => 
        (report.referenceNo && report.referenceNo.toLowerCase().includes(lowerSearch)) ||
        (report.letterNumber && report.letterNumber.toLowerCase().includes(lowerSearch)) ||
        (report.registrationNumber && report.registrationNumber.toLowerCase().includes(lowerSearch)) ||
        (report.cardSerial && report.cardSerial.toLowerCase().includes(lowerSearch))
      );
    }

    setFilteredReports(filtered);
    setCurrentPage(1); // Reset to first page on filter
  }, [selectedWoreda, selectedService, searchTerm, reports]);

  // Pagination logic
  const indexOfLastRecord = currentPage * recordsPerPage;
  const indexOfFirstRecord = indexOfLastRecord - recordsPerPage;
  const currentRecords = filteredReports.slice(indexOfFirstRecord, indexOfLastRecord);
  const totalPages = Math.ceil(filteredReports.length / recordsPerPage);

  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const formatDate = (date) => {
    const gregorianDate = new Date(date);
    const [year, month, day] = toEthiopian(gregorianDate.getFullYear(), gregorianDate.getMonth() + 1, gregorianDate.getDate());
    return `${day}/${month}/${year}`;
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center vh-100">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return <div className="alert alert-danger m-5">{error}</div>;
  }

  return (
    <div className="container mt-5 text-white">
      <h2 className="mb-4">All Reports</h2>
      <div className="row mb-4">
        <div className="col-md-4">
          <label htmlFor="woredaFilter" className="form-label">Filter by Woreda</label>
          <select
            id="woredaFilter"
            className="form-select"
            value={selectedWoreda}
            onChange={(e) => setSelectedWoreda(e.target.value)}
          >
            <option value="">All Woredas</option>
            {woredas.map((woreda, index) => (
              <option key={index} value={woreda}>{woreda}</option>
            ))}
          </select>
        </div>
        <div className="col-md-4">
          <label htmlFor="serviceFilter" className="form-label">Filter by Service</label>
          <select
            id="serviceFilter"
            className="form-select"
            value={selectedService}
            onChange={(e) => setSelectedService(e.target.value)}
          >
            <option value="">All Services</option>
            {services.map((service, index) => (
              <option key={index} value={service}>{service}</option>
            ))}
          </select>
        </div>
        <div className="col-md-4">
          <label htmlFor="searchBar" className="form-label">Search by Number</label>
          <input
            type="text"
            id="searchBar"
            className="form-control"
            placeholder="Search reference, letter, registration, or card serial..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>
      <table className="table table-striped table-bordered">
        <thead className="table-dark">
          <tr>
            <th>Woreda</th>
            <th>Service Name</th>
            <th>Service Category</th>
            <th>Reference Number</th>
            <th>Letter Number</th>
            <th>Registration Number</th>
            <th>Card Serial</th>
            <th>Date</th>
          </tr>
        </thead>
        <tbody>
          {currentRecords.length === 0 ? (
            <tr>
              <td colSpan="8" className="text-center">No reports found</td>
            </tr>
          ) : (
            currentRecords.map((report) => (
              <tr key={report._id}>
                <td>{report.woreda}</td>
                <td>{report.serviceId.name}</td>
                <td>{report.serviceCategory || 'N/A'}</td>
                <td>{report.referenceNo || 'N/A'}</td>
                <td>{report.letterNumber || 'N/A'}</td>
                <td>{report.registrationNumber || 'N/A'}</td>
                <td>{report.cardSerial || 'N/A'}</td>
                <td>{formatDate(report.date)}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
      <div className="d-flex justify-content-between">
        <button
          className="btn btn-primary"
          onClick={handlePrevPage}
          disabled={currentPage === 1}
        >
          Previous
        </button>
        <span>Page {currentPage} of {totalPages}</span>
        <button
          className="btn btn-primary"
          onClick={handleNextPage}
          disabled={currentPage === totalPages}
        >
          Next
        </button>
      </div>
    </div>
  );
}

export default AllReports;