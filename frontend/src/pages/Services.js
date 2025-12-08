import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { getServices, createService, updateService, deleteService } from '../services/api';
import { AuthContext } from '../context/AuthContext';
import 'bootstrap/dist/css/bootstrap.min.css';

function Services() {
  const { user, token } = useContext(AuthContext);
  const navigate = useNavigate();
  const [services, setServices] = useState([]);
  const [newService, setNewService] = useState({ name: '', yearlyPlan: '', description: '', isActive: true });
  const [editService, setEditService] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);

  // Redirect non-admins and fetch services
  useEffect(() => {
    if (!user || user.role !== 'Admin') {
      navigate('/login');
    }
    const fetchServices = async () => {
      try {
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
      setNewService({ name: '', yearlyPlan: '', description: '', isActive: true });
    } catch (err) {
      console.error('Failed to create service:', err);
      setError(err.response?.data?.message || 'Failed to create service');
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const payload = {
        ...editService,
        yearlyPlan: editService.yearlyPlan === '' ? null : Number(editService.yearlyPlan),
      };
      const response = await updateService(editService._id, payload, config);
      setServices(services.map((service) => (service._id === editService._id ? response.data : service)));
      setShowModal(false);
      setEditService(null);
    } catch (err) {
      console.error('Failed to update service:', err);
      setError(err.response?.data?.message || 'Failed to update service');
    }
  };

  const handleDelete = async (id) => {
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      await deleteService(id, config);
      setServices(services.filter((service) => service._id !== id));
    } catch (err) {
      console.error('Failed to delete service:', err);
      setError(err.response?.data?.message || 'Failed to delete service');
    }
  };

  const openEditModal = (service) => {
    setEditService({
      _id: service._id,
      name: service.name,
      description: service.description || '',
      yearlyPlan: service.yearlyPlan !== null ? service.yearlyPlan : '',
      isActive: service.isActive,
    });
    setShowModal(true);
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

  return (
    <div className="container mt-5">
      <h2 className="mb-4">Manage Services</h2>
      {error && <div className="alert alert-danger">{error}</div>}
      {user?.role === 'Admin' && (
        <form onSubmit={handleCreate} className="card p-4 mb-4 shadow-sm">
          <div className="mb-3">
            <label htmlFor="name" className="form-label">Service Name</label>
            <input
              type="text"
              className="form-control"
              id="name"
              value={newService.name}
              onChange={(e) => setNewService({ ...newService, name: e.target.value })}
              required
            />
          </div>
          <div className="mb-3">
            <label htmlFor="yearlyPlan" className="form-label">Yearly Plan (Optional)</label>
            <input
              type="number"
              className="form-control"
              id="yearlyPlan"
              value={newService.yearlyPlan}
              onChange={(e) => setNewService({ ...newService, yearlyPlan: e.target.value })}
              min="0"
            />
          </div>
          <div className="mb-3">
            <label htmlFor="description" className="form-label">Description (Optional)</label>
            <textarea
              className="form-control"
              id="description"
              value={newService.description}
              onChange={(e) => setNewService({ ...newService, description: e.target.value })}
              rows="3"
            />
          </div>
          <button type="submit" className="btn btn-primary">Add Service</button>
        </form>
      )}
      <table className="table table-striped">
        <thead>
          <tr>
            <th>Name</th>
            <th>Description</th>
            <th>Yearly Plan</th>
            <th>Active</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {services.map((service) => (
            <tr key={service._id}>
              <td>{service.name}</td>
              <td>{service.description || 'N/A'}</td>
              <td>{service.yearlyPlan !== null ? service.yearlyPlan : 'No plan'}</td>
              <td>{service.isActive ? 'Yes' : 'No'}</td>
              <td>
                {user?.role === 'Admin' && (
                  <>
                    <button
                      className="btn btn-sm btn-primary me-2"
                      onClick={() => openEditModal(service)}
                    >
                      Update
                    </button>
                    <button
                      className="btn btn-sm btn-danger"
                      onClick={() => handleDelete(service._id)}
                    >
                      Delete
                    </button>
                  </>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Update Service Modal */}
      {showModal && editService && (
        <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Update Service</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowModal(false)}
                ></button>
              </div>
              <form onSubmit={handleUpdate}>
                <div className="modal-body">
                  <div className="mb-3">
                    <label htmlFor="editName" className="form-label">Service Name</label>
                    <input
                      type="text"
                      className="form-control"
                      id="editName"
                      value={editService.name}
                      onChange={(e) => setEditService({ ...editService, name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label htmlFor="editYearlyPlan" className="form-label">Yearly Plan (Optional)</label>
                    <input
                      type="number"
                      className="form-control"
                      id="editYearlyPlan"
                      value={editService.yearlyPlan}
                      onChange={(e) => setEditService({ ...editService, yearlyPlan: e.target.value })}
                      min="0"
                    />
                  </div>
                  <div className="mb-3">
                    <label htmlFor="editDescription" className="form-label">Description (Optional)</label>
                    <textarea
                      className="form-control"
                      id="editDescription"
                      value={editService.description}
                      onChange={(e) => setEditService({ ...editService, description: e.target.value })}
                      rows="3"
                    />
                  </div>
                  <div className="mb-3 form-check">
                    <input
                      type="checkbox"
                      className="form-check-input"
                      id="editIsActive"
                      checked={editService.isActive}
                      onChange={(e) => setEditService({ ...editService, isActive: e.target.checked })}
                    />
                    <label className="form-check-label" htmlFor="editIsActive">Active</label>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="submit" className="btn btn-primary">Save Changes</button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setShowModal(false)}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Services;