import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createRemoteOfficer } from '../services/api';

const CreateRemoteOfficer = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [formData, setFormData] = useState({
        fullName: '',
        username: '',
        phone: '',
        password: '',
        woreda: '',
        hospitalName: '',
        role: 'User'
    });

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setSuccess('');

        try {
            const res = await createRemoteOfficer(formData);
            setSuccess(res.data.message);
            setTimeout(() => navigate('/users'), 2000);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to create officer');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container mt-5">
            <div className="row justify-content-center">
                <div className="col-md-8">
                    <div className="card shadow-lg border-0">
                        <div className="card-header bg-primary text-white p-4 overflow-hidden position-relative">
                            <i className="fas fa-user-plus position-absolute" style={{right: '-20px', bottom: '-20px', fontSize: '10rem', opacity: '0.1'}}></i>
                            <h3 className="mb-0">Create Remote Atlas Officer</h3>
                            <p className="mb-0 opacity-75">Register an officer for hospital or court remote reporting</p>
                        </div>
                        <div className="card-body p-4">
                            {error && <div className="alert alert-danger shadow-sm">{error}</div>}
                            {success && <div className="alert alert-success shadow-sm">{success}</div>}

                            <form onSubmit={handleSubmit}>
                                <div className="row g-3">
                                    <div className="col-md-6">
                                        <label className="form-label fw-bold">Full Name</label>
                                        <input type="text" name="fullName" className="form-control form-control-lg" required onChange={handleChange} placeholder="e.g. Solomon Abebe" />
                                    </div>
                                    <div className="col-md-6">
                                        <label className="form-label fw-bold">Username</label>
                                        <input type="text" name="username" className="form-control form-control-lg" required onChange={handleChange} placeholder="e.g. solomon_remote" />
                                    </div>
                                    <div className="col-md-6">
                                        <label className="form-label fw-bold">Phone Number</label>
                                        <input type="tel" name="phone" className="form-control form-control-lg" required onChange={handleChange} placeholder="0911..." />
                                    </div>
                                    <div className="col-md-6">
                                        <label className="form-label fw-bold">Password</label>
                                        <input type="password" name="password" className="form-control form-control-lg" required onChange={handleChange} placeholder="Min 6 characters" />
                                    </div>
                                    <div className="col-md-6">
                                        <label className="form-label fw-bold">Woreda</label>
                                        <input type="text" name="woreda" className="form-control form-control-lg" required onChange={handleChange} placeholder="e.g. 05" />
                                    </div>
                                    <div className="col-md-6">
                                        <label className="form-label fw-bold">Facility Name (Hospital/Court)</label>
                                        <input type="text" name="hospitalName" className="form-control form-control-lg" required onChange={handleChange} placeholder="e.g. Minilik Hospital" />
                                    </div>
                                </div>

                                <div className="mt-5 d-flex gap-3">
                                    <button type="submit" className="btn btn-primary btn-lg px-5 shadow-sm" disabled={loading}>
                                        {loading ? 'Processing...' : 'Create Remote Officer'}
                                    </button>
                                    <button type="button" className="btn btn-outline-secondary btn-lg px-4" onClick={() => navigate('/users')}>
                                        Cancel
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CreateRemoteOfficer;
