import axios from 'axios';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || `http://${window.location.hostname}:8080/api`,
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
export const getPublicTodaySummary = () => api.get('/reports/public/summary/today');
export const getPublicDailyProgress = (params) => api.get('/reports/public/summary/progress', { params });
export const getPublicReportsByDateAndService = (params = {}) => api.get('/reports/public/reports/by-date-service', { params });
export const createReport = (data) => api.post('/reports', data);
export const getTodaySummary = (params = {}) => api.get('/reports/summary/today', { params });
// Winner / Ranking endpoints
export const getLatestWinner = () => api.get('/reports/public/winner/latest');
export const announceWinner = () => api.post('/reports/winner/announce');
export const getDailyServiceProgress = (params) => api.get('/reports/summary/progress', { params });
export const getWoredas = (config = {}) => api.get('/reports/woredas', config);


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
export const loginUser = (data) => api.post('/users/login', data);
// Add these lines to your existing api.js file
export const getPlanSummary = (config = {}) => api.get('/plans/summary', config);
export const createPlan = (data, config = {}) => api.post('/plans', data, config);
// export const getWoredas = (config = {}) => api.get('/reports/woredas', config); // if not already there
export const getPlanVsReportAnalysis = (config) => {
  return api.get(`/analysis/plan-vs-report`, config);
};


export const getWoredaDetailedAnalysis = (woreda, config) => {
  return api.get(`/analysis/woreda/${encodeURIComponent(woreda)}`, config);
};

// Card Management APIs
export const addCardStock = (data) => api.post('/cards/stock', data);
export const transferCardStock = (data) => api.post('/cards/transfer', data);
export const reportVoidCard = (data) => api.post('/cards/void', data);
export const getCardStats = (params) => api.get('/cards/stats', { params });

// Sync & Remote Management APIs
export const triggerAtlasSync = () => api.post('/sync/atlas');
export const repairAtlasSync = () => api.post('/sync/atlas/repair');
export const cleanupDuplicates = () => api.post('/sync/cleanup-duplicates');
export const pushToAtlas = () => api.post('/sync/atlas/push');
export const repairRevenue = () => api.post('/sync/repair-revenue');
export const createRemoteOfficer = (data) => api.post('/remote-officers', data);
export const getRemoteStats = () => api.get('/ontime-reg/stats/today');
export const getRemoteReportPDF = (params) => api.get('/ontime-reg/report/pdf', { params, responseType: 'blob' });
export const getRemoteReportData = (params) => api.get('/ontime-reg/report/data', { params });

// Aggregate Sync APIs
export const getAggregateSyncStatus = () => api.get('/reports/sync/aggregate/status');
export const getSchedulerStatus = () => api.get('/reports/sync/scheduler/status');
export const getAtlasStats = () => api.get('/reports/sync/atlas-stats');
export const manualAggregateSync = () => api.post('/reports/sync/aggregate');
export const forceAggregateSync = () => api.post('/reports/sync/force');
export const getPublicAggregateStats = () => api.get('/reports/public/sync/aggregate-stats');
export const getPublicWoredaRanking = () => api.get('/reports/public/woreda-ranking');

export default api;