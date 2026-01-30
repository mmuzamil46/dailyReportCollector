import { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { getServices, createReport, getTodaySummary, getDailyServiceProgress, getWoredas } from '../services/api';
import { toEthiopian } from 'ethiopian-date';
import '../App.css';

function Reports() {
  const [services, setServices] = useState([]);
  const [formData, setFormData] = useState({
    serviceId: '',
    woreda: '',
    serviceCategory: '',
    date: new Date().toISOString().split('T')[0],
    cardSerial: '',
    referenceNo: '',
    registrationNumber: '',
    letterNumber: '',
    priceVariant: '',
    sourceWoreda: '',
    evidenceType: [],
    price: 0,
    payment: 0,
  });
  const [woredas, setWoredas] = useState([]);
  const [summary, setSummary] = useState({ totalCount: 0, totalRevenue: 0, byService: {} });
  const [woredaProgress, setWoredaProgress] = useState(null);
  const [error, setError] = useState('');
  const { user } = useContext(AuthContext);

  // Service category mappings

  // Service types for grouping
  const kunetServices = ['ልደት', 'ጋብቻ', 'ሞት', 'ፍቺ', 'ጉዲፈቻ', 'እርማት፣እድሳት እና ግልባጭ'];
  const newariServices = ['የነዋሪነት ምዝገባ', 'መታወቂያ', 'ያላገባ', 'መሸኛ', 'የዝምድና አገልግሎት', 'የነዋሪነት ማረጋገጫ', 'በህይወት ስለመኖር'];

  // Convert selected date to Ethiopian Calendar
  const getEthiopianDateStr = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const [year, month, day] = toEthiopian(date.getFullYear(), date.getMonth() + 1, date.getDate());
    return `${day}/${month}/${year}`;
  };

  const ethiopianDate = getEthiopianDateStr(formData.date);

  const normalizeWoreda = (w) => {
    if (!w || typeof w !== 'string') return w;
    return w.replace(/woreda|ወረዳ/gi, '').trim().replace(/^0+/, '') || '0';
  };
  
  const isSubcityUser = user?.woreda && normalizeWoreda(user.woreda) === '15';

  // Fetch services
  useEffect(() => {
    const fetchServices = async () => {
      try {
        const response = await getServices();
        setServices(response.data);
      } catch (error) {
        setError('Failed to fetch services');
        console.error('Error fetching services:', error);
      }
    };
    fetchServices();
  }, []);

  // Fetch woredas
  useEffect(() => {
    const fetchWoredas = async () => {
      try {
        const response = await getWoredas();
        setWoredas(response.data);
      } catch (err) {
        console.error('Error fetching woredas:', err);
      }
    };
    fetchWoredas();
  }, []);

  // Fetch today summary for user's woreda
  const fetchSummary = async () => {
    try {
      const params = user?.woreda ? { woreda: user.woreda } : {};
      const response = await getTodaySummary(params);
      setSummary(response.data);
    } catch (error) {
      console.error('Error fetching summary:', error);
    }
  };

  useEffect(() => {
    if (user?.woreda) {
      fetchSummary();
    }
  }, [user]); // Re-fetch when user becomes available

  // Fetch Woreda Progress
  useEffect(() => {
    const fetchProgress = async () => {
      if (user?.woreda) {
        try {
           const res = await getDailyServiceProgress({ woreda: user.woreda });
           setWoredaProgress(res.data);
        } catch (err) {
           console.error('Failed to fetch progress', err);
        }
      }
    };
    fetchProgress();
  }, [user, summary]); // Refresh when summary updates

  // Set woreda from user
  useEffect(() => {
    if (user?.woreda) {
      setFormData((prev) => ({ ...prev, woreda: user.woreda }));
    }
  }, [user]);

  const selectedService = services.find(s => s._id === formData.serviceId);
  const serviceName = selectedService ? selectedService.name : '';
  const categories = selectedService ? selectedService.categories || [] : [];

  // Handle input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name === 'serviceId') {
      const selectedService = services.find(s => s._id === value);
      const serviceName = selectedService ? selectedService.name : '';
      const categories = selectedService ? selectedService.categories || [] : [];
      setFormData({
        ...formData,
        serviceId: value,
        serviceCategory: categories.length > 0 ? '' : 'N/A',
        cardSerial: '',
        referenceNo: '',
        registrationNumber: '',
        letterNumber: '',
        priceVariant: '',
        sourceWoreda: '',
        evidenceType: [],
        price: selectedService?.yearlyPlan ? 0 : (selectedService?.categories?.length > 0 ? 0 : (selectedService?.price || 0)),
        payment: selectedService?.yearlyPlan ? 0 : (selectedService?.categories?.length > 0 ? 0 : (selectedService?.price || 0)),
      });
    } else if (name === 'priceVariant') {
      const selectedCategory = categories.find(c => c.name === formData.serviceCategory);
      const variant = selectedCategory?.priceVariants?.find(v => v.label === value);
      const price = variant ? variant.price : 0;
      setFormData({ ...formData, [name]: value, price, payment: price });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  // Handle service category change
  const handleCategoryChange = (categoryName) => {
    const category = categories.find(c => c.name === categoryName);
    const price = category && !category.hasPriceVariants ? category.price : 0;
    setFormData({ 
      ...formData, 
      serviceCategory: categoryName, 
      priceVariant: '',
      price: price,
      payment: price
    });
  };

  // Handle evidence selection toggle
  const toggleEvidence = (type) => {
    console.log('Toggling evidence:', type);
    setFormData(prev => {
      let current = prev.evidenceType;
      // Safety check for legacy string data or undefined
      if (!Array.isArray(current)) {
        current = typeof current === 'string' && current ? [current] : [];
      }
      const updated = current.includes(type)
        ? current.filter(t => t !== type)
        : [...current, type];
      console.log('Updated evidence list:', updated);
      return { ...prev, evidenceType: updated };
    });
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) {
      setError('You must be logged in to submit a report');
      return;
    }
    if (!user.woreda) {
      setError('User profile is missing woreda information');
      return;
    }
    if (!formData.serviceId) {
      setError('Please select a service');
      return;
    }

    const selectedCategory = categories.find(c => c.name === formData.serviceCategory);
    const serviceName = selectedService ? selectedService.name : '';

    if (categories.length > 0 && !formData.serviceCategory) {
      setError('Please select a service category');
      return;
    }

    if (selectedCategory?.hasPriceVariants && !formData.priceVariant) {
      setError('Please select a price variant (e.g. Citizenship)');
      return;
    }

    if (selectedService?.isSubcityOnly && !formData.sourceWoreda) {
      setError('Please select the source woreda');
      return;
    }

    if (selectedService?.requiresEvidence && (!formData.evidenceType || formData.evidenceType.length === 0)) {
      setError('Please select at least one evidence type');
      return;
    }

    try {
      await createReport({
        ...formData,
        reportedBy: user.id,
      });

      setFormData(prev => ({
        ...prev,
        serviceId: '',
        serviceCategory: '',
        cardSerial: '',
        referenceNo: '',
        registrationNumber: '',
        letterNumber: '',
        priceVariant: '',
        sourceWoreda: '',
        evidenceType: [],
      }));
      setError('');
      alert('Report created successfully!');
      fetchSummary(); // Refresh summary after insertion
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to create report');
    }
  };

  if (!user) {
    return <div>Please log in to add a report.</div>;
  }

  const showCardSerial = selectedService?.showCardSerial !== undefined ? selectedService.showCardSerial : true;
  const showReferenceNo = selectedService?.showReferenceNo !== undefined ? selectedService.showReferenceNo : true;
  const showRegistrationNumber = selectedService?.showRegistrationNumber !== undefined ? selectedService.showRegistrationNumber : false;
  const showLetterNumber = selectedService?.showLetterNumber !== undefined ? selectedService.showLetterNumber : false;

  return (
    <div style={{ padding: '2rem' }} className='text-white'>
      <div className="row mb-4">
        <div className="col-md-6">
          <label className="form-label small text-light text-uppercase fw-bold m-0">ሪፖርት የሚደረግበት ቀን (Reporting Date):</label>
          <div className="d-flex align-items-center gap-3">
            <input 
              type="date" 
              name="date" 
              className="form-control form-premium-input bg-dark text-white border-secondary w-auto"
              value={formData.date}
              onChange={handleInputChange}
              max={new Date().toISOString().split('T')[0]} // Prevent future dates
            />
            <div className="text-info fw-bold">
              <i className="far fa-calendar-alt me-2"></i>
              {ethiopianDate} (የኢትዮጵያ ዘመን መቁጠሪያ)
            </div>
          </div>
        </div>
        <div className="col-md-6 text-md-end">
          <div className="p-2 px-3 bg-dark bg-opacity-25 rounded border border-secondary d-inline-block">
            <span className="text-muted small text-uppercase">ወረዳ (Woreda):</span>
            <span className="ms-2 fw-bold text-warning">{user.woreda || 'አይገኝም'}</span>
          </div>
        </div>
      </div>
      {error && (
        <div className="alert alert-danger shadow-sm border-start border-4 border-danger animate__animated animate__shakeX">
          <i className="fas fa-exclamation-circle me-2"></i>
          {error}
        </div>
      )}
      
      <div className="row">
        {/* Main Form Area - Col 9 */}
        <div className="col-md-9">
          <form onSubmit={handleSubmit} className="report-form">
        <div>
          <label className="label-high-contrast mb-2">አገልግሎት (Service):</label>
          <select
            name="serviceId"
            className="form-select contrast-input mb-3"
            value={formData.serviceId}
            onChange={handleInputChange}
            required
          >
            <option value="">አገልግሎት ይምረጡ</option>
            <optgroup label="የኩነት">
              {services
                .filter(s => {
                  if (isSubcityUser) {
                    // Subcity users: show only subcity services + እርማት፣እድሳት እና ግልባጭ
                    return kunetServices.includes(s.name) && s.isActive && (s.isSubcityOnly || s.name === 'እርማት፣እድሳት እና ግልባጭ');
                  }
                  // Regular users: show non-subcity services
                  return kunetServices.includes(s.name) && s.isActive && !s.isSubcityOnly;
                })
                .map((service) => (
                <option key={service._id} value={service._id}>
                  {service.name}
                </option>
              ))}
            </optgroup>
            <optgroup label="የነዋሪዎች">
              {services
                .filter(s => {
                  if (isSubcityUser) {
                    // Subcity users: show only subcity services
                    return newariServices.includes(s.name) && s.isActive && s.isSubcityOnly;
                  }
                  // Regular users: show non-subcity services
                  return newariServices.includes(s.name) && s.isActive && !s.isSubcityOnly;
                })
                .map((service) => (
                <option key={service._id} value={service._id}>
                  {service.name}
                </option>
              ))}
            </optgroup>
            <optgroup label="ሌሎች አገልግሎቶች">
              {services
                .filter(s => {
                  if (isSubcityUser) {
                    // Subcity users: show only subcity services
                    return !kunetServices.includes(s.name) && !newariServices.includes(s.name) && s.isActive && s.isSubcityOnly;
                  }
                  // Regular users: show non-subcity services
                  return !kunetServices.includes(s.name) && !newariServices.includes(s.name) && s.isActive && !s.isSubcityOnly;
                })
                .map((service) => (
                <option key={service._id} value={service._id}>
                  {service.name}
                </option>
              ))}
            </optgroup>
          </select>
        </div>
        {categories.length > 0 && (
          <div className="mb-4">
            <label className="form-label small text-muted text-uppercase fw-bold mb-2">ምድብ:</label>
            <div className="checkbox-group">
              {categories.map((category) => (
                <label key={category.name} className="d-block mb-2">
                  <input
                    type="checkbox"
                    className="form-check-input me-2"
                    checked={formData.serviceCategory === category.name}
                    onChange={() => handleCategoryChange(category.name)}
                  />
                  <span className={formData.serviceCategory === category.name ? 'text-warning fw-bold' : ''}>
                    {category.name} {!category.hasPriceVariants && `(${category.price} ETB)`}
                  </span>
                  {category.excludeFromReporting && <span className="ms-2 badge bg-warning text-dark" style={{ fontSize: '0.7rem' }}>ገቢ ብቻ</span>}
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Subcity Source Woreda Selection */}
        {selectedService?.isSubcityOnly && (
          <div className="mb-4">
            <label className="form-label small text-muted text-uppercase fw-bold mb-2">የመጣበት ወረዳ (Source Woreda):</label>
            <select
              name="sourceWoreda"
              className="form-control form-premium-input bg-dark text-white border-secondary"
              value={formData.sourceWoreda}
              onChange={handleInputChange}
              required
            >
              <option value="" className="text-dark">ወረዳ ይምረጡ</option>
              {woredas.filter(w => normalizeWoreda(w) !== '15').sort((a,b) => parseInt(a)-parseInt(b)).map(w => (
                <option key={w} value={w} className="text-dark">ወረዳ {w}</option>
              ))}
            </select>
          </div>
        )}

        {/* Evidence Type Selection */}
        {selectedService?.requiresEvidence && (
          <div className="evidence-selection p-3 bg-dark bg-opacity-25 rounded mb-4 border border-info border-opacity-25 shadow-sm">
            <div className="d-flex justify-content-between align-items-center mb-2">
              <label className="text-info small fw-bold text-uppercase m-0">የቀረበ ማስረጃ (Evidence Document):</label>
              {formData.evidenceType.length > 0 && (
                <span className="badge bg-info text-white">{formData.evidenceType.length} ተመርጧል (Selected)</span>
              )}
            </div>
            <div className="d-flex gap-2 flex-wrap">
              {selectedService.evidenceTypes.map((type) => (
                <button
                  key={type}
                  type="button"
                  className={`btn btn-sm rounded-pill px-3 py-2 ${formData.evidenceType.includes(type) ? 'btn-info text-white shadow' : 'btn-outline-info'}`}
                  onClick={() => toggleEvidence(type)}
                >
                  <i className={`fas ${formData.evidenceType.includes(type) ? 'fa-check-double' : 'fa-file'} me-2`}></i>
                  {type}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Price Variant Selection */}
        {categories.find(c => c.name === formData.serviceCategory)?.hasPriceVariants && (
          <div className="variant-selection p-3 bg-dark bg-opacity-25 rounded mb-4 border border-warning border-opacity-25 shadow-sm">
            <label className="text-warning small fw-bold mb-2 d-block text-uppercase">የክፍያ ልዩነት ይምረጡ (Citizenship/Variant):</label>
            <div className="d-flex gap-2 flex-wrap">
              {(() => {
                const selectedCategory = categories.find(c => c.name === formData.serviceCategory);
                return selectedCategory?.priceVariants?.map((variant) => (
                  <button
                    key={variant.label}
                    type="button"
                    className={`btn btn-sm rounded-pill px-3 py-2 ${formData.priceVariant === variant.label ? 'btn-warning shadow' : 'btn-outline-warning'}`}
                    onClick={() => setFormData({ ...formData, priceVariant: variant.label, price: variant.price, payment: variant.price })}
                  >
                    <i className={`fas ${formData.priceVariant === variant.label ? 'fa-check-circle' : 'fa-circle'} me-2`}></i>
                    {variant.label} — <span className="fw-bold">{variant.price} ETB</span>
                  </button>
                ));
              })()}
            </div>
          </div>
        )}
        {showRegistrationNumber && (
          <div>
            <label>የምዝገባ ቁጥር:</label>
            <input
              type="text"
              name="registrationNumber"
              value={formData.registrationNumber}
              onChange={handleInputChange}
              maxLength="100"
              required
            />
          </div>
        )}
        {showLetterNumber && (
          <div>
            <label>የደብዳቤ ቁጥር:</label>
            <input
              type="text"
              name="letterNumber"
              value={formData.letterNumber}
              onChange={handleInputChange}
              maxLength="100"
              required
            />
          </div>
        )}
        {showCardSerial && (
          <div>
            <label>የካርድ ቁጥር (Serial Number):</label>
            <input
              type="text"
              className="form-control form-premium-input bg-dark text-white border-secondary"
              name="cardSerial"
              value={formData.cardSerial}
              onChange={handleInputChange}
              maxLength="50"
              required={!categories.find(c => c.name === formData.serviceCategory)?.excludeFromReporting}
            />
          </div>
        )}
        {showReferenceNo && (
          <div>
            <label>የማመልከቻ ቁጥር (Reference No):</label>
            <input
              type="text"
              className="form-control form-premium-input bg-dark text-white border-secondary"
              name="referenceNo"
              value={formData.referenceNo}
              onChange={handleInputChange}
              maxLength="100"
              required={!categories.find(c => c.name === formData.serviceCategory)?.excludeFromReporting}
            />
          </div>
        )}
        <button type="submit">ሪፖርት ያስገቡ</button>
      </form>

      <div className="mt-5 p-4 bg-light border rounded shadow">
        <h3 className="text-center text-dark mb-4 fw-bold">የዛሬው የሪፖርት ማጠቃለያ</h3>
        <div className="row text-center mb-4">
          <div className="col-md-6 mb-3">
            <div className="card border-0 shadow-sm bg-primary text-white p-3">
              <h4 className="small text-uppercase opacity-75">ጠቅላላ ብዛት</h4>
              <p className="h2 mb-0 fw-bold">{summary.totalCount}</p>
            </div>
          </div>
          <div className="col-md-6 mb-3">
            <div className="card border-0 shadow-sm bg-success text-white p-3">
              <h4 className="small text-uppercase opacity-75">ጠቅላላ ገቢ (ETB)</h4>
              <p className="h2 mb-0 fw-bold">{summary.totalRevenue.toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="table-responsive">
          <table className="table table-striped table-bordered mt-3">
            <thead className="table-secondary text-dark">
              <tr>
                <th style={{ color: '#000' }}>አገልግሎት</th>
                <th style={{ color: '#000' }}>ምድብ</th>
                <th style={{ color: '#000' }}>ብዛት</th>
              </tr>
            </thead>
            <tbody>
              {Object.keys(summary.byService).length === 0 ? (
                <tr>
                  <td colSpan="3" className="text-center text-muted py-4">ዛሬ የተመዘገበ ሪፖርት የለም</td>
                </tr>
              ) : (
                Object.keys(summary.byService).map(sName => (
                  Object.keys(summary.byService[sName].categories).map((cat, idx) => (
                    <tr key={`${sName}-${cat}`}>
                      {idx === 0 && (
                        <td 
                          rowSpan={Object.keys(summary.byService[sName].categories).length}
                          className="fw-bold align-middle"
                          style={{ color: '#000', backgroundColor: '#f8f9fa' }}
                        >
                          {sName}
                        </td>
                      )}
                      <td className="align-middle" style={{ color: '#000' }}>{cat}</td>
                      <td className="align-middle fw-bold font-monospace text-primary" style={{ color: '#007bff' }}>
                        {summary.byService[sName].categories[cat]}
                      </td>
                    </tr>
                  ))
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      </div>

    {/* Sidebar Area - Col 3 */}
    <div className="col-md-3">
        {woredaProgress && (
          <div className="card border-0 shadow-lg text-dark mb-4 sticky-top" style={{ top: '20px', zIndex: 1000 }}>
            <div className="card-header bg-warning text-dark fw-bold text-center">
              <i className="fas fa-chart-line me-2"></i>
              የዕለቱ አፈጻጸም
            </div>
            <div className="card-body p-3">
              {/* Overall Circular Progress */}
              <div className="text-center mb-4">
                 <div style={{ width: '120px', height: '120px', margin: '0 auto', borderRadius: '50%', background: `conic-gradient(${woredaProgress.overallAverage >= 100 ? '#198754' : woredaProgress.overallAverage >= 50 ? '#ffc107' : '#dc3545'} ${woredaProgress.overallAverage * 3.6}deg, #e9ecef 0deg)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                   <div style={{ width: '100px', height: '100px', borderRadius: '50%', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
                      <span className="h3 fw-bold mb-0">{woredaProgress.overallAverage}%</span>
                      <small className="text-muted" style={{ fontSize: '0.7rem' }}>አማካይ</small>
                   </div>
                 </div>
              </div>

              {/* Top 5 Services List */}
              <h6 className="border-bottom pb-2 mb-3 small fw-bold text-muted">የአገልግሎቶች ሁኔታ</h6>
              <div style={{ maxHeight: 'calc(100vh - 400px)', overflowY: 'auto' }}>
                {woredaProgress.services.map((s, idx) => (
                  <div key={idx} className="mb-3">
                    <div className="d-flex justify-content-between align-items-center mb-1">
                      <small className="fw-bold" style={{ fontSize: '0.8rem' }}>{s.name}</small>
                      <span className={`badge ${s.percentage >= 100 ? 'bg-success' : s.percentage >= 50 ? 'bg-warning' : 'bg-secondary'}`} style={{ fontSize: '0.7rem' }}>
                        {s.percentage}%
                      </span>
                    </div>
                    <div className="progress" style={{ height: '6px' }}>
                      <div 
                        className={`progress-bar ${s.percentage >= 100 ? 'bg-success' : s.percentage >= 50 ? 'bg-warning' : 'bg-danger'}`} 
                        role="progressbar" 
                        style={{ width: `${Math.min(s.percentage, 100)}%` }}
                      ></div>
                    </div>
                    <div className="text-end text-muted" style={{ fontSize: '0.7rem' }}>
                       {s.actual} / {s.dailyGoal}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
    </div>

    </div>
    </div>
  );
}

export default Reports;