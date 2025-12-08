import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { getPlanVsReportAnalysis, getWoredaDetailedAnalysis } from '../services/api';
import 'bootstrap/dist/css/bootstrap.min.css';

function AnalysisDashboard() {
  const { user } = useContext(AuthContext);
  const [analysis, setAnalysis] = useState(null);
  const [detailedAnalysis, setDetailedAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedWoreda, setSelectedWoreda] = useState('');
  const [budgetYear, setBudgetYear] = useState('');
  const [quarter, setQuarter] = useState('yearly');

  useEffect(() => {
    if (user && (user.role === 'Admin' || user.role === 'Staff')) {
      fetchAnalysis();
    }
  }, [user, budgetYear, quarter]);

  const fetchAnalysis = async () => {
    try {
      setLoading(true);
      const params = {};
      if (budgetYear) params.budgetYear = budgetYear;
      if (quarter) params.quarter = quarter;
      
      const config = { 
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        params 
      };
      
      const response = await getPlanVsReportAnalysis(config);
      setAnalysis(response.data);
      setError('');
    } catch (err) {
      console.error('Analysis fetch error:', err);
      setError('Failed to load analysis data: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  const fetchWoredaAnalysis = async (woreda) => {
    try {
      setLoading(true);
      setError('');
      
      const params = {};
      if (budgetYear) params.budgetYear = budgetYear;
      if (quarter) params.quarter = quarter;
      
      const config = { 
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        params 
      };
      
      console.log('Fetching woreda analysis for:', woreda, 'quarter:', quarter);
      
      const response = await getWoredaDetailedAnalysis(woreda, config);
      console.log('Woreda analysis response:', response.data);
      
      setDetailedAnalysis(response.data);
      setSelectedWoreda(woreda);
    } catch (err) {
      console.error('Woreda analysis fetch error:', err);
      const errorMessage = err.response?.data?.message || err.message || 'Failed to load woreda analysis';
      setError(`Error loading ${woreda} analysis: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  // Get quarter display name
  const getQuarterDisplayName = (quarter) => {
    const quarters = {
      'yearly': 'ጠቅላላ ዓመት',
      '1': '1ኛ ሩብ ዓመት',
      '2': '2ኛ ሩብ ዓመት', 
      '3': '3ኛ ሩብ ዓመት',
      '4': '4ኛ ሩብ ዓመት'
    };
    return quarters[quarter] || quarter;
  };

  // Get cumulative quarter description
  const getQuarterDescription = (quarter) => {
    const descriptions = {
      'yearly': '(ሐምሌ - ሰኔ)',
      '1': '(ሐምሌ - መስከረም)',
      '2': '(ሐምሌ - ታህሳስ)',
      '3': '(ሐምሌ - መጋቢት)',
      '4': '(ሐምሌ - ሰኔ)'
    };
    return descriptions[quarter] || '';
  };

  const getPerformanceBadge = (performance) => {
    const variants = {
      በጣም_ጥሩ: 'success',
      ጥሩ: 'primary',
      አማካይ: 'warning',
      ከአማካይ_በታች: 'warning',
      ደካማ: 'danger',
      NEUTRAL: 'secondary'
    };
    return <span className={`badge bg-${variants[performance] || 'secondary'}`}>{performance}</span>;
  };

  const getAchievementColor = (rate) => {
    if (rate >= 90) return 'text-success';
    if (rate >= 75) return 'text-primary';
    if (rate >= 60) return 'text-warning';
    if (rate >= 40) return 'text-warning';
    return 'text-danger';
  };

  if (loading) return <div className="text-center mt-5"><div className="spinner-border"></div></div>;
  if (error && !analysis) return <div className="alert alert-danger m-5">{error}</div>;

  return (
    <div className="container-fluid mt-4">
      <div className="row">
        <div className="col-12">
          <h2 className="mb-4 text-primary text-center">
            አፈጻጸም ትንተና - {getQuarterDisplayName(quarter)} {getQuarterDescription(quarter)}
          </h2>
          
          {/* Error Alert */}
          {error && (
            <div className="alert alert-danger alert-dismissible fade show" role="alert">
              {error}
              <button type="button" className="btn-close" onClick={() => setError('')}></button>
            </div>
          )}

          {/* Filters */}
          <div className="row mb-4">
            <div className="col-md-3">
              <label className="form-label fw-bold text-white">በጀት ዓመተ</label>
              <select 
                className="form-select" 
                value={budgetYear} 
                onChange={(e) => setBudgetYear(e.target.value)}
              >
                <option value="">የአሁኑ ዓመት</option>
                <option value="2017">2017 ዓ.ም</option>
                <option value="2018">2018 ዓ.ም</option>
                <option value="2019">2019 ዓ.ም</option>
              </select>
            </div>
            <div className="col-md-4">
              <label className="form-label fw-bold text-white">ሩብ ዓመት</label>
              <select 
                className="form-select" 
                value={quarter} 
                onChange={(e) => setQuarter(e.target.value)}
              >
                <option value="yearly">ጠቅላላ ዓመት (ሐምሌ - ሰኔ)</option>
                <option value="1">1ኛ ሩብ (ሐምሌ - መስከረም)</option>
                <option value="2">2ኛ ሩብ (ሐምሌ - ታህሳስ)</option>
                <option value="3">3ኛ ሩብ (ሐምሌ - መጋቢት)</option>
                <option value="4">4ኛ ሩብ (ሐምሌ - ሰኔ)</option>
              </select>
            </div>
            <div className="col-md-5 d-flex align-items-end">
              <button 
                className="btn btn-primary"
                onClick={fetchAnalysis}
                disabled={loading}
              >
                {loading ? 'በማቀናበር ላይ...' : 'ትንተና አሳይ'}
              </button>
            </div>
          </div>

          {analysis && (
            <>
              {/* Overall Metrics */}
              <div className="row mb-4">
                <div className="col-12">
                  <div className="card">
                    <div className="card-header bg-primary text-white">
                      <h5 className="mb-0">
                        አጠቃላይ አፈጻጸም ማጠቃለያ - {getQuarterDisplayName(quarter)} {getQuarterDescription(quarter)}
                      </h5>
                    </div>
                    <div className="card-body">
                      <div className="row">
                        <div className="col-md-3 text-center">
                          <h3 className={getAchievementColor(analysis.overallMetrics.overallAchievementRate)}>
                            {analysis.overallMetrics.overallAchievementRate}%
                          </h3>
                          <p className="text-muted">አጠቃላይ አፈጻጸም</p>
                        </div>
                        <div className="col-md-3 text-center">
                          <h3>{analysis.overallMetrics.totalPlanned?.toLocaleString() || 0}</h3>
                          <p className="text-muted">
                            {quarter === 'yearly' ? 'ዓመታዊ ዕቅድ' : 'የሩብ ዓመት ዕቅድ'}
                          </p>
                        </div>
                        <div className="col-md-3 text-center">
                          <h3>{analysis.overallMetrics.totalReported?.toLocaleString() || 0}</h3>
                          <p className="text-muted">
                            {quarter === 'yearly' ? 'ዓመታዊ ሪፖርት' : 'የሩብ ዓመት ሪፖርት'}
                          </p>
                        </div>
                        <div className="col-md-3 text-center">
                          <h3 className="text-success">{analysis.overallMetrics.bestPerformingWoreda || 'N/A'}</h3>
                          <p className="text-muted">ምርጥ አፈጻጸም</p>
                        </div>
                      </div>
                      <div className="row mt-3">
                        <div className="col-12">
                          <div className="progress" style={{ height: '20px' }}>
                            <div 
                              className={`progress-bar ${
                                analysis.overallMetrics.overallAchievementRate >= 75 ? 'bg-success' :
                                analysis.overallMetrics.overallAchievementRate >= 50 ? 'bg-warning' : 'bg-danger'
                              }`}
                              style={{ width: `${Math.min(analysis.overallMetrics.overallAchievementRate, 100)}%` }}
                            >
                              {analysis.overallMetrics.overallAchievementRate}%
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Data Issues Alert */}
              {analysis.dataIssues && (
                <div className="row mb-4">
                  <div className="col-12">
                    <div className="card border-warning">
                      <div className="card-header bg-warning text-dark">
                        <h5 className="mb-0">የውሂብ ጥያቄዎች</h5>
                      </div>
                      <div className="card-body">
                        {analysis.dataIssues.plansWithoutReports && analysis.dataIssues.plansWithoutReports.length > 0 && (
                          <div className="alert alert-warning">
                            <strong>ያለ ሪፖርት ዕቅዶች:</strong> {analysis.dataIssues.plansWithoutReports.length} ወረዳዎች ዕቅድ አላቸው ነገር ግን ሪፖርት የላቸውም
                            <ul className="mb-0 mt-2">
                              {analysis.dataIssues.plansWithoutReports.map((issue, index) => (
                                <li key={index}>
                                  {issue.woreda} (ዕቅድ: {issue.planned})
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        
                        {analysis.dataIssues.reportsWithoutPlans && analysis.dataIssues.reportsWithoutPlans.length > 0 && (
                          <div className="alert alert-info">
                            <strong>ያለ ዕቅድ ሪፖርቶች:</strong> {analysis.dataIssues.reportsWithoutPlans.length} ወረዳዎች ሪፖርት አላቸው ነገር ግን ዕቅድ የላቸውም
                            <ul className="mb-0 mt-2">
                              {analysis.dataIssues.reportsWithoutPlans.map((issue, index) => (
                                <li key={index}>
                                  ወረዳ {issue.woreda} (ሪፖርቶች: {issue.reportCount})
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        
                        {(!analysis.dataIssues.plansWithoutReports || analysis.dataIssues.plansWithoutReports.length === 0) && 
                         (!analysis.dataIssues.reportsWithoutPlans || analysis.dataIssues.reportsWithoutPlans.length === 0) && (
                          <div className="alert alert-success">
                            <strong>ምንም የውሂብ ጥያቄ አልተገኘም:</strong> ሁሉም ወረዳዎች በትክክል ተጣጣለው።
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Woreda Performance Table */}
              <div className="row mb-4">
                <div className="col-12">
                  <div className="card">
                    <div className="card-header bg-secondary text-white">
                      <h5 className="mb-0">
                        የወረዳ አፈጻጸም ደረጃ - {getQuarterDisplayName(quarter)}
                      </h5>
                    </div>
                    <div className="card-body">
                      <div className="table-responsive">
                        <table className="table table-striped table-hover">
                          <thead>
                            <tr>
                              <th>ደረጃ</th>
                              <th>ወረዳ</th>
                              <th>{quarter === 'yearly' ? 'ዓመታዊ ዕቅድ' : 'የሩብ ዓመት ዕቅድ'}</th>
                              <th>{quarter === 'yearly' ? 'ዓመታዊ ሪፖርት' : 'የሩብ ዓመት ሪፖርት'}</th>
                              <th>የአፈጻጸም መጠን</th>
                              <th>አፈጻጸም</th>
                              <th>ድርጊት</th>
                            </tr>
                          </thead>
                          <tbody>
                            {analysis.performanceRankings?.byAchievementRate?.map((item, index) => (
                              <tr key={item.woreda}>
                                <td>
                                  <span className={`badge ${index < 3 ? 'bg-success' : 'bg-secondary'}`}>
                                    {item.rank}
                                  </span>
                                </td>
                                <td className="fw-bold">{item.woreda}</td>
                                <td>{analysis.woredaAnalysis?.[item.woreda]?.planned?.toLocaleString() || 0}</td>
                                <td>{analysis.woredaAnalysis?.[item.woreda]?.reported?.toLocaleString() || 0}</td>
                                <td>
                                  <span className={getAchievementColor(item.achievementRate)}>
                                    {item.achievementRate}%
                                  </span>
                                </td>
                                <td>{getPerformanceBadge(item.performance)}</td>
                                <td>
                                  <button 
                                    className="btn btn-sm btn-outline-primary"
                                    onClick={() => fetchWoredaAnalysis(item.woreda)}
                                    disabled={loading}
                                  >
                                    {loading && selectedWoreda === item.woreda ? 'በማቀናበር ላይ...' : 'ዝርዝር'}
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Service Performance */}
              <div className="row mb-4">
                <div className="col-12">
                  <div className="card">
                    <div className="card-header bg-info text-white">
                      <h5 className="mb-0">
                        የአገልግሎት አፈጻጸም ማጠቃለያ - {getQuarterDisplayName(quarter)}
                      </h5>
                    </div>
                    <div className="card-body">
                      <div className="row">
                        {analysis.serviceAnalysis && Object.entries(analysis.serviceAnalysis)
                          .sort(([,a], [,b]) => (b.achievementRate || 0) - (a.achievementRate || 0))
                          .map(([serviceName, service]) => (
                            <div key={serviceName} className="col-md-4 mb-3">
                              <div className="card h-100">
                                <div className="card-body">
                                  <h6 className="card-title">{serviceName}</h6>
                                  <div className="row">
                                    <div className="col-6">
                                      <small className="text-muted">
                                        {quarter === 'yearly' ? 'ዓመታዊ ዕቅድ' : 'የሩብ ዓመት ዕቅድ'}
                                      </small>
                                      <p className="mb-1">{service.totalPlanned || 0}</p>
                                    </div>
                                    <div className="col-6">
                                      <small className="text-muted">
                                        {quarter === 'yearly' ? 'ዓመታዊ ሪፖርት' : 'የሩብ ዓመት ሪፖርት'}
                                      </small>
                                      <p className="mb-1">{service.totalReported || 0}</p>
                                    </div>
                                  </div>
                                  <div className="progress mb-2" style={{ height: '8px' }}>
                                    <div 
                                      className={`progress-bar ${
                                        (service.achievementRate || 0) >= 75 ? 'bg-success' :
                                        (service.achievementRate || 0) >= 50 ? 'bg-warning' : 'bg-danger'
                                      }`}
                                      style={{ width: `${Math.min(service.achievementRate || 0, 100)}%` }}
                                    ></div>
                                  </div>
                                  <div className="d-flex justify-content-between">
                                    <span className={getAchievementColor(service.achievementRate || 0)}>
                                      {service.achievementRate || 0}%
                                    </span>
                                    {getPerformanceBadge(service.performance || 'NEUTRAL')}
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))
                        }
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Detailed Woreda Analysis */}
          {detailedAnalysis && (
            <div className="row mb-4">
              <div className="col-12">
                <div className="card">
                  <div className="card-header bg-warning text-dark">
                    <h5 className="mb-0">
                      ዝርዝር ትንተና: {selectedWoreda} - {getQuarterDisplayName(detailedAnalysis.quarter)} {getQuarterDescription(detailedAnalysis.quarter)}
                      <button 
                        className="btn btn-sm btn-outline-dark float-end"
                        onClick={() => setDetailedAnalysis(null)}
                        disabled={loading}
                      >
                        ዝጋ
                      </button>
                    </h5>
                  </div>
                  <div className="card-body">
                    {/* Woreda Summary */}
                    <div className="row mb-4">
                      <div className="col-md-3 text-center">
                        <h3 className={getAchievementColor(detailedAnalysis.summary?.achievementRate || 0)}>
                          {detailedAnalysis.summary?.achievementRate || 0}%
                        </h3>
                        <p className="text-muted">አጠቃላይ አፈጻጸም</p>
                      </div>
                      <div className="col-md-3 text-center">
                        <h3>{detailedAnalysis.summary?.totalPlanned || 0}</h3>
                        <p className="text-muted">
                          {detailedAnalysis.quarter === 'yearly' ? 'ዓመታዊ ዕቅድ' : 'የሩብ ዓመት ዕቅድ'}
                        </p>
                      </div>
                      <div className="col-md-3 text-center">
                        <h3>{detailedAnalysis.summary?.totalReported || 0}</h3>
                        <p className="text-muted">
                          {detailedAnalysis.quarter === 'yearly' ? 'ዓመታዊ ሪፖርት' : 'የሩብ ዓመት ሪፖርት'}
                        </p>
                      </div>
                      <div className="col-md-3 text-center">
                        <h3>{getPerformanceBadge(detailedAnalysis.summary?.performance || 'NEUTRAL')}</h3>
                        <p className="text-muted">አፈጻጸም</p>
                      </div>
                    </div>

                    {/* Service Breakdown with Categories */}
                    <h6>የአገልግሎት ስርጭት</h6>
                    <div className="table-responsive">
                      <table className="table table-sm table-striped">
                        <thead>
                          <tr>
                            <th>አገልግሎት</th>
                            <th>{detailedAnalysis.quarter === 'yearly' ? 'ዓመታዊ ዕቅድ' : 'የሩብ ዓመት ዕቅድ'}</th>
                            <th>{detailedAnalysis.quarter === 'yearly' ? 'ዓመታዊ ሪፖርት' : 'የሩብ ዓመት ሪፖርት'}</th>
                            <th>የአፈጻጸም መጠን</th>
                            <th>አፈጻጸም</th>
                          </tr>
                        </thead>
                        <tbody>
                          {detailedAnalysis.services && Object.entries(detailedAnalysis.services).map(([serviceName, service]) => (
                            <React.Fragment key={serviceName}>
                              {/* Main Service Row */}
                              <tr>
                                <td><strong>{serviceName}</strong></td>
                                <td>{service.planned || 0}</td>
                                <td>{service.reported || 0}</td>
                                <td>
                                  <span className={getAchievementColor(service.achievementRate || 0)}>
                                    {service.achievementRate || 0}%
                                  </span>
                                </td>
                                <td>{getPerformanceBadge(service.performance || 'NEUTRAL')}</td>
                              </tr>
                              
                              {/* Category Breakdown for Services with Categories */}
                              {service.categories && Object.keys(service.categories).length > 0 && 
                                Object.entries(service.categories).map(([category, catData]) => (
                                <tr key={`${serviceName}-${category}`} className="bg-light">
                                  <td style={{ paddingLeft: '2rem' }}>
                                    <small>↳ {category}</small>
                                  </td>
                                  <td><small>{catData.planned || 0}</small></td>
                                  <td><small>{catData.reported || 0}</small></td>
                                  <td>
                                    <small className={getAchievementColor(catData.achievementRate || 0)}>
                                      {catData.achievementRate || 0}%
                                    </small>
                                  </td>
                                  <td>
                                    <small>{getPerformanceBadge(getPerformanceLevel(catData.achievementRate || 0))}</small>
                                  </td>
                                </tr>
                              ))}
                            </React.Fragment>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Recommendations */}
                    {detailedAnalysis.recommendations && detailedAnalysis.recommendations.length > 0 && (
                      <div className="mt-4">
                        <h6>ምክሮች</h6>
                        {detailedAnalysis.recommendations.map((rec, index) => (
                          <div key={index} className={`alert ${
                            rec.type === 'CRITICAL' ? 'alert-danger' :
                            rec.type === 'WARNING' ? 'alert-warning' :
                            rec.type === 'SUCCESS' ? 'alert-success' : 'alert-info'
                          }`}>
                            <strong>{rec.type}:</strong> {rec.message}
                            <br />
                            <small><strong>ድርጊት:</strong> {rec.action}</small>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Helper function for performance level (needed in frontend for category badges)
function getPerformanceLevel(achievementRate) {
  if (achievementRate >= 90) return 'እጅግ_በጣም_ጥሩ';
  if (achievementRate >= 75) return 'በጣም_ጥሩ';
  if (achievementRate >= 60) return 'አማካይ';
  if (achievementRate >= 40) return 'ከአማካይ_በታች';
  return 'ደካማ';
}

export default AnalysisDashboard;