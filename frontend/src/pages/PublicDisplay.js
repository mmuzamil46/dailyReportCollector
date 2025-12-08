import React, { useState, useEffect } from 'react';
import { getServices, getPublicReports } from '../services/api';
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

  const modes = ['የዛሬ ሪፖርቶች በአገልግሎት', 'የዛሬ ሪፖርቶች በወረዳ', 'ዓመታዊ ስኬት'];
  
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

      const yearlyRes = await getPublicReports({ year: currentYear });
      setYearlyReports(yearlyRes.data);
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
    const socket = io('http://localhost:1000', {
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
        setCurrentMode((prev) => (prev + 1) % 3);
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

  const mode1Data = {
    labels: services.map(s => s.name),
    datasets: [
      {
        label: `ሪፖርቶች በቀን ${toEthiopianDate(new Date())}`,
        data: services.map(service => 
          todaysReports.filter(r => r.serviceId._id.toString() === service._id.toString()).length
        ),
        backgroundColor: '#05395e',
        borderColor: '#0a4a7a',
        borderWidth: 2,
        borderRadius: 5,
      },
    ],
  };

  const mode2Data = {};
  todaysReports.forEach(report => {
    const woreda = report.woreda;
    const serviceName = report.serviceId.name;
    if (!mode2Data[woreda]) mode2Data[woreda] = {};
    mode2Data[woreda][serviceName] = (mode2Data[woreda][serviceName] || 0) + 1;
  });

  const mode3Data = services.map(service => {
    const achieved = yearlyReports.filter(r => r.serviceId._id.toString() === service._id.toString()).length;
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

 // Replace the entire return statement with this compact version:

return (
  <div className="min-vh-100 bg-theme-gradient text-light pb-3">
    {/* Compact Header Section */}
    <div className="compact-header">
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

      {/* Compact Navigation Tabs */}
      <div className="row justify-content-center">
        <div className="col-12 col-lg-10">
          <ul className="nav nav-tabs justify-content-center compact-tabs">
            {modes.map((mode, index) => (
              <li className="nav-item" key={index}>
                <button
                  className={`nav-link ${currentMode === index ? 'active' : ''} position-relative`}
                  onClick={() => handleTabClick(index)}
                  style={{
                    color: currentMode === index ? 'white' : '#ffd700',
                    backgroundColor: currentMode === index ? '' : 'transparent',
                    border: 'none',
                    fontSize: '0.95rem',
                    padding: '0.5rem 1.2rem',
                    fontWeight: '600'
                  }}
                >
                  {mode}
                  {isAutoCycling && currentMode === index && (
                    <span className="auto-cycle-indicator">
                      <i className="fas fa-sync-alt me-1"></i>
                      አውቶ
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Mode 1: Today's Reports by Service - COMPACT */}
      {currentMode === 0 && (
        <div className="row justify-content-center animate__animated animate__fadeIn">
          <div className="col-12 col-lg-11">
            <div className="chart-container-compact">
              <h4 className="text-center mb-3 text-theme">
                <i className="fas fa-chart-bar me-2"></i>
                የዛሬ ሪፖርቶች በአገልግሎት
              </h4>
              {mode1Data.datasets[0].data.every(count => count === 0) ? (
                <div className="text-center py-5">
                  <i className="fas fa-inbox fa-2x text-muted mb-2"></i>
                  <p className="text-muted">ለዛሬ ቀን ምንም ሪፖርት አልተገኘም</p>
                </div>
              ) : (
                <div style={{ height: 'calc(100% - 60px)' }}>
                  <Bar
                    data={mode1Data}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: { 
                          position: 'top', 
                          labels: { 
                            font: { size: 14, weight: 'bold' },
                            color: '#05395e'
                          } 
                        },
                        title: { 
                          display: false
                        },
                        datalabels: {
                          anchor: 'end',
                          align: 'top',
                          color: '#05395e',
                          font: { size: 12, weight: 'bold' },
                          formatter: (value) => value > 0 ? value : '',
                        },
                      },
                      scales: {
                        y: { 
                          beginAtZero: true, 
                          ticks: { 
                            color: '#05395e', 
                            font: { size: 12, weight: 'bold' } 
                          },
                          grid: {
                            color: 'rgba(5, 57, 94, 0.1)'
                          }
                        },
                        x: { 
                          ticks: { 
                            color: '#05395e', 
                            font: { size: 11, weight: 'bold' } 
                          },
                          grid: {
                            color: 'rgba(5, 57, 94, 0.1)'
                          }
                        },
                      },
                    }}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Mode 2: Today's Reports by Woreda - COMPACT */}
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
                        <th style={{width: '120px'}} className="sticky-top">ወረዳ</th>
                        {services.map(s => (
                          <th key={s._id}>{s.name}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {Object.keys(mode2Data).sort((a,b)=>a-b).map(woreda => (
                        <tr key={woreda}>
                          <td className="fw-bold text-theme sticky-left">
                            {(woreda === '15')? 'ክፍለ ከተማ': woreda}
                          </td>
                          {services.map(service => (
                            <td key={service._id} className="text-center">
                              {mode2Data[woreda][service.name] || 0}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Mode 3: Yearly Achievement - COMPACT */}
      {currentMode === 2 && (
        <div className="row justify-content-center animate__animated animate__fadeIn">
          <div className="col-12 col-lg-11">
            <div className="chart-container-compact">
              <h4 className="text-center mb-3 text-theme">
                <i className="fas fa-trophy me-2"></i>
                ዓመታዊ ስኬት ከዕቅድ አንጻር
              </h4>
              {mode3Data.every(data => data.achieved === 0 && data.plan === null) ? (
                <div className="text-center py-5">
                  <i className="fas fa-inbox fa-2x text-muted mb-2"></i>
                  <p className="text-muted">ለዚህ ዓመት ምንም ሪፖርቶች ወይም ዕቅዶች አልተገኙም</p>
                </div>
              ) : (
                <div className="row h-100">
                  {/* Progress Cards - More Compact */}
                  <div className="col-md-6">
                    <div className="row" style={{ maxHeight: '100%', overflowY: 'auto' }}>
                      {mode3Data.map((data, index) => (
                        <div key={index} className="col-12 mb-3">
                          <div className="card border-0 shadow-sm h-100">
                            <div className="card-body text-center p-3">
                              <h6 className="card-title text-theme fw-bold mb-2" style={{ fontSize: '0.9rem' }}>{data.name}</h6>
                              <div className="progress mb-2" style={{ height: '20px' }}>
                                <div
                                  className={`progress-bar text-black fw-bold ${
                                    data.plan === null
                                      ? 'bg-secondary'
                                      : data.percent >= 100
                                      ? 'bg-success'
                                      : data.percent >= 80
                                      ? 'bg-warning'
                                      : 'bg-danger'
                                  }`}
                                  role="progressbar"
                                  style={{ width: data.plan === null ? '100%' : `${Math.min(data.percent, 100)}%`, fontSize: '0.8rem' }}
                                >
                                  {data.plan === null ? 'ዕቅድ የለም' : `${data.percent}%`}
                                </div>
                              </div>
                              <p className="mb-0 text-muted" style={{ fontSize: '0.8rem' }}>
                                <strong>ስኬት:</strong> {data.achieved} | <strong>ዕቅድ:</strong> {data.plan || 'አልተገኘም'}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  {/* Doughnut Chart */}
                  <div className="col-md-6">
                    <div style={{ height: '100%' }}>
                      <Doughnut
                        data={mode3ChartData}
                        options={{
                          responsive: true,
                          maintainAspectRatio: false,
                          plugins: {
                            legend: { 
                              position: 'bottom', 
                              labels: { 
                                font: { size: 11, weight: 'bold' },
                                color: '#05395e'
                              } 
                            },
                            title: { 
                              display: false
                            },
                            tooltip: {
                              callbacks: {
                                label: (context) => {
                                  const data = mode3Data[context.dataIndex];
                                  return `${data.name}: ${data.percent}% (${data.achieved}/${data.plan || 'ዕቅድ የለም'})`;
                                },
                              },
                            },
                            datalabels: {
                              color: '#fff',
                              font: { size: 10, weight: 'bold' },
                              formatter: (value) => value > 5 ? `${value}%` : '',
                            }
                          },
                        }}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  </div>
);
}

export default PublicDisplay;