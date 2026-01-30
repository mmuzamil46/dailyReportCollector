import React, { useState, useEffect } from 'react';
import { getServices, getPublicReports, getPublicTodaySummary, getPublicDailyProgress, getRemoteStats, getLatestWinner, getPublicAggregateStats, getPublicWoredaRanking } from '../services/api';
import { toEthiopian } from 'ethiopian-date';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement } from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import io from 'socket.io-client';
import 'bootstrap/dist/css/bootstrap.min.css';
import './PublicDisplay.css';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement, ChartDataLabels);

function PublicDisplay() {
  const [services, setServices] = useState([]);
  const [todaysReports, setTodaysReports] = useState([]);
  const [yearlyReports, setYearlyReports] = useState([]);
  const [currentMode, setCurrentMode] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isAutoCycling, setIsAutoCycling] = useState(true);
  const [summary, setSummary] = useState(null);
  const [dailyProgress, setDailyProgress] = useState(null);
  const [remoteStats, setRemoteStats] = useState(null);
  const [latestWinner, setLatestWinner] = useState(null);
  const [atlasAggregateStats, setAtlasAggregateStats] = useState(null);
  const [woredaRanking, setWoredaRanking] = useState([]);

  const modes = [
    'የዛሬ ሪፖርቶች በአገልግሎት', 
    'የዛሬ ሪፖርቶች በወረዳ', 
    'የዕለቱ የሥራ አፈጻጸም',
    'ወቅታዊ ምዝገባ (Live)',
    'ዓመታዊ ስኬት'
  ];
  
  const toEthiopianDate = (date) => {
    const [year, month, day] = toEthiopian(date.getFullYear(), date.getMonth() + 1, date.getDate());
    return `${day}/${month}/${year}`;
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');
      const today = new Date();
      const currentYear = today.getFullYear();

      const servicesRes = await getServices();
      setServices(servicesRes.data);

      const todaysRes = await getPublicReports({ date: 'today' });
      setTodaysReports(todaysRes.data);

      const summaryRes = await getPublicTodaySummary();
      setSummary(summaryRes.data);

      const progressRes = await getPublicDailyProgress({ woreda: '15' }); // Subcity default
      setDailyProgress(progressRes.data);

      const remoteRes = await getRemoteStats();
      setRemoteStats(remoteRes.data);

      const winnerRes = await getLatestWinner();
      setLatestWinner(winnerRes.data);

      const aggStatsRes = await getPublicAggregateStats();
      setAtlasAggregateStats(aggStatsRes.data.stats || []);

      const yearlyRes = await getPublicReports({ year: currentYear });
      setYearlyReports(yearlyRes.data);

      const rankingRes = await getPublicWoredaRanking();
      setWoredaRanking(rankingRes.data.rankings || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      setError('ዳታ ሊጫን አልተቻለም። እባክዎ ቆጣጣር ያድርጉ እና እንደገና ይሞክሩ።');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // WebSocket connection
  useEffect(() => {
    // Derive socket URL from API URL (remove /api suffix) or fallback to dynamic hostname
    const socketUrl = process.env.REACT_APP_API_URL 
      ? process.env.REACT_APP_API_URL.replace(/\/api$/, '') 
      : `http://${window.location.hostname}:8080`;
    const socket = io(socketUrl, {
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      transports: ['websocket'],
      query: { clientType: 'publicDisplay' },
    });

    socket.on('connect', () => {
      console.log('Connected to WebSocket server');
    });

    socket.on('newReport', (data) => {
      console.log('New report received:', data);
      fetchData();
    });

    socket.on('rankingUpdate', async (data) => {
      console.log('Ranking update received:', data);
      try {
        const rankingRes = await getPublicWoredaRanking();
        setWoredaRanking(rankingRes.data.rankings || []);
      } catch (error) {
        console.error('Error fetching updated ranking:', error);
      }
    });

    socket.on('disconnect', () => {
      console.log('Disconnected from WebSocket server');
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  useEffect(() => {
    let cycleInterval;
    if (isAutoCycling) {
      cycleInterval = setInterval(() => {
        setCurrentMode((prev) => (prev + 1) % modes.length);
      }, 30000);
    }
    return () => clearInterval(cycleInterval);
  }, [isAutoCycling]);

  const handleTabClick = (modeIndex) => {
    setCurrentMode(modeIndex);
    setIsAutoCycling(false);
    setTimeout(() => {
      setIsAutoCycling(true);
    }, 60000);
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center vh-100 bg-theme-gradient">
        <div className="text-center">
          <div className="spinner-border text-warning mb-3" style={{width: '3rem', height: '3rem'}} role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <h5 className="text-white">ዳታ እየጫነ ነው...</h5>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-vh-100 bg-theme-gradient text-light p-4">
        <div className="header-section">
          <div className="container">
            <div className="logo-container">
              <img src="/logwhite.JPG" alt="Logo" className="logo" />
              <div className="header-text">
                <h2>በአዲስ ከተማ ክፍለ ከተማ አስተዳደር</h2>
                <h3>የሲቪል ምዝገባ እና የነዋሪነት አገልግሎት ጽ/ቤት</h3>
              </div>
            </div>
          </div>
        </div>
        <div className="text-center mt-5">
          <h1 className="display-3 fw-bold text-warning">የዕለታዊ ሪፖርት መሰብሰቢያ</h1>
          <p className="text-danger fs-4">{error}</p>
        </div>
      </div>
    );
  }



  const mode2Data = {};
  todaysReports.forEach(report => {
    const woreda = report.woreda;
    const serviceName = report.serviceId.name;
    if (!mode2Data[woreda]) mode2Data[woreda] = {};
    mode2Data[woreda][serviceName] = (mode2Data[woreda][serviceName] || 0) + 1;
  });

  const mode3Data = services.map(service => {
    // Use aggregate stats (which are now synced from local calculations) for accuracy
    const stat = atlasAggregateStats ? atlasAggregateStats.find(s => s.serviceName === service.name) : null;
    const achieved = stat ? stat.totalCount : 0;
    
    const plan = service.yearlyPlan !== undefined ? service.yearlyPlan : null;
    const rawPercent = plan && plan > 0 ? (achieved / plan) * 100 : 0;
    const percent = rawPercent > 0 ? Number(rawPercent.toFixed(1)) : 0;
    return { name: service.name, achieved, plan, percent };
  });

  const mode3ChartData = {
    labels: mode3Data.map(d => d.name),
    datasets: [
      {
        label: 'የስኬት መጠን %',
        data: mode3Data.map(d => d.percent),
        backgroundColor: [
          '#05395e',
          '#0a4a7a',
          '#0f5b96',
          '#146cb0',
          '#197dca',
          '#1e8ee4',
          '#239ffe'
        ],
        borderColor: [
          '#042c4a',
          '#093d65',
          '#0e4e80',
          '#135f9b',
          '#1870b6',
          '#1d81d1',
          '#2292ec'
        ],
        borderWidth: 2,
      },
    ],
  };

  const getMedalColor = (rank) => {
    if (rank === 1) return '#FFD700'; // Gold
    if (rank === 2) return '#C0C0C0'; // Silver
    if (rank === 3) return '#CD7F32'; // Bronze
    return '#05395e'; // Default blue
  };

 // Replace the entire return statement with this compact version:

return (
  <div className="min-vh-100 bg-theme-gradient text-light pb-3">
    {/* Compact Header Section */}
    <div className="compact-header">
      {/* Sliding Winner Banner */}
      {latestWinner && (
        <div className="winner-sliding-banner">
          <div className="banner-content">
            <span className="trophy-icon">🏆</span>
            <span className="banner-text">
              የዕለቱ አሸናፊ: <strong className="winner-name">ወረዳ {latestWinner.woreda}</strong>  
              በ <strong className="winner-score">{latestWinner.score}%</strong> አፈጻጸም! 
              እንኳን ደስ አላችሁ! 🏆ወረዳ {latestWinner.woreda}  {latestWinner.score}% አፈጻጸም! 
            </span>
          </div>
        </div>
      )}
      <div className="container">
        <div className="compact-logo-container">
          <img src="./logwhite.JPG" alt="Logo" className="compact-logo" />
          <div className="compact-header-text">
            <h2>በአዲስ ከተማ ክፍለ ከተማ አስተዳደር</h2>
            <h3>የሲቪል ምዝገባ እና የነዋሪነት አገልግሎት ጽ/ቤት</h3>
          </div>
        </div>
      </div>
    </div>

    {/* Compact Main Content */}
    <div className="container-fluid mt-2">
      <div className="compact-main-title animate__animated animate__fadeIn">
        <div className="text-center">
          <h1 className="fw-bold text-warning mb-1">
            የዕለታዊ ሪፖርት መሰብሰቢያ
          </h1>
          <p className="text-light mb-0">
            <i className="fas fa-calendar-alt me-1"></i>
            ቀን: {toEthiopianDate(new Date())}
          </p>
        </div>
      </div>

      <div className="row justify-content-center">
        <div className="col-12 col-lg-11">
          <ul className="nav nav-tabs justify-content-center compact-tabs border-0 mb-3">
            {modes.map((mode, index) => (
              <li className="nav-item m-1" key={index}>
                <button
                  className={`nav-link rounded-pill ${currentMode === index ? 'active shadow-lg' : ''} position-relative`}
                  onClick={() => handleTabClick(index)}
                  style={{
                    color: currentMode === index ? 'white' : '#ffffffb3',
                    backgroundColor: currentMode === index ? '#05395e' : 'rgba(10, 74, 117, 0.5)',
                    border: 'none',
                    fontSize: '0.85rem',
                    padding: '0.4rem 1rem',
                    fontWeight: '600',
                    transition: 'all 0.3s ease'
                  }}
                >
                  {mode}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Mode 1: Today's Reports by Service - MERGED GRID DESIGN */}
      {currentMode === 0 && (
        <div className="row justify-content-center animate__animated animate__fadeIn">
          <div className="col-12 col-lg-11">
            <div className="chart-container-compact">
              {/* Header Title */}
              <h4 className="text-center mb-4 text-warning fw-bold border-bottom border-warning pb-2 d-inline-block mx-auto px-5">
                <i className="fas fa-th me-2"></i>
                የእለቱ ሪፖርት ማጠቃለያ
              </h4>

              <div className="row g-0" style={{maxHeight: 'calc(100vh - 350px)', overflowY: 'auto', padding: '0 10px'}}>
                  {/* Card 1: Total Revenue (Golden BG, Blue Text) */}
                  <div className="col-custom-7" style={{width: '14.28%', padding: '20px'}}>
                    <div className="card border-0 shadow-lg hover-elevate" 
                         style={{
                           aspectRatio: '1',
                           background: 'linear-gradient(135deg, #ffc107 0%, #ffca2c 100%)',
                           border: '3px solid #ffc107',
                           transform: 'scale(1.02)'
                         }}>
                      <div className="card-body p-1 d-flex flex-column justify-content-center align-items-center text-center h-100 position-relative">
                        <i className="fas fa-coins position-absolute top-0 start-50 translate-middle-x mt-2 opacity-25" style={{fontSize: '3rem', color: '#05395e'}}></i>
                        <div className="flex-grow-1 d-flex align-items-center justify-content-center">
                           <div className="fw-bold" style={{color: '#05395e', fontSize: '1.6rem', lineHeight: '1', zIndex: 1}}>
                             {(summary?.totalRevenue || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                           </div>
                        </div>
                        <h6 className="card-title fw-bold text-uppercase mb-2" style={{color: '#05395e', fontSize: '0.8rem', letterSpacing: '0.5px', zIndex: 1}}>ጠቅላላ ገቢ (ብር)</h6>
                      </div>
                    </div>
                  </div>

                  {/* Service Cards (Deep Blue BG, Golden Text) */}
                  {services.map(service => {
                     const count = todaysReports.filter(r => r.serviceId._id.toString() === service._id.toString()).length;
                     
                     return (
                      <div key={service._id} className="col-custom-7" style={{width: '14.28%', padding: '20px', display: 'inline-block'}}>
                        <div className="card border-0 shadow-sm hover-elevate" 
                             style={{
                               aspectRatio: '1',
                               background: 'linear-gradient(135deg, #05395e 0%, #002845 100%)',
                               border: count > 0 ? '3px solid #ffc107' : '1px solid rgba(255, 255, 255, 0.1)',
                               opacity: count > 0 ? 1 : 0.85
                             }}>
                          <div className="card-body p-1 d-flex flex-column justify-content-between align-items-center text-center h-100">
                             <div className="flex-grow-1 d-flex align-items-center justify-content-center w-100">
                                <span className="fw-bold text-white" style={{fontSize: '3.5rem', lineHeight: '1', textShadow: '2px 2px 4px rgba(0,0,0,0.5)'}}>
                                  {count}
                                </span>
                             </div>
                             <div className="w-100 pb-1">
                                <h6 className="card-title fw-bold text-truncate mb-0 px-1" 
                                    style={{
                                      color: '#ffc107', 
                                      fontSize: '0.85rem', 
                                      background: 'rgba(0,0,0,0.2)',
                                      borderRadius: '4px',
                                      padding: '2px 0'
                                    }}
                                    title={service.name}>
                                  {service.name}
                                </h6>
                             </div>
                          </div>
                        </div>
                      </div>
                     );
                  })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mode 2: Today's Reports by Woreda - NOW INDEX 1 */}
      {currentMode === 1 && (
        <div className="row justify-content-center animate__animated animate__fadeIn">
          <div className="col-12 col-lg-11">
            <div className="chart-container-compact">
              <h4 className="text-center mb-3 text-theme">
                <i className="fas fa-table me-2"></i>
                የዛሬ ሪፖርቶች በወረዳ እና አገልግሎት
              </h4>
              {Object.keys(mode2Data).length === 0 ? (
                <div className="text-center py-5">
                  <i className="fas fa-inbox fa-2x text-muted mb-2"></i>
                  <p className="text-muted">ለዛሬ ቀን ምንም ሪፖርት አልተገኘም</p>
                </div>
              ) : (
                <div className="table-container-compact">
                  <table className="table table-hover table-bordered table-sm">
                    <thead>
                      <tr>
                        <th style={{width: '80px'}} className="sticky-top text-center">ደረጃ</th>
                        <th style={{width: '120px'}} className="sticky-top">ወረዳ</th>
                        <th style={{width: '80px'}} className="sticky-top text-center">ድምር</th>
                        {services.map(s => (
                          <th key={s._id}>{s.name}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {woredaRanking.map(rankItem => {
                        const woreda = rankItem.woreda;
                        const getTrendIcon = (trend) => {
                          if (trend === 'up') return <span style={{color: '#28a745', fontSize: '1.2rem'}}>↑</span>;
                          if (trend === 'down') return <span style={{color: '#dc3545', fontSize: '1.2rem'}}>↓</span>;
                          return <span style={{color: '#6c757d', fontSize: '1.2rem'}}>—</span>;
                        };
                        
                        return (
                          <tr key={woreda}>
                            <td className="text-center fw-bold" style={{fontSize: '1.1rem'}}>
                              {rankItem.rank} {getTrendIcon(rankItem.trend)}
                            </td>
                            <td className="fw-bold text-theme sticky-left">
                              {(woreda === '15')? 'ክፍለ ከተማ': woreda}
                            </td>
                            <td className="text-center fw-bold text-warning" style={{fontSize: '1.1rem'}}>
                              {rankItem.totalServices}
                            </td>
                            {services.map(service => (
                              <td key={service._id} className="text-center">
                                {mode2Data[woreda]?.[service.name] || 0}
                              </td>
                            ))}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Mode 3: Daily Progress - NOW INDEX 2 */}
      {currentMode === 2 && (
        <div className="row justify-content-center animate__animated animate__fadeIn">
          <div className="col-12 col-lg-11">
            <div className="chart-container-compact overflow-hidden">
              <div className="d-flex justify-content-between align-items-center mb-4">
                <h4 className="text-theme fw-bold mb-0">
                  <i className="fas fa-tasks me-2"></i> የዛሬ የሥራ አፈጻጸም
                </h4>
                <div className="overall-score bg-theme text-white px-4 py-2 rounded-pill shadow-lg">
                  <span className="small opacity-75">ጠቅላላ አማካይ ስኬት: </span>
                  <span className="fs-4 fw-bold">{dailyProgress?.overallAverage || 0}%</span>
                </div>
              </div>
              <div className="row g-3 overflow-auto" style={{maxHeight: '70vh'}}>
                {dailyProgress?.services.map((service, idx) => (
                  <div key={idx} className="col-md-6 mb-2">
                    <div className="p-3 bg-white rounded-3 shadow-sm border-start border-5 border-theme h-100">
                      <div className="d-flex justify-content-between mb-2">
                        <span className="fw-bold text-dark">{service.name}</span>
                        <span className={`fw-bold ${service.percentage >= 80 ? 'text-success' : 'text-danger'}`}>
                          {service.percentage}%
                        </span>
                      </div>
                      <div className="progress mb-2" style={{height: '10px'}}>
                        <div className={`progress-bar ${service.percentage >= 80 ? 'bg-success' : service.percentage >= 50 ? 'bg-warning' : 'bg-danger'}`} 
                             role="progressbar" 
                             style={{width: `${service.percentage}%`}}></div>
                      </div>
                      <div className="d-flex justify-content-between small text-muted">
                        <span>ክንውን: <strong>{service.actual}</strong></span>
                        <span>ዕቅድ: <strong>{service.dailyGoal}</strong></span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mode 4: Remote Live Report - NOW INDEX 3 */}
      {currentMode === 3 && (
        <div className="row justify-content-center animate__animated animate__fadeIn">
          <div className="col-12 col-lg-11">
            <div className="chart-container-compact">
              <h4 className="text-center mb-4 text-theme fw-bold">
                 <i className="fas fa-satellite-dish me-3 text-danger pulse"></i>
                 ወቅታዊ ምዝገባ (Live Remote Status)
              </h4>
              <div className="row g-4 mb-4">
                <div className="col-md-4">
                  <div className="stat-card p-4 bg-primary text-white text-center rounded-4 shadow-lg">
                    <h1 className="display-4 fw-bold">{remoteStats?.total || 0}</h1>
                    <p className="mb-0 opacity-75">ጠቅላላ ምዝገባ</p>
                  </div>
                </div>
                <div className="col-md-8">
                   <div className="row g-3">
                      {remoteStats && Object.entries(remoteStats.byCategory).map(([cat, count]) => (
                        <div key={cat} className="col-4">
                           <div className="p-3 bg-theme-light rounded-4 text-center border border-white border-opacity-10 h-100">
                              <h3 className="text-white mb-1">{count}</h3>
                              <span className="text-warning small">{cat}</span>
                           </div>
                        </div>
                      ))}
                   </div>
                </div>
              </div>
              <div className="table-container-compact" style={{maxHeight: '50vh'}}>
                <table className="table table-hover table-sm">
                  <thead className="table-dark">
                    <tr>
                      <th>የተቋም ስም (ከአትላስ)</th>
                      <th className="text-center">ልደት</th>
                      <th className="text-center">ሞት</th>
                      <th className="text-center">ፍቺ</th>
                      <th className="text-center">ድምር</th>
                    </tr>
                  </thead>
                  <tbody>
                    {remoteStats && Object.entries(remoteStats.byFacility).map(([name, data]) => (
                      <tr key={name}>
                        <td className="fw-bold">{name}</td>
                        <td className="text-center">{data['ልደት']}</td>
                        <td className="text-center">{data['ሞት']}</td>
                        <td className="text-center">{data['ፍቺ']}</td>
                        <td className="text-center fw-bold text-theme">{data.total}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Mode 5: Yearly Achievement - NOW INDEX 4 */}
      {currentMode === 4 && (
        <div className="row justify-content-center animate__animated animate__fadeIn">
          <div className="col-12 col-lg-11">
            <div className="chart-container-compact">
              <h4 className="text-center mb-4  fw-bold" style={{color: '#002845'}}>
                <i className="fas fa-trophy me-2"></i>
                ዓመታዊ ስኬት ከዕቅድ አንጻር
              </h4>
              {mode3Data.every(data => data.achieved === 0 && data.plan === null) ? (
                <div className="text-center py-5">
                  <i className="fas fa-inbox fa-2x text-muted mb-2"></i>
                  <p className="text-muted">ለዚህ ዓመት ምንም ሪፖርቶች ወይም ዕቅዶች አልተገኙም</p>
                </div>
              ) : (
                <div className="row g-0" style={{maxHeight: 'calc(100vh - 350px)', overflowY: 'auto', padding: '0 10px'}}>
                  {mode3Data.map((data, index) => {
                    const circumference = 2 * Math.PI * 35;
                    const strokeDashoffset = data.plan && data.plan > 0 
                      ? circumference - (data.percent / 100) * circumference 
                      : 0;
                    
                    return (
                      <div key={index} className="col-custom-7" style={{width: '14.28%', padding: '20px', display: 'inline-block'}}>
                        <div className="card border-0 shadow-sm hover-elevate" 
                             style={{
                               aspectRatio: '1',
                               background: 'linear-gradient(135deg, #05395e 0%, #002845 100%)',
                               border: data.plan !== null ? '3px solid #ffc107' : '1px solid rgba(255, 255, 255, 0.1)',
                               opacity: data.plan !== null ? 1 : 0.85
                             }}>
                          <div className="card-body p-1 d-flex flex-column justify-content-between align-items-center text-center h-100">
                             <div className="flex-grow-1 d-flex align-items-center justify-content-center w-100">
                                <div className="circular-progress-container-small">
                                  <svg className="circular-progress-small" width="80" height="80">
                                    {/* Background Circle */}
                                    <circle
                                      cx="40"
                                      cy="40"
                                      r="35"
                                      stroke="rgba(255, 255, 255, 0.2)"
                                      strokeWidth="6"
                                      fill="none"
                                    />
                                    {/* Progress Circle */}
                                    <circle
                                      cx="40"
                                      cy="40"
                                      r="35"
                                      stroke={
                                        data.plan === null 
                                          ? 'rgba(255, 255, 255, 0.3)'
                                          : data.percent >= 100
                                          ? '#28a745'
                                          : data.percent >= 80
                                          ? '#ffc107'
                                          : '#dc3545'
                                      }
                                      strokeWidth="6"
                                      fill="none"
                                      strokeDasharray={circumference}
                                      strokeDashoffset={strokeDashoffset}
                                      strokeLinecap="round"
                                      transform="rotate(-90 40 40)"
                                      className="progress-circle-small"
                                    />
                                  </svg>
                                  {/* Percentage in Center */}
                                  <div className="progress-text-small">
                                    {data.plan === null ? (
                                      <span className="no-plan-text-small">ዕቅድ የለም</span>
                                    ) : (
                                      <span className="percentage-text-small">{data.percent}%</span>
                                    )}
                                  </div>
                                </div>
                             </div>
                             <div className="w-100 pb-1">
                                <h6 className="card-title fw-bold text-truncate mb-0 px-1" 
                                    style={{
                                      color: '#ffc107', 
                                      fontSize: '0.75rem', 
                                      background: 'rgba(0,0,0,0.2)',
                                      borderRadius: '4px',
                                      padding: '2px 0'
                                    }}
                                    title={data.name}>
                                  {data.name}
                                </h6>
                                <div className="d-flex justify-content-between mt-1 px-1">
                                  <span className="text-white-50" style={{fontSize: '0.65rem'}}>ዕቅድ: {data.plan || '0'}</span>
                                  <span className="text-success" style={{fontSize: '0.65rem'}}>ስኬት: {data.achieved}</span>
                                </div>
                             </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
/* ... */
    </div>
  </div>
);
}

export default PublicDisplay;