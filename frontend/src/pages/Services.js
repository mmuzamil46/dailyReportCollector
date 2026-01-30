import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { getServices, createService, deleteService } from '../services/api';
import { AuthContext } from '../context/AuthContext';
import 'bootstrap/dist/css/bootstrap.min.css';
import './Services.css';

function Services() {
  const { user, token } = useContext(AuthContext);
  const navigate = useNavigate();
  const [services, setServices] = useState([]);
  const [newService, setNewService] = useState({ name: '', yearlyPlan: '', description: '', isActive: true, price: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // all, active, inactive
  const [showAddForm, setShowAddForm] = useState(false);

  const fetchServices = async () => {
    try {
      setLoading(true);
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const response = await getServices(config);
      setServices(response.data);
      setLoading(false);
    } catch (err) {
      console.error('Failed to fetch services:', err);
      setError('Failed to load services');
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user || user.role !== 'Admin') {
      navigate('/login');
    }
    if (token) {
      fetchServices();
    }
  }, [user, token, navigate]);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const payload = {
        ...newService,
        yearlyPlan: newService.yearlyPlan === '' ? null : Number(newService.yearlyPlan),
      };
      const response = await createService(payload, config);
      setServices([...services, response.data]);
      setNewService({ name: '', yearlyPlan: '', description: '', isActive: true, price: 0 });
      setShowAddForm(false);
      setError('');
    } catch (err) {
      console.error('Failed to create service:', err);
      setError(err.response?.data?.message || 'Failed to create service');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this service?')) return;
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      await deleteService(id, config);
      setServices(services.filter((service) => service._id !== id));
    } catch (err) {
      console.error('Failed to delete service:', err);
      setError(err.response?.data?.message || 'Failed to delete service');
    }
  };

  const filteredServices = services.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (s.description && s.description.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus = statusFilter === 'all' ? true : 
                         statusFilter === 'active' ? s.isActive : !s.isActive;
    return matchesSearch && matchesStatus;
  });

  // Stats calculation
  const stats = {
    total: services.length,
    active: services.filter(s => s.isActive).length,
    planned: services.reduce((sum, s) => sum + (s.yearlyPlan || 0), 0)
  };

  if (loading) {
    return (
      <div className="services-page d-flex justify-content-center align-items-center">
        <div className="text-center">
           <div className="spinner-border text-warning mb-3" role="status" style={{width: '3.5rem', height: '3.5rem'}}></div>
           <p className="text-soft-gold fs-5">የአገልግሎቶች መረጃ በመጫን ላይ...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="services-page">
      {/* Header Section */}
      <div className="glass-header">
        <div className="container">
          <div className="row align-items-center">
            <div className="col-lg-6">
              <h1 className="premium-title display-5 mb-2">አገልግሎቶችን ማስተዳደር</h1>
              <p className="text-secondary fs-5 mb-0"> አገልግሎቶችን እና የክፍያ ተመኖችን እዚህ ያስተካክሉ</p>
            </div>
            <div className="col-lg-6 text-lg-end mt-4 mt-lg-0">
               <button 
                 className={`btn ${showAddForm ? 'btn-outline-secondary' : 'btn-premium-add'}`}
                 onClick={() => setShowAddForm(!showAddForm)}
               >
                 <i className={`fas ${showAddForm ? 'fa-times' : 'fa-plus'} me-2`}></i>
                 {showAddForm ? 'ይቅር' : 'አዲስ አገልግሎት ጨምር'}
               </button>
            </div>
          </div>
        </div>
      </div>

      <div className="container">
        {/* Stats Row */}
        <div className="row g-4 mb-5">
          <div className="col-md-4">
            <div className="stat-card-gold text-center">
               <div className="text-soft-gold small text-uppercase fw-bold mb-1">ጠቅላላ አገልግሎቶች</div>
               <div className="display-6 fw-bold text-dark">{stats.total}</div>
            </div>
          </div>
          <div className="col-md-4">
            <div className="stat-card-gold text-center border-success" style={{borderColor: 'rgba(40, 167, 69, 0.3)'}}>
               <div className="text-success small text-uppercase fw-bold mb-1">አክቲቭ አገልግሎቶች</div>
               <div className="display-6 fw-bold text-dark">{stats.active}</div>
            </div>
          </div>
          <div className="col-md-4">
            <div className="stat-card-gold text-center border-info" style={{borderColor: 'rgba(30, 142, 228, 0.3)'}}>
               <div className="text-info small text-uppercase fw-bold mb-1">የታቀዱ ስራዎች</div>
               <div className="display-6 fw-bold text-white">{stats.planned.toLocaleString()}</div>
            </div>
          </div>
        </div>

        {error && (
          <div className="alert alert-danger alert-dismissible fade show mb-4 border-0 shadow-lg" role="alert">
            <i className="fas fa-exclamation-circle me-2"></i>{error}
            <button type="button" className="btn-close" onClick={() => setError('')}></button>
          </div>
        )}

        {/* Add Service Section (Collapsible) */}
        {showAddForm && (
          <div className="card-premium p-4 p-md-5 mb-5 shadow-lg border-0" style={{background: 'rgba(255, 255, 255, 0.05)'}}>
            <h4 className="text-gold mb-4"><i className="fas fa-magic me-2"></i>አዲስ አገልግሎት ዝርዝር</h4>
            <form onSubmit={handleCreate} className="row g-4 d-flex">
              <div className="col-md-6">
                <label className="label-high-contrast mb-2">የአገልግሎት ስም</label>
                <input
                  type="text"
                  className="form-control contrast-input"
                  placeholder="ለምሳሌ፡ የነዋሪነት መታወቂያ"
                  value={newService.name}
                  onChange={(e) => setNewService({ ...newService, name: e.target.value })}
                  required
                />
              </div>
              <div className="col-md-3">
                <label className="label-high-contrast mb-2">ዓመታዊ ዕቅድ</label>
                <input
                  type="number"
                  className="form-control contrast-input"
                  placeholder="ብዛት"
                  value={newService.yearlyPlan}
                  onChange={(e) => setNewService({ ...newService, yearlyPlan: e.target.value })}
                />
              </div>
              <div className="col-md-3">
                <label className="label-high-contrast mb-2">መሰረታዊ ዋጋ</label>
                <input
                  type="number"
                  className="form-control contrast-input"
                  placeholder="0.00 ETB"
                  value={newService.price}
                  onChange={(e) => setNewService({ ...newService, price: e.target.value })}
                />
              </div>
              <div className="col-12">
                <label className="label-high-contrast mb-2">አጭር መግለጫ</label>
                <textarea
                  className="form-control contrast-input"
                  rows="2"
                  placeholder="ስለ አገልግሎቱ አጭር መግለጫ እዚህ ይጻፉ..."
                  value={newService.description}
                  onChange={(e) => setNewService({ ...newService, description: e.target.value })}
                />
              </div>
              <div className="col-12 text-end">
                <button type="submit" className="btn btn-premium-add px-5">
                   <i className="fas fa-save me-2"></i>መዝግብ
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Filters and List */}
        <div className="search-container-premium">
           <div className="row g-3">
              <div className="col-md-8">
                <div className="position-relative">
                  <i className="fas fa-search position-absolute top-50 start-0 translate-middle-y ms-3 text-secondary"></i>
                  <input
                    type="text"
                    className="form-control premium-search ps-5"
                    placeholder="በስም ወይም በመግለጫ ፈልግ..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
              <div className="col-md-4">
                <select 
                  className="form-select premium-search"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="all">ሁሉም ስራዎች</option>
                  <option value="active">ክፍት (Active)</option>
                  <option value="inactive">ዝግ (Inactive)</option>
                </select>
              </div>
           </div>
        </div>

        {filteredServices.length === 0 ? (
          <div className="card-premium py-5 text-center border-dashed">
            <i className="fas fa-search fs-1 text-secondary mb-3 opacity-25"></i>
            <p className="text-secondary fs-5">የፈለጉት አገልግሎት አልተገኘም</p>
          </div>
        ) : (
          <div className="row g-4">
            {filteredServices.map((service) => (
              <div key={service._id} className="col-xl-4 col-md-6">
                <div className="services-card">
                  <div className="d-flex justify-content-between align-items-start mb-3">
                    <h5 className="service-title mb-0">{service.name}</h5>
                    <div className={`badge-pro ${service.isActive ? 'bg-success text-white' : 'bg-danger text-white'} opacity-75`}>
                        {service.isActive ? 'Active' : 'Inactive'}
                    </div>
                  </div>
                  
                  <p className="service-description line-clamp-2">
                    {service.description || 'ምንም ገለጻ አልተሰጠም'}
                  </p>
                  
                  <div className="service-meta">
                    <div className="d-flex flex-column">
                       <span className="text-soft-gold small fw-bold">
                         <i className="fas fa-coins me-1"></i>
                         {service.price ? `${service.price} ETB` : 'Variable'}
                       </span>
                       {service.yearlyPlan && (
                         <span className="text-secondary small">ዕቅድ: {service.yearlyPlan.toLocaleString()}</span>
                       )}
                    </div>
                    <div className="d-flex gap-2">
                      <button
                        className="btn-action-pro btn-action-edit-pro"
                        onClick={() => navigate(`/services/${service._id}/edit`)}
                        title="Edit"
                      >
                        <i className="fa-solid fa-pen-to-square"></i>
                      </button>
                      <button
                        className="btn-action-pro btn-action-delete-pro"
                        onClick={() => handleDelete(service._id)}
                        title="Delete"
                      >
                        <i className="fa-solid fa-trash"></i>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default Services;