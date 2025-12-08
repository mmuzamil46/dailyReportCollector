import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { getPlanSummary, createPlan, getServices } from '../services/api';
import { getCurrentEthiopianYear } from '../utils/ethiopianDate';
import 'bootstrap/dist/css/bootstrap.min.css';

function PlanTable() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  const [plans, setPlans] = useState([]);
  const [servicesList, setServicesList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedBudgetYear, setSelectedBudgetYear] = useState('');
  const [showInsertModal, setShowInsertModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);

  const [modalWoreda, setModalWoreda] = useState('');
  const [planValues, setPlanValues] = useState({});
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState('');

  const woredas = ['Woreda 1', 'Woreda 3', 'Woreda 4', 'Woreda 5', 'Woreda 6', 'Woreda 8',
    'Woreda 9', 'Woreda 10', 'Woreda 11', 'Woreda 12', 'Woreda 13', 'Woreda 14'];

  // Use the utility function for current Ethiopian year
  const currentEthiopianYear = getCurrentEthiopianYear;

  const kunetServices = ['ልደት', 'ጋብቻ', 'ሞት', 'ፍቺ', 'ጉዲፈቻ'];
  const kunetCategories = ['በወቅቱ', 'በዘገየ', 'በነባር'];

  const newariServices = ['መታወቂያ', 'ያላገባ'];
  const newariCategories = ['አዲስ', 'እድሳት', 'ምትክ'];

  const otherServices = [
    'የነዋሪነት ምዝገባ',
    'የዝምድና አገልግሎት',
    'የነዋሪነት ማረጋገጫ',
    'በህይወት ስለመኖር',
    'እርማት፣እድሳት እና ግልባጭ',
    'መሸኛ'
  ];

  useEffect(() => {
    if (!user) navigate('/login');
  }, [user, navigate]);

  // Debug effect to log plans when they change
  useEffect(() => {
    console.log("Plans state updated:", plans);
  }, [plans]);

  // Debug effect to log currentYearPlans when it changes
  useEffect(() => {
    const currentYearPlans = plans.filter(p => p.budgetYear === currentEthiopianYear().toString());
    console.log("Current year plans:", currentYearPlans);
  }, [plans]);

  const fetchPlans = async (showLoading = true) => {
    if (!user) return;
    try {
      if (showLoading) setLoading(true);
      const currentYear = currentEthiopianYear();
      const params = selectedBudgetYear ? { budgetYear: selectedBudgetYear } : { budgetYear: currentYear };
      const config = { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } };

      console.log("Fetching plans with params:", params);

      const [planRes, serviceRes] = await Promise.all([
        getPlanSummary({ ...config, params }),
        getServices(config)
      ]);

      console.log("Plan API response:", planRes.data);
      console.log("Services API response:", serviceRes.data);

      // Set state and log the value we're setting
      setPlans(planRes.data);
      setServicesList(serviceRes.data);
      
      // Clear any previous errors
      setError('');

      if (showLoading) setLoading(false);
    } catch (err) {
      console.error("Fetch error:", err);
      setError('Failed to load data: ' + (err.response?.data?.message || err.message));
      if (showLoading) setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlans();
  }, [user, selectedBudgetYear]);

  const openInsertModal = () => {
    setModalWoreda('');
    setPlanValues({});
    setModalError('');
    setShowInsertModal(true);
  };

  const openEditModal = (plan) => {
    console.log("Editing plan:", plan);
    setEditingPlan(plan);
    setModalWoreda(plan.woreda);
    setModalError('');

    const values = {};
    plan.rows.forEach(row => {
      const service = servicesList.find(s => s.name === row.serviceName);
      if (!service) {
        console.warn("Service not found for:", row.serviceName);
        return;
      }
      
      if (!values[service._id]) values[service._id] = {};
      
      if (row.category && row.category !== 'ጠቅላላ' && row.category !== 'total') {
        values[service._id][row.category] = row.plan;
      } else {
        values[service._id].total = row.plan;
      }
    });
    
    console.log("Plan values for modal:", values);
    setPlanValues(values);
    setShowEditModal(true);
  };

  const handlePlanChange = (serviceId, field, value) => {
    setPlanValues(prev => ({
      ...prev,
      [serviceId]: {
        ...prev[serviceId],
        [field]: Number(value) || 0
      }
    }));
  };

  const handleSubmitPlan = async (isEdit = false) => {
    if (!modalWoreda) return setModalError('Please select a woreda');

    const servicesToSave = [];

    servicesList.forEach(service => {
      const servicePlans = planValues[service._id] || {};

      if (kunetServices.includes(service.name)) {
        kunetCategories.forEach(cat => {
          const plan = servicePlans[cat] || 0;
          servicesToSave.push({ serviceId: service._id, category: cat, plan });
        });
      } else if (newariServices.includes(service.name)) {
        newariCategories.forEach(cat => {
          const plan = servicePlans[cat] || 0;
          servicesToSave.push({ serviceId: service._id, category: cat, plan });
        });
      } else {
        const total = servicePlans.total || 0;
        servicesToSave.push({ serviceId: service._id, category: null, plan: total });
      }
    });

    try {
      setModalLoading(true);
      const payload = {
        woreda: modalWoreda,
        budgetYear: currentEthiopianYear().toString(),
        services: servicesToSave
      };

      console.log("Submitting plan:", payload);

      const config = { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } };
      await createPlan(payload, config);

      alert(isEdit ? 'Plan updated successfully!' : 'Plan saved successfully!');
      setShowInsertModal(false);
      setShowEditModal(false);
      
      // Refresh data
      await fetchPlans();
    } catch (err) {
      console.error("Save error:", err);
      setModalError(err.response?.data?.message || 'Failed to save plan');
    } finally {
      setModalLoading(false);
    }
  };

  // Fix data mapping for table display
  const getPlanValue = (plan, serviceName, category = null) => {
    const row = plan.rows.find(r => {
      const serviceMatch = r.serviceName === serviceName;
      const categoryMatch = category ? r.category === category : (r.category === null || r.category === 'ጠቅላላ' || r.category === 'total');
      return serviceMatch && categoryMatch;
    });
    return row ? row.plan : 0;
  };

  const currentYearPlans = plans.filter(p => p.budgetYear === currentEthiopianYear().toString());
  const showInsertButton = user && (user.role === 'Admin' || user.role === 'Staff') && currentYearPlans.length < 12;

  console.log("Rendering - currentYearPlans:", currentYearPlans);
  console.log("Rendering - showInsertButton:", showInsertButton);

  if (loading) return <div className="text-center mt-5"><div className="spinner-border"></div></div>;
  if (error) return <div className="alert alert-danger m-5">{error}</div>;

  return (
    <div className="container-fluid mt-5">
      <h2 className="mb-4 text-white text-center fw-bold">
        አመታዊ እቅድ ካስኬድ - {currentEthiopianYear()} E.C.
      </h2>

      <div className="row mb-4 justify-content-center">
        <div className="col-md-4">
          <label className="form-label fw-bold text-white">የበጀት አመት</label>
          <select className="form-select" value={selectedBudgetYear} onChange={e => setSelectedBudgetYear(e.target.value)}>
            <option value="">{currentEthiopianYear()} (Current)</option>
            {[...new Set(plans.map(p => p.budgetYear))].sort((a,b)=>b-a).map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
      </div>

      {showInsertButton && (
        <div className="text-center mb-4">
          <button className="btn btn-success btn-lg px-5" onClick={openInsertModal}>
            የወረዳ ዕቅድ አስገባ
          </button>
        </div>
      )}

      {/* Debug info - remove in production */}
      {/* <div className="alert alert-info">
        <small>
          Debug: Loaded {plans.length} total plans, {currentYearPlans.length} current year plans
        </small>
      </div> */}

    {/* Horizontal Table */}
<div className="table-responsive">
  <table className="table table-bordered table-hover text-center align-middle">
    <thead className="table-dark">
      <tr>
        <th rowSpan="2" className="align-middle bg-secondary text-white">ወረዳ</th>
        {/* Kunet Services */}
        {kunetServices.map(s => (
          <th key={s} colSpan={3} className="bg-primary text-white">{s}</th>
        ))}
        {/* Newari Services */}
        {newariServices.map(s => (
          <th key={s} colSpan={3} className="bg-info text-white">{s}</th>
        ))}
        {/* Other Services */}
        {otherServices.map(s => (
          <th key={s} rowSpan="2" className="align-middle bg-success text-white">{s}</th>
        ))}
        {user && (user.role === 'Admin' || user.role === 'Staff') && (
          <th rowSpan="2" className="align-middle bg-warning text-dark">ድርጊት</th>
        )}
      </tr>
      <tr>
        {kunetServices.flatMap(() => kunetCategories.map(c => <th key={c}>{c}</th>))}
        {newariServices.flatMap(() => newariCategories.map(c => <th key={c}>{c}</th>))}
      </tr>
    </thead>
    <tbody>
      {currentYearPlans.length === 0 ? (
        <tr>
          <td colSpan="50" className="text-center py-5 fs-4">
            አስካሁን ለ {currentEthiopianYear()} በጀት አምት እቅድ አልገባም
          </td>
        </tr>
      ) : (
        currentYearPlans
          .sort((a, b) => {
            // Numerical sorting for woredas
            const getWoredaNumber = (woredaStr) => {
              const match = woredaStr.match(/(\d+)/);
              return match ? parseInt(match[1], 10) : 0;
            };
            return getWoredaNumber(a.woreda) - getWoredaNumber(b.woreda);
          })
          .map(plan => {
            console.log("Rendering plan:", plan.woreda, plan.rows);
            return (
              <tr key={plan._id || plan.woreda}>
                <td className="fw-bold fs-5">{plan.woreda.replace('Woreda ', '')}</td>
                
                {/* Kunet Services Data */}
                {kunetServices.flatMap(service => 
                  kunetCategories.map(category => (
                    <td key={`${service}-${category}`}>
                      {getPlanValue(plan, service, category)}
                    </td>
                  ))
                )}
                
                {/* Newari Services Data */}
                {newariServices.flatMap(service => 
                  newariCategories.map(category => (
                    <td key={`${service}-${category}`}>
                      {getPlanValue(plan, service, category)}
                    </td>
                  ))
                )}
                
                {/* Other Services Data */}
                {otherServices.map(service => (
                  <td key={service}>
                    {getPlanValue(plan, service)}
                  </td>
                ))}
                
                {user && (user.role === 'Admin' || user.role === 'Staff') && (
                  <td>
                    <button className="btn btn-warning btn-sm" onClick={() => openEditModal(plan)}>
                      ከልስ
                    </button>
                  </td>
                )}
              </tr>
            );
          })
      )}
    </tbody>
  </table>
</div>

      {/* Insert/Edit Modal */}
      {(showInsertModal || showEditModal) && (
        <>
          <div className="modal fade show" style={{ display: 'block' }} tabIndex="-1">
            <div className="modal-dialog modal-xl">
              <div className="modal-content">
                <div className="modal-header bg-primary text-white">
                  <h5 className="modal-title">
                    {showEditModal ? 'ከልስ' : 'አስገባ'} ዕቅድ - {currentEthiopianYear()} E.C.
                  </h5>
                  <button type="button" className="btn-close btn-close-white" onClick={() => {
                    setShowInsertModal(false); 
                    setShowEditModal(false);
                    setModalError('');
                  }}></button>
                </div>
                <div className="modal-body">
                  {modalError && <div className="alert alert-danger">{modalError}</div>}
                  <div className="mb-4">
                    <label className="form-label fw-bold fs-5">ወረዳ</label>
                    <select className="form-select form-select-lg" value={modalWoreda} onChange={e => setModalWoreda(e.target.value)} disabled={showEditModal}>
                      <option value="">ወረዳ ምረጥ</option>
                      {woredas.map(w => <option key={w} value={w}>{w}</option>)}
                    </select>
                  </div>

                  <div className="row g-4">
                    {servicesList.map(service => {
                      const isKunet = kunetServices.includes(service.name);
                      const isNewari = newariServices.includes(service.name);
                      const categories = isKunet ? kunetCategories : isNewari ? newariCategories : [];

                      return (
                        <div key={service._id} className="col-md-6">
                          <div className="border rounded p-4 shadow-sm bg-light">
                            <h5 className="text-primary fw-bold mb-3">{service.name}</h5>
                            {categories.length > 0 ? categories.map(cat => (
                              <div key={cat} className="row mb-3 align-items-center">
                                <div className="col-5 text-end">
                                  <strong>{cat}:</strong>
                                </div>
                                <div className="col-7">
                                  <input
                                    type="number"
                                    min="0"
                                    className="form-control"
                                    value={planValues[service._id]?.[cat] || 0}
                                    onChange={e => handlePlanChange(service._id, cat, e.target.value)}
                                  />
                                </div>
                              </div>
                            )) : (
                              <div className="row align-items-center">
                                <div className="col-5 text-end">
                                  <strong>ጠቅላላ:</strong>
                                </div>
                                <div className="col-7">
                                  <input
                                    type="number"
                                    min="0"
                                    className="form-control"
                                    value={planValues[service._id]?.total || 0}
                                    onChange={e => handlePlanChange(service._id, 'total', e.target.value)}
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div className="modal-footer">
                  <button className="btn btn-secondary" onClick={() => { 
                    setShowInsertModal(false); 
                    setShowEditModal(false);
                    setModalError('');
                  }}>
                    ይቅር
                  </button>
                  <button className="btn btn-success btn-lg px-5" onClick={() => handleSubmitPlan(showEditModal)} disabled={modalLoading}>
                    {modalLoading ? 'በማስቀመጥ ላይ...' : 'አስቀምጥ'}
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div className="modal-backdrop fade show"></div>
        </>
      )}
    </div>
  );
}

export default PlanTable;