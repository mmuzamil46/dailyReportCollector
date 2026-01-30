import React, { useState, useEffect, useContext } from 'react';
import api from '../services/api'; 
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { getReports, deleteReport, updateReport, getServices } from '../services/api';
import { toEthiopian } from 'ethiopian-date';
import { Modal, Button, Form } from 'react-bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';
import './AllReports.css';

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
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const recordsPerPage = 50;

  // Modals state
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);
  const [editFormData, setEditFormData] = useState({});
  const [allServices, setAllServices] = useState([]);
  const [actionLoading, setActionLoading] = useState(false);
  const [remoteDetails, setRemoteDetails] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);

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

        // Extract unique categories
        const uniqueCategories = [...new Set(sortedReports.map(report => report.serviceCategory).filter(Boolean))].sort();
        setCategories(uniqueCategories);

        setLoading(false);
      } catch (err) {
        console.error('Error fetching reports:', err);
        setError(err.response?.data?.message || 'Failed to load reports');
        setLoading(false);
      }
    };
    if (token) {
      fetchAllReports();
      fetchServicesList();
    }
  }, [token]);

  const fetchServicesList = async () => {
    try {
      const res = await getServices();
      setAllServices(res.data);
    } catch (err) {
      console.error('Error fetching services:', err);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this report? If this is a remote registration, it will be deleted from Atlas and local databases.')) return;
    
    setActionLoading(true);
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      await deleteReport(id, config);
      setReports(reports.filter(r => r._id !== id));
      alert('Report deleted successfully');
    } catch (err) {
      alert('Failed to delete report: ' + (err.response?.data?.message || err.message));
    } finally {
      setActionLoading(false);
    }
  };

  const handleEdit = (report) => {
    setSelectedReport(report);
    setEditFormData({
        serviceId: report.serviceId._id,
        woreda: report.woreda,
        serviceCategory: report.serviceCategory,
        date: report.date.split('T')[0],
        cardSerial: report.cardSerial || '',
        referenceNo: report.referenceNo || '',
        registrationNumber: report.registrationNumber || '',
        letterNumber: report.letterNumber || '',
        evidenceType: Array.isArray(report.evidenceType) ? report.evidenceType : (report.evidenceType ? [report.evidenceType] : [])
    });
    setShowEditModal(true);
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    try {
        const config = { headers: { Authorization: `Bearer ${token}` } };
        const res = await updateReport(selectedReport._id, editFormData, config);
        
        // Update reports list
        const updatedReports = reports.map(r => r._id === selectedReport._id ? { ...r, ...res.data, serviceId: allServices.find(s => s._id === editFormData.serviceId) } : r);
        setReports(updatedReports);
        
        setShowEditModal(false);
        alert('Report updated successfully');
    } catch (err) {
        alert('Failed to update report: ' + (err.response?.data?.message || err.message));
    } finally {
        setActionLoading(false);
    }
  };

  const handleView = async (report) => {
    setSelectedReport(report);
    setRemoteDetails(null);
    setShowViewModal(true);
    
    if (report.remoteId) {
        setDetailsLoading(true);
        try {
            const res = await api.get(`/ontime-reg/${report.remoteId}`);
            setRemoteDetails(res.data);
        } catch (err) {
            console.error('Failed to fetch remote details:', err);
        } finally {
            setDetailsLoading(false);
        }
    }
  };

  const handleEditChange = (e) => {
    setEditFormData({ ...editFormData, [e.target.name]: e.target.value });
  };

  const toggleEditEvidence = (type) => {
    const current = editFormData.evidenceType || [];
    const updated = current.includes(type)
      ? current.filter(t => t !== type)
      : [...current, type];
    setEditFormData({ ...editFormData, evidenceType: updated });
  };

  // Filter reports by woreda, service, and search term
  useEffect(() => {
    let filtered = reports;

    if (selectedWoreda) {
      filtered = filtered.filter(report => report.woreda === selectedWoreda);
    }

    if (selectedService) {
      filtered = filtered.filter(report => report.serviceId.name === selectedService);
    }

    if (selectedCategory) {
      filtered = filtered.filter(report => report.serviceCategory === selectedCategory);
    }

    if (startDate) {
      filtered = filtered.filter(report => new Date(report.date) >= new Date(startDate));
    }

    if (endDate) {
      // Set end date to end of day
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      filtered = filtered.filter(report => new Date(report.date) <= end);
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
  }, [selectedWoreda, selectedService, selectedCategory, startDate, endDate, searchTerm, reports]);

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

  const getEthDateString = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const [year, month, day] = toEthiopian(date.getFullYear(), date.getMonth() + 1, date.getDate());
    return `${day}/${month}/${year} E.C`;
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
    <div className="container mt-5">
      <h2 className="mb-4">All Reports</h2>
      <div className="row mb-3">
        {/* Count Display */}
        <div className="col-12 mb-3">
          <div className="card bg-primary text-white">
            <div className="card-body d-flex justify-content-between align-items-center p-3">
              <h4 className="m-0">
                <i className="bi bi-file-earmark-text me-2"></i>
                Total Reports: <span className="fw-bold fs-3">{filteredReports.reduce((acc, curr) => acc + (curr.count || 1), 0).toLocaleString()}</span>
              </h4>
              {filteredReports.length !== reports.length && (
                 <span className="badge bg-warning text-dark ms-2">
                   Filtered from {reports.reduce((acc, curr) => acc + (curr.count || 1), 0).toLocaleString()}
                 </span>
              )}
            </div>
          </div>
        </div>

        <div className="col-md-3 mb-2">
                <label className="label-high-contrast mb-1">ወረዳ (Woreda)</label>
                <select
                  className="form-select contrast-input"
                  value={selectedWoreda}
                  onChange={(e) => setSelectedWoreda(e.target.value)}
                >         <option value="">All Woredas</option>
            {woredas.map((woreda, index) => (
              <option key={index} value={woreda}>{woreda}</option>
            ))}
          </select>
        </div>
        <div className="col-md-3 mb-2">
                <label className="label-high-contrast mb-1">አገልግሎት (Service)</label>
                <select
                  className="form-select contrast-input"
                  value={selectedService}
                  onChange={(e) => setSelectedService(e.target.value)}
                >         <option value="">All Services</option>
            {services.map((service, index) => (
              <option key={index} value={service}>{service}</option>
            ))}
          </select>
        </div>
        <div className="col-md-3 mb-2">
          <label className="label-high-contrast mb-1">ምድብ (Category)</label>
          <select
            id="categoryFilter"
            className="form-select contrast-input"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
          >
            <option value="">All Categories</option>
            {categories.map((cat, index) => (
              <option key={index} value={cat}>{cat}</option>
            ))}
          </select>
        </div>
        <div className="col-md-3 mb-2">
          <label className="label-high-contrast mb-1">ይፈልጉ (Search)</label>
          <input
            type="text"
            id="searchBar"
            className="form-control contrast-input"
            placeholder="Ref / Letter / Reg / Card..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="col-md-3 mb-2">
          <label className="label-high-contrast mb-1">ከቀን (Start Date)</label>
          <input
            type="date"
            id="startDate"
            className="form-control contrast-input"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
          {startDate && <small className="text-warning d-block mt-1">{getEthDateString(startDate)}</small>}
        </div>
        <div className="col-md-3 mb-2">
          <label className="label-high-contrast mb-1">እስከ ቀን (End Date)</label>
          <input
            type="date"
            id="endDate"
            className="form-control contrast-input"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
          {endDate && <small className="text-warning d-block mt-1">{getEthDateString(endDate)}</small>}
        </div>
        <div className="col-md-3 mb-2 d-flex align-items-end">
            <button className="btn btn-secondary w-100" onClick={() => {
                setSelectedWoreda('');
                setSelectedService('');
                setSelectedCategory('');
                setStartDate('');
                setEndDate('');
                setSearchTerm('');
            }}>Reset Filters</button>
        </div>
      </div>
      <div className="table-responsive table-custom shadow-sm rounded">
        <table className="table table-hover mb-0">
          <thead>
            <tr>
              <th>Woreda</th>
              <th>Service Name</th>
              <th>Category</th>
              <th className="text-center">Count</th>
              <th>Reference No</th>
              <th>Letter No</th>
              <th>Reg No</th>
              <th>Card Serial</th>
              <th>Date</th>
              <th>Source</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {currentRecords.length === 0 ? (
              <tr>
                <td colSpan="11" className="text-center py-5">
                  <i className="fas fa-inbox fa-3x text-muted mb-3 d-block"></i>
                  No reports found matching your filters.
                </td>
              </tr>
            ) : (
              currentRecords.map((report) => (
                <tr key={report._id}>
                  <td className="fw-bold">{report.woreda}</td>
                  <td>{report.serviceId.name}</td>
                  <td>
                    {report.serviceCategory ? (
                      <span className="badge bg-opacity-10 bg-info text-info border border-info border-opacity-25">
                        {report.serviceCategory}
                      </span>
                    ) : 'N/A'}
                  </td>
                  <td className="fw-bold text-center text-gold">{report.count || 1}</td>
                  <td className="font-monospace small text-white-50">{report.referenceNo || '-'}</td>
                  <td className="font-monospace small text-white-50">{report.letterNumber || '-'}</td>
                  <td className="font-monospace small text-white-50">{report.registrationNumber || '-'}</td>
                  <td className="font-monospace small text-white-50">{report.cardSerial || '-'}</td>
                  <td className="small">{formatDate(report.date)}</td>
                  <td className="text-center">
                    {report.remoteId ? (
                      <span className="badge rounded-pill badge-evidence" title="Remote Entry via Atlas">
                        <i className="fas fa-cloud-download-alt me-1"></i> Remote
                      </span>
                    ) : (
                      <span className="badge rounded-pill bg-secondary bg-opacity-25 text-white-50 border border-white border-opacity-10" title="Local Manual Entry">
                        <i className="fas fa-desktop me-1"></i> Local
                      </span>
                    )}
                  </td>
                  <td>
                    <div className="btn-group btn-group-sm">
                      <button className="btn btn-outline-info" title="View Details" onClick={() => handleView(report)}>
                        <i className="fas fa-eye"></i>
                      </button>
                      <button className="btn btn-outline-warning" title="Edit Report" onClick={() => handleEdit(report)}>
                        <i className="fas fa-pencil-alt"></i>
                      </button>
                      <button className="btn btn-outline-danger" title="Delete Report" onClick={() => handleDelete(report._id)}>
                        <i className="fas fa-trash-alt"></i>
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="d-flex justify-content-between align-items-center mt-4">
        <button
          className="btn btn-outline-light"
          onClick={handlePrevPage}
          disabled={currentPage === 1}
        >
          <i className="fas fa-chevron-left me-2"></i> Previous
        </button>
        <span className="text-muted fw-bold">Page {currentPage} of {totalPages}</span>
        <button
          className="btn btn-outline-light"
          onClick={handleNextPage}
          disabled={currentPage === totalPages}
        >
          Next <i className="fas fa-chevron-right ms-2"></i>
        </button>
      </div>

      {/* View Modal */}
      <Modal show={showViewModal} onHide={() => setShowViewModal(false)} centered size="lg" className="premium-modal">
        <Modal.Header closeButton className="bg-gradient bg-info text-white border-0 py-3 shadow-sm">
          <Modal.Title className="fw-bold">
            <i className="bi bi-file-text me-2"></i>
            Report Details
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="bg-light p-4">
          {selectedReport && (
            <div className="row g-3">
              <div className="col-md-6">
                <label className="fw-bold text-muted small uppercase">Woreda</label>
                <p className="fs-5">{selectedReport.woreda}</p>
              </div>
              <div className="col-md-6">
                <label className="fw-bold text-muted small uppercase">Service Name</label>
                <p className="fs-5">{selectedReport.serviceId.name}</p>
              </div>
              <div className="col-md-6">
                <label className="fw-bold text-muted small uppercase">Category</label>
                <p className="fs-5">{selectedReport.serviceCategory || 'N/A'}</p>
              </div>
              <div className="col-md-6">
                <label className="fw-bold text-muted small uppercase">Date</label>
                <p className="fs-5">{formatDate(selectedReport.date)} ({new Date(selectedReport.date).toLocaleDateString()})</p>
              </div>
              <div className="col-md-6">
                <label className="fw-bold text-muted small uppercase">Reference No</label>
                <p className="fs-5 font-monospace">{selectedReport.referenceNo || 'N/A'}</p>
              </div>

              {remoteDetails && (
                <>
                  <div className="col-md-6">
                    <label className="fw-bold text-muted small uppercase">Gender</label>
                    <p className="fs-5">{remoteDetails.gender}</p>
                  </div>
                  <div className="col-md-6">
                    <label className="fw-bold text-muted small uppercase">
                        {selectedReport.serviceCategory === 'ፍቺ' ? 'Court Name' : 'Hospital Name'}
                    </label>
                    <p className="fs-5">{remoteDetails.hospitalName || remoteDetails.courtName || 'N/A'}</p>
                  </div>
                </>
              )}

              <div className="col-md-6">
                <label className="fw-bold text-muted small uppercase">Registration No</label>
                <p className="fs-5 font-monospace">{selectedReport.registrationNumber || 'N/A'}</p>
              </div>
              <div className="col-md-6">
                <label className="fw-bold text-muted small uppercase">Letter No</label>
                <p className="fs-5 font-monospace">{selectedReport.letterNumber || 'N/A'}</p>
              </div>
              <div className="col-md-6">
                <label className="fw-bold text-muted small uppercase">Card Serial</label>
                <p className="fs-5 font-monospace">{selectedReport.cardSerial || 'N/A'}</p>
              </div>
              <div className="col-md-6">
                <label className="fw-bold text-muted small uppercase">Evidence Types</label>
                <div className="d-flex gap-1 flex-wrap mt-1">
                  {selectedReport.evidenceType && selectedReport.evidenceType.length > 0 ? (
                    selectedReport.evidenceType.map(type => (
                      <span key={type} className="badge bg-info text-white">{type}</span>
                    ))
                  ) : (
                    <span className="text-muted small">No evidence provided</span>
                  )}
                </div>
              </div>
              <div className="col-md-6">
                <label className="fw-bold text-muted small uppercase">Payment</label>
                <p className="fs-5 text-success fw-bold">{selectedReport.payment?.toLocaleString()} ETB</p>
              </div>
              <div className="col-md-6">
                <label className="fw-bold text-muted small uppercase">Count</label>
                <p className="fs-5">{selectedReport.count || 1}</p>
              </div>
              <div className="col-md-12 border-top pt-3">
                <label className="fw-bold text-muted small uppercase">Reported By</label>
                <p className="mb-0">{selectedReport.reportedBy?.fullName} (@{selectedReport.reportedBy?.username})</p>
                <small className="text-muted">ID: {selectedReport._id}</small>
                {selectedReport.remoteId && (
                    <div className="mt-2 text-primary small">
                        <i className="bi bi-cloud-check me-1"></i>
                        Remote Entry (Atlas ID: {selectedReport.remoteId})
                    </div>
                )}
              </div>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowViewModal(false)}>Close</Button>
        </Modal.Footer>
      </Modal>

      {/* Edit Modal */}
      <Modal show={showEditModal} onHide={() => setShowEditModal(false)} centered size="lg" className="premium-modal">
        <Modal.Header closeButton className="bg-gradient bg-warning text-dark border-0 py-3 shadow-sm">
          <Modal.Title className="fw-bold">
            <i className="bi bi-pencil-square me-2"></i>
            Edit Report
          </Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleUpdate}>
          <Modal.Body className="bg-light p-4">
            <div className="row g-3">
              <div className="col-md-6">
                <Form.Group>
                  <Form.Label>Service</Form.Label>
                  <Form.Select name="serviceId" value={editFormData.serviceId} onChange={handleEditChange} required>
                    {allServices.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
                  </Form.Select>
                </Form.Group>
              </div>
              <div className="col-md-6">
                <Form.Group>
                  <Form.Label>Woreda</Form.Label>
                  <Form.Control type="text" name="woreda" value={editFormData.woreda} onChange={handleEditChange} required />
                </Form.Group>
              </div>
              <div className="col-md-6">
                <Form.Group>
                  <Form.Label>Category</Form.Label>
                  <Form.Control type="text" name="serviceCategory" value={editFormData.serviceCategory} onChange={handleEditChange} />
                </Form.Group>
              </div>
              <div className="col-md-6">
                <Form.Group>
                  <Form.Label>Date</Form.Label>
                  <Form.Control type="date" name="date" value={editFormData.date} onChange={handleEditChange} required />
                </Form.Group>
              </div>
              <div className="col-md-6">
                <Form.Group>
                  <Form.Label>Reference No</Form.Label>
                  <Form.Control type="text" name="referenceNo" value={editFormData.referenceNo} onChange={handleEditChange} />
                </Form.Group>
              </div>
              <div className="col-md-6">
                <Form.Group>
                  <Form.Label>Registration No</Form.Label>
                  <Form.Control type="text" name="registrationNumber" value={editFormData.registrationNumber} onChange={handleEditChange} />
                </Form.Group>
              </div>
              <div className="col-md-6">
                <Form.Group>
                  <Form.Label>Letter No</Form.Label>
                  <Form.Control type="text" name="letterNumber" value={editFormData.letterNumber} onChange={handleEditChange} />
                </Form.Group>
              </div>
              <div className="col-md-6">
                <Form.Group>
                  <Form.Label>Card Serial</Form.Label>
                  <Form.Control type="text" name="cardSerial" value={editFormData.cardSerial} onChange={handleEditChange} />
                </Form.Group>
              </div>
              <div className="col-md-12">
                <Form.Group>
                  <Form.Label className="d-block">Evidence Documents</Form.Label>
                  {(() => {
                    const service = allServices.find(s => s._id === editFormData.serviceId);
                    if (service && service.requiresEvidence && service.evidenceTypes) {
                      return (
                        <div className="d-flex gap-2 flex-wrap">
                          {service.evidenceTypes.map(type => (
                            <Button
                              key={type}
                              variant={editFormData.evidenceType?.includes(type) ? "info" : "outline-info"}
                              size="sm"
                              className="rounded-pill px-3"
                              onClick={() => toggleEditEvidence(type)}
                            >
                              {type}
                            </Button>
                          ))}
                        </div>
                      );
                    }
                    return <span className="text-muted small">Evidence not required for this service</span>;
                  })()}
                </Form.Group>
              </div>
            </div>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowEditModal(false)}>Cancel</Button>
            <Button variant="warning" type="submit" disabled={actionLoading}>
                {actionLoading ? 'Updating...' : 'Save Changes'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </div>
  );
}

export default AllReports;