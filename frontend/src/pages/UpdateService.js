import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getServiceById, updateService } from '../services/api';
import { AuthContext } from '../context/AuthContext';
import 'bootstrap/dist/css/bootstrap.min.css';

function UpdateService() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, token } = useContext(AuthContext);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    yearlyPlan: '',
    isActive: true,
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  // Redirect non-admins
  useEffect(() => {
    if (!user || user.role !== 'Admin') {
      navigate('/login');
    }
  }, [user, navigate]);

  // Fetch service data
  useEffect(() => {
    const fetchService = async () => {
      try {
        const config = {
          headers: { Authorization: `Bearer ${token}` },
        };
        const response = await getServiceById(id, config);
        setFormData({
          name: response.data.name,
          description: response.data.description || '',
          yearlyPlan: response.data.yearlyPlan !== null ? response.data.yearlyPlan : '',
          isActive: response.data.isActive,
        });
        setLoading(false);
      } catch (err) {
        console.error('Error fetching service:', err);
        setError(err.response?.data?.message || 'Failed to load service data');
        setLoading(false);
      }
    };
    if (token) {
      fetchService();
    }
  }, [id, token]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const config = {
        headers: { Authorization: `Bearer ${token}` },
      };
      const payload = {
        ...formData,
        yearlyPlan: formData.yearlyPlan === '' ? null : Number(formData.yearlyPlan),
      };
      await updateService(id, payload, config);
      navigate('/services');
    } catch (err) {
      console.error('Error updating service:', err);
      setError(err.response?.data?.message || 'Failed to update service');
    }
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
      <h2 className="mb-4 text-center">Update Service</h2>
      {error && <div className="alert alert-danger">{error}</div>}
      <form onSubmit={handleSubmit} className="card p-4 shadow-sm">
        <div className="mb-3">
          <label htmlFor="name" className="form-label">Service Name</label>
          <input
            type="text"
            className="form-control"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
          />
        </div>
        <div className="mb-3">
          <label htmlFor="description" className="form-label">Description</label>
          <textarea
            className="form-control"
            id="description"
            name="description"
            value={formData.description}
            onChange={handleChange}
            rows="4"
          />
        </div>
        <div className="mb-3">
          <label htmlFor="yearlyPlan" className="form-label">Yearly Plan</label>
          <input
            type="number"
            className="form-control"
            id="yearlyPlan"
            name="yearlyPlan"
            value={formData.yearlyPlan}
            onChange={handleChange}
            min="0"
            placeholder="Enter yearly plan or leave blank"
          />
        </div>
        <div className="mb-3 form-check">
          <input
            type="checkbox"
            className="form-check-input"
            id="isActive"
            name="isActive"
            checked={formData.isActive}
            onChange={handleChange}
          />
          <label className="form-check-label" htmlFor="isActive">Active</label>
        </div>
        <div className="d-flex justify-content-between">
          <button type="submit" className="btn btn-primary">Update Service</button>
          <button type="button" className="btn btn-secondary" onClick={() => navigate('/services')}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

export default UpdateService;