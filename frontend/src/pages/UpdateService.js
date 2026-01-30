import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getServiceById, updateService } from '../services/api';
import { AuthContext } from '../context/AuthContext';
import 'bootstrap/dist/css/bootstrap.min.css';
import './Services.css';

function UpdateService() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, token } = useContext(AuthContext);
  const [activeTab, setActiveTab] = useState('general'); // general, pricing, visibility, evidence
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    yearlyPlan: '',
    isActive: true,
    categories: [],
    price: 0,
    isSubcityOnly: false,
    requiresEvidence: false,
    evidenceTypes: [],
    showCardSerial: true,
    showReferenceNo: true,
    showRegistrationNumber: false,
    showLetterNumber: false,
  });
  
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchService = async () => {
      try {
        const config = { headers: { Authorization: `Bearer ${token}` } };
        const response = await getServiceById(id, config);
        const data = response.data;
        setFormData({
          name: data.name,
          description: data.description || '',
          yearlyPlan: data.yearlyPlan !== null ? data.yearlyPlan : '',
          isActive: data.isActive,
          categories: data.categories || [],
          price: data.price || 0,
          isSubcityOnly: data.isSubcityOnly || false,
          requiresEvidence: data.requiresEvidence || false,
          evidenceTypes: data.evidenceTypes || [],
          showCardSerial: data.showCardSerial !== undefined ? data.showCardSerial : true,
          showReferenceNo: data.showReferenceNo !== undefined ? data.showReferenceNo : true,
          showRegistrationNumber: data.showRegistrationNumber !== undefined ? data.showRegistrationNumber : false,
          showLetterNumber: data.showLetterNumber !== undefined ? data.showLetterNumber : false,
        });
        setLoading(false);
      } catch (err) {
        console.error('Error fetching service:', err);
        setError(err.response?.data?.message || 'Failed to load service data');
        setLoading(false);
      }
    };
    if (token) fetchService();
  }, [id, token]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleCategoryChange = (index, field, value) => {
    const newCategories = [...formData.categories];
    newCategories[index][field] = value;
    setFormData({ ...formData, categories: newCategories });
  };

  const addCategory = () => {
    setFormData({
      ...formData,
      categories: [...formData.categories, { name: '', price: 0, excludeFromReporting: false, hasPriceVariants: false, priceVariants: [] }],
    });
  };

  const removeCategory = (index) => {
    setFormData({ ...formData, categories: formData.categories.filter((_, i) => i !== index) });
  };

  const handleVariantChange = (catIndex, varIndex, field, value) => {
    const newCategories = [...formData.categories];
    newCategories[catIndex].priceVariants[varIndex][field] = value;
    setFormData({ ...formData, categories: newCategories });
  };

  const addVariant = (catIndex) => {
    const newCategories = [...formData.categories];
    if (!newCategories[catIndex].priceVariants) newCategories[catIndex].priceVariants = [];
    newCategories[catIndex].priceVariants.push({ label: '', price: 0 });
    newCategories[catIndex].hasPriceVariants = true;
    setFormData({ ...formData, categories: newCategories });
  };

  const removeVariant = (catIndex, varIndex) => {
    const newCategories = [...formData.categories];
    newCategories[catIndex].priceVariants.splice(varIndex, 1);
    if (newCategories[catIndex].priceVariants.length === 0) newCategories[catIndex].hasPriceVariants = false;
    setFormData({ ...formData, categories: newCategories });
  };

  const handleEvidenceTypeChange = (index, value) => {
    const newTypes = [...formData.evidenceTypes];
    newTypes[index] = value;
    setFormData({ ...formData, evidenceTypes: newTypes });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const payload = {
        ...formData,
        yearlyPlan: formData.yearlyPlan === '' ? null : Number(formData.yearlyPlan),
      };
      await updateService(id, payload, config);
      navigate('/services');
    } catch (err) {
      console.error('Error updating service:', err);
      setError(err.response?.data?.message || 'Failed to update service');
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="services-page d-flex justify-content-center align-items-center">
        <div className="text-center">
          <div className="spinner-border text-gold mb-3" style={{width: '4rem', height: '4rem'}} role="status"></div>
          <p className="text-soft-gold">Service configurations loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="services-page">
      <div className="glass-header">
        <div className="container">
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <button 
                className="btn btn-link text-soft-gold text-decoration-none mb-2 p-0 d-flex align-items-center"
                onClick={() => navigate('/services')}
              >
                <i className="fa-solid fa-chevron-left me-2"></i>ወደ ኋላ ተመለስ
              </button>
              <h1 className="premium-title display-6 mb-0">{formData.name} - ማስተካከያ</h1>
            </div>
            <div className={`badge-pro ${formData.isActive ? 'bg-success' : 'bg-danger'} d-none d-md-block`}>
               {formData.isActive ? 'Active Service' : 'Inactive Service'}
            </div>
          </div>
        </div>
      </div>

      <div className="container">
        <div className="row justify-content-center">
          <div className="col-xl-10">
            {error && (
              <div className="alert alert-danger border-0 shadow-lg mb-4">
                <i className="fas fa-exclamation-triangle me-2"></i>{error}
              </div>
            )}

            <div className="card-premium p-4 p-md-5 border-0 shadow-2xl">
              {/* Tabs Navigation */}
              <ul className="nav nav-tabs nav-tabs-premium">
                <li className="nav-item">
                  <button className={`nav-link ${activeTab === 'general' ? 'active' : ''}`} onClick={() => setActiveTab('general')}>
                    <i className="fa-solid fa-circle-info me-2"></i>ጠቅላላ መረጃ
                  </button>
                </li>
                <li className="nav-item">
                  <button className={`nav-link ${activeTab === 'pricing' ? 'active' : ''}`} onClick={() => setActiveTab('pricing')}>
                    <i className="fa-solid fa-tag me-2"></i>ክፍያና ምድቦች
                  </button>
                </li>
                <li className="nav-item">
                  <button className={`nav-link ${activeTab === 'visibility' ? 'active' : ''}`} onClick={() => setActiveTab('visibility')}>
                    <i className="fa-solid fa-layer-group me-2"></i>ፎርም ዝርዝር
                  </button>
                </li>
                <li className="nav-item">
                  <button className={`nav-link ${activeTab === 'evidence' ? 'active' : ''}`} onClick={() => setActiveTab('evidence')}>
                    <i className="fa-solid fa-file-contract me-2"></i>ማስረጃዎች
                  </button>
                </li>
              </ul>

              <form onSubmit={handleSubmit}>
                {/* General Section */}
                {activeTab === 'general' && (
                  <div className="tab-pane-premium animate__animated animate__fadeIn">
                    <div className="row g-4">
                      <div className="col-md-8">
                        <label className="label-high-contrast mb-2">የአገልግሎት ስም</label>
                        <input type="text" className="form-control contrast-input" name="name" value={formData.name} onChange={handleChange} required />
                      </div>
                      <div className="col-md-4">
                        <label className="label-high-contrast mb-2">ዓመታዊ ዕቅድ</label>
                        <input type="number" className="form-control contrast-input" name="yearlyPlan" value={formData.yearlyPlan} onChange={handleChange} />
                      </div>
                      <div className="col-12">
                        <label className="label-high-contrast mb-2">ገለጻ</label>
                        <textarea className="form-control contrast-input" name="description" rows="4" value={formData.description} onChange={handleChange} />
                      </div>
                      <div className="col-md-6 mt-4">
                         <div className="form-check form-switch card-premium p-3 border-0 bg-opacity-10" style={{background: '#ffffff08'}}>
                            <input className="form-check-input ms-0 me-3" type="checkbox" id="isActive" name="isActive" checked={formData.isActive} onChange={handleChange} style={{width: '2.5rem', height: '1.25rem'}} />
                            <label className="form-check-label fw-bold" htmlFor="isActive">አገልግሎቱ ክፍት ነው?</label>
                         </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Pricing Section */}
                {activeTab === 'pricing' && (
                  <div className="tab-pane-premium animate__animated animate__fadeIn">
                    <div className="row g-4 mb-5">
                       <div className="col-md-6">
                          <label className="label-high-contrast mb-2">መሰረታዊ ዋጋ (ETB)</label>
                          <input type="number" className="form-control contrast-input" name="price" value={formData.price} onChange={handleChange} />
                          <small className="text-secondary mt-2 d-block">ምድቦች ከሌሉ ይህ ዋጋ ጥቅም ላይ ይውላል።</small>
                       </div>
                    </div>

                    <div className="d-flex justify-content-between align-items-center mb-4">
                      <h5 className="text-gold mb-0">የአገልግሎት ምድቦች</h5>
                      <button type="button" className="btn btn-outline-gold btn-sm px-4 rounded-pill" onClick={addCategory}>
                        <i className="fa-solid fa-plus me-1"></i>ምድብ ጨምር
                      </button>
                    </div>

                    {formData.categories.map((cat, idx) => (
                      <div key={idx} className="category-item-pro">
                        <div className="row g-3 align-items-end">
                          <div className="col-md-5">
                            <label className="label-high-contrast small mb-2">የምድብ ስም</label>
                            <input type="text" className="form-control contrast-input" value={cat.name} onChange={e => handleCategoryChange(idx, 'name', e.target.value)} placeholder="ለምሳሌ፡ በወቅቱ" required />
                          </div>
                          <div className="col-md-3">
                            <label className="label-high-contrast small mb-2">ዋጋ</label>
                            <input type="number" className="form-control contrast-input" value={cat.price} onChange={e => handleCategoryChange(idx, 'price', Number(e.target.value))} disabled={cat.hasPriceVariants} />
                          </div>
                          <div className="col-md-3">
                             <div className="form-check mb-2">
                               <input className="form-check-input" type="checkbox" checked={cat.hasPriceVariants} onChange={e => handleCategoryChange(idx, 'hasPriceVariants', e.target.checked)} id={`pv-${idx}`} />
                               <label className="form-check-label small text-info" htmlFor={`pv-${idx}`}>የክፍያ ልዩነት አለው?</label>
                             </div>
                             <div className="form-check">
                               <input className="form-check-input" type="checkbox" checked={cat.excludeFromReporting} onChange={e => handleCategoryChange(idx, 'excludeFromReporting', e.target.checked)} id={`er-${idx}`} />
                               <label className="form-check-label small text-warning" htmlFor={`er-${idx}`}>ለሪፖርት አላስፈላጊ (Finance only)</label>
                             </div>
                          </div>
                          <div className="col-md-1 text-end">
                             <button type="button" className="btn btn-link text-danger p-0" onClick={() => removeCategory(idx)}><i className="fa-solid fa-trash-can fs-5"></i></button>
                          </div>
                        </div>

                        {cat.hasPriceVariants && (
                          <div className="mt-4 ps-4 border-start border-warning border-2">
                            <div className="d-flex justify-content-between align-items-center mb-3">
                               <span className="small text-warning fw-bold">የክፍያ ልዩነቶች (ለምሳሌ፡ ለውጭ ዜጎች)</span>
                               <button type="button" className="btn btn-link text-warning p-0 text-decoration-none small" onClick={() => addVariant(idx)}><i className="fas fa-plus-circle me-1"></i>ጨምር</button>
                            </div>
                            {cat.priceVariants?.map((v, vIdx) => (
                              <div key={vIdx} className="row g-2 mb-2">
                                <div className="col-md-6">
                                  <input type="text" className="form-control contrast-input form-control-sm" placeholder="መለያ" value={v.label} onChange={e => handleVariantChange(idx, vIdx, 'label', e.target.value)} required />
                                </div>
                                <div className="col-md-4">
                                  <input type="number" className="form-control contrast-input form-control-sm" placeholder="ዋጋ" value={v.price} onChange={e => handleVariantChange(idx, vIdx, 'price', Number(e.target.value))} required />
                                </div>
                                <div className="col-md-2">
                                   <button type="button" className="btn btn-link text-danger p-0 mt-1" onClick={() => removeVariant(idx, vIdx)}><i className="fas fa-times"></i></button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Visibility Section */}
                {activeTab === 'visibility' && (
                  <div className="tab-pane-premium animate__animated animate__fadeIn">
                    <h5 className="text-gold mb-4">የፎርም መረጃ አሳያይ (Field Visibility Settings)</h5>
                    <div className="row g-4">
                      {['showCardSerial', 'showReferenceNo', 'showRegistrationNumber', 'showLetterNumber'].map(field => (
                        <div key={field} className="col-md-6">
                           <div className="form-check card-premium p-3 border-0 bg-opacity-10 d-flex align-items-center">
                              <input className="form-check-input ms-0 me-3" type="checkbox" id={field} name={field} checked={formData[field]} onChange={handleChange} style={{width: '1.5rem', height: '1.5rem'}} />
                              <label className="form-check-label" htmlFor={field}>
                                 {field === 'showCardSerial' ? 'የሴሪያል ቁጥር (Serial Number)' : 
                                  field === 'showReferenceNo' ? 'የመጥቀሻ ቁጥር (Reference Number)' :
                                  field === 'showRegistrationNumber' ? 'የምዝገባ ቁጥር (Registration Number)' : 'የደብዳቤ ቁጥር (Letter Number)'}
                              </label>
                           </div>
                        </div>
                      ))}
                      <div className="col-12 mt-5">
                        <div className="form-check form-switch card-premium p-3 border-0 bg-opacity-10 border-warning border-start border-3" style={{background: '#ffd70005'}}>
                           <input className="form-check-input ms-0 me-3" type="checkbox" id="isSubcityOnly" name="isSubcityOnly" checked={formData.isSubcityOnly} onChange={handleChange} style={{width: '2.5rem', height: '1.25rem'}} />
                           <label className="form-check-label fw-bold text-warning" htmlFor="isSubcityOnly">ለወረዳ 15 (ክፍለ ከተማ) ብቻ የተፈቀደ አገልግሎት</label>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Evidence Section */}
                {activeTab === 'evidence' && (
                  <div className="tab-pane-premium animate__animated animate__fadeIn">
                    <div className="form-check form-switch card-premium p-4 border-0 bg-opacity-10 mb-5">
                       <input className="form-check-input ms-0 me-3" type="checkbox" id="requiresEvidence" name="requiresEvidence" checked={formData.requiresEvidence} onChange={handleChange} style={{width: '2.5rem', height: '1.25rem'}} />
                       <label className="form-check-label fw-bold h5 mb-0" htmlFor="requiresEvidence">ተጨማሪ ማስረጃ መያዝ አለበት?</label>
                    </div>

                    {formData.requiresEvidence && (
                      <div className="card-premium p-4 border-info border-opacity-25" style={{background: '#1e8ee405'}}>
                        <div className="d-flex justify-content-between align-items-center mb-4">
                           <h6 className="text-info fw-bold mb-0 text-uppercase">የማስረጃ አይነቶች ዝርዝር</h6>
                           <button type="button" className="btn btn-sm btn-outline-info rounded-pill px-3" onClick={() => setFormData({...formData, evidenceTypes: [...formData.evidenceTypes, '']})}>
                             <i className="fas fa-plus me-1"></i>አክል
                           </button>
                        </div>
                        <div className="row g-3">
                           {formData.evidenceTypes.map((type, idx) => (
                             <div key={idx} className="col-md-6 d-flex gap-2">
                               <input type="text" className="form-control contrast-input" placeholder="ለምሳሌ፡ የፍርድ ቤት ውሳኔ" value={type} onChange={e => handleEvidenceTypeChange(idx, e.target.value)} required />
                               <button type="button" className="btn btn-link text-danger p-0" onClick={() => setFormData({...formData, evidenceTypes: formData.evidenceTypes.filter((_, i) => i !== idx)})}><i className="fas fa-times-circle fs-5"></i></button>
                             </div>
                           ))}
                           {formData.evidenceTypes.length === 0 && <p className="text-center text-muted py-3">ቢያንስ አንድ የማስረጃ አይነት ይጻፉ።</p>}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div className="mt-5 pt-4 border-top border-white border-opacity-10 d-flex justify-content-between align-items-center">
                   <p className="text-secondary small mb-0 d-none d-md-block">ያስተካከሉት መረጃ እንዲቀመጥ "አዘምን" የሚለውን ይጫኑ።</p>
                   <div className="d-flex gap-3">
                     <button type="button" className="btn btn-outline-secondary px-4 py-2" onClick={() => navigate('/services')}>ይቅር</button>
                     <button type="submit" className="btn btn-premium-add px-5 py-2" disabled={saving}>
                       {saving ? <div className="spinner-border spinner-border-sm me-2" role="status"></div> : <i className="fas fa-save me-2"></i>}
                       {saving ? 'በመጫን ላይ...' : 'አዘምን'}
                     </button>
                   </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default UpdateService;