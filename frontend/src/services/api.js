import axios from 'axios';

const api = axios.create({
  baseURL: 'http://10.23.76.202:1000/api', // Proxied to http://localhost:3000/api
});

api.interceptors.request.use((config) => {
  if (!config.url.includes('/public/')) {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
   
    
  }
  return config;
});

export const getServices = () => api.get('/services');
export const getPublicReports = (params = {}) => api.get('/reports/public/reports', { params });
export const getPublicReportsByDateAndService = (params = {}) => api.get('/reports/public/reports/by-date-service', { params });
export const createReport = (data) => api.post('/reports', data);


export const getServiceById = (id) => api.get(`/services/${id}`);
export const createService = (data) => api.post('/services', data);
export const updateService = (id, data) => api.put(`/services/${id}`, data);
export const deleteService = (id) => api.delete(`/services/${id}`);

export const getReports = (params = {}) => api.get('/reports', { params });
export const getReportById = (id) => api.get(`/reports/${id}`);
export const getReportsByDateAndService = (params) => api.get('/reports/by-date-service', { params });
//export const createReport = (data) => api.post('/reports', data);
export const updateReport = (id, data) => api.put(`/reports/${id}`, data);
export const deleteReport = (id) => api.delete(`/reports/${id}`);

export const getUsers = () => api.get('/users');
export const getUserById = (id) => api.get(`/users/${id}`);
export const updateUser = (id, data) => api.put(`/users/${id}`, data);
export const deleteUser = (id) => api.delete(`/users/${id}`);
export const registerUser = (data) => api.post('/users/register', data);
// Add these lines to your existing api.js file
export const getPlanSummary = (config = {}) => api.get('/plans/summary', config);
export const createPlan = (data, config = {}) => api.post('/plans', data, config);
export const getWoredas = (config = {}) => api.get('/reports/woredas', config); // if not already there
export const getPlanVsReportAnalysis = (config) => {
  return api.get(`/analysis/plan-vs-report`, config);
};

export const getWoredaDetailedAnalysis = (woreda, config) => {
  return api.get(`/analysis/woreda/${encodeURIComponent(woreda)}`, config);
};
export default api;