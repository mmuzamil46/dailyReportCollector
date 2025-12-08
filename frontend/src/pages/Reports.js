import { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { getServices, createReport } from '../services/api';
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
  });
  const [error, setError] = useState('');
  const { user } = useContext(AuthContext);

  // Service category mappings
  const serviceCategories = {
    'ልደት': ['በወቅቱ', 'በዘገየ', 'በነባር'],
    'ጋብቻ': ['በወቅቱ', 'በዘገየ', 'በነባር'],
    'ሞት': ['በወቅቱ', 'በዘገየ', 'በነባር'],
    'ፍቺ': ['በወቅቱ', 'በዘገየ', 'በነባር'],
    'ጉዲፈቻ': ['በወቅቱ', 'በዘገየ', 'በነባር'],
    'እርማት፣እድሳት እና ግልባጭ': [],
    'የነዋሪነት ምዝገባ': [],
    'መታወቂያ': ['አዲስ', 'እድሳት', 'ምትክ'],
    'ያላገባ': ['አዲስ', 'እድሳት', 'እርማት', 'ምትክ'],
    'መሸኛ': [],
    'የዝምድና አገልግሎት': [],
    'የነዋሪነት ማረጋገጫ': [],
    'በህይወት ስለመኖር': [],
  };

  // Service types for grouping
  const kunetServices = ['ልደት', 'ጋብቻ', 'ሞት', 'ፍቺ', 'ጉዲፈቻ', 'እርማት፣እድሳት እና ግልባጭ'];
  const newariServices = ['የነዋሪነት ምዝገባ', 'መታወቂያ', 'ያላገባ', 'መሸኛ', 'የዝምድና አገልግሎት', 'የነዋሪነት ማረጋገጫ', 'በህይወት ስለመኖር'];

  // Convert today's date to Ethiopian Calendar
  const today = new Date();
  const [year, month, day] = toEthiopian(today.getFullYear(), today.getMonth() + 1, today.getDate());
  const ethiopianDate = `${day}/${month}/${year}`;

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

  // Set woreda from user
  useEffect(() => {
    if (user?.woreda) {
      setFormData((prev) => ({ ...prev, woreda: user.woreda }));
    }
  }, [user]);

  // Handle input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name === 'serviceId') {
      const selectedService = services.find(s => s._id === value);
      const serviceName = selectedService ? selectedService.name : '';
      const categories = serviceCategories[serviceName] || [];
      setFormData({
        ...formData,
        serviceId: value,
        serviceCategory: categories.length > 0 ? '' : 'N/A',
        cardSerial: '',
        referenceNo: '',
        registrationNumber: '',
        letterNumber: '',
      });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  // Handle service category change
  const handleCategoryChange = (category) => {
    setFormData({ ...formData, serviceCategory: category });
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

    const selectedService = services.find(s => s._id === formData.serviceId);
    const serviceName = selectedService ? selectedService.name : '';
    const categories = serviceCategories[serviceName] || [];

    if (categories.length > 0 && !formData.serviceCategory) {
      setError('Please select a service category');
      return;
    }

    try {
      const response = await createReport({
        ...formData,
        reportedBy: user.id,
      });
      setFormData({
        serviceId: '',
        woreda: user.woreda,
        serviceCategory: '',
        date: new Date().toISOString().split('T')[0],
        cardSerial: '',
        referenceNo: '',
        registrationNumber: '',
        letterNumber: '',
      });
      setError('');
      alert('Report created successfully!');
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to create report');
    }
  };

  if (!user) {
    return <div>Please log in to add a report.</div>;
  }

  const selectedService = services.find(s => s._id === formData.serviceId);
  const serviceName = selectedService ? selectedService.name : '';
  const categories = serviceCategories[serviceName] || [];
  const showRegistrationNumber = ['የነዋሪነት ምዝገባ', 'መታወቂያ'].includes(serviceName);
  const showLetterNumber = ['መሸኛ', 'የዝምድና አገልግሎት', 'የነዋሪነት ማረጋገጫ', 'በህይወት ስለመኖር'].includes(serviceName);
  const showSerialAndReference = !showRegistrationNumber && !showLetterNumber;

  return (
    <div style={{ padding: '2rem' }} className='text-white'>
      <h2>አዲስ ሪፖርት መዝግብ</h2>
      <p>ቀን: {ethiopianDate} (የኢትዮጵያ ዘመን መቁጠሪያ)</p>
      <p>ወረዳ: {user.woreda || 'አይገኝም'}</p>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <form onSubmit={handleSubmit} className="report-form">
        <div>
          <label>አገልግሎት:</label>
          <select
            name="serviceId"
            value={formData.serviceId}
            onChange={handleInputChange}
            required
          >
            <option value="">አገልግሎት ይምረጡ</option>
            <optgroup label="የኩነት">
              {services.filter(s => kunetServices.includes(s.name)).map((service) => (
                <option key={service._id} value={service._id}>
                  {service.name}
                </option>
              ))}
            </optgroup>
            <optgroup label="የነዋሪዎች">
              {services.filter(s => newariServices.includes(s.name)).map((service) => (
                <option key={service._id} value={service._id}>
                  {service.name}
                </option>
              ))}
            </optgroup>
          </select>
        </div>
        {categories.length > 0 && (
          <div>
            <label>ምድብ:</label>
            <div className="checkbox-group">
              {categories.map((category) => (
                <label key={category}>
                  <input
                    type="checkbox"
                    checked={formData.serviceCategory === category}
                    onChange={() => handleCategoryChange(category)}
                  />
                  {category}
                </label>
              ))}
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
        {showSerialAndReference && (
          <>
            <div>
              <label>የካርድ ቁጥር:</label>
              <input
                type="text"
                name="cardSerial"
                value={formData.cardSerial}
                onChange={handleInputChange}
                maxLength="50"
                required
              />
            </div>
            <div>
              <label>የማመልከቻ ቁጥር:</label>
              <input
                type="text"
                name="referenceNo"
                value={formData.referenceNo}
                onChange={handleInputChange}
                maxLength="100"
                required
              />
            </div>
          </>
        )}
        <button type="submit">ሪፖርት ያስገቡ</button>
      </form>
    </div>
  );
}

export default Reports;