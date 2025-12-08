import React, { useState, useEffect, useContext } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, AreaChart, Area
} from 'recharts';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { getReports, getServices } from '../services/api';
import { AuthContext } from '../context/AuthContext';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';


// Custom CSS to fix date picker z-index issue
const customStyles = `
  .react-datepicker-popper {
    z-index: 9999 !important;
  }
  .react-datepicker {
    font-family: inherit;
    z-index: 9999;
  }
  .react-datepicker__triangle {
    display: none;
  }
`;

const DataAnalysisReport = () => {
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  const [reports, setReports] = useState([]);
  const [services, setServices] = useState([]);
  const [woredas, setWoredas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [analysisData, setAnalysisData] = useState({
    serviceTrends: [],
    woredaPerformance: [],
    dailyTrends: [],
    categoryDistribution: [],
    serviceDistributionByWoreda: [],
    serviceCategoryDistribution: []
  });

  const { user } = useContext(AuthContext);

  // Colors for charts - extended color palette for services
  const SERVICE_COLORS = [
    '#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', 
    '#82CA9D', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4',
    '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE',
    '#85C1E9', '#F8C471', '#82E0AA', '#F1948A', '#85C1E9'
  ];

  // Service categories configuration
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

  // Ethiopian months in Amharic
  const ethiopianMonths = [
    'መስከረም', 'ጥቅምት', 'ኅዳር', 'ታህሳስ', 'ጥር', 'የካቲት', 
    'መጋቢት', 'ሚያዝያ', 'ግንቦት', 'ሰኔ', 'ሐምሌ', 'ነሐሴ', 'ጳጉሜ'
  ];

  useEffect(() => {
    fetchServices();
  }, []);

  // Ethiopian date conversion function
  const toEthiopianDate = (gregorianDate) => {
    try {
      const date = new Date(gregorianDate);
      const gregYear = date.getFullYear();
      const gregMonth = date.getMonth() + 1;
      const gregDay = date.getDate();

      // Simple calculation based on the 8-year difference
      let ethYear = gregYear - 8;
      
      // Ethiopian New Year is September 11 (or 12 in Gregorian leap years)
      const newYearDay = (gregYear % 4 === 0) ? 12 : 11;
      
      // If date is before Ethiopian New Year, subtract one year
      if (gregMonth > 9 || (gregMonth === 9 && gregDay < newYearDay)) {
        ethYear++;
      }
      
      // Calculate month and day
      let ethMonth, ethDay;
      
      // Days from September new year
      const sept11 = new Date(gregYear, 8, newYearDay);
      const diffTime = date - sept11;
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays >= 0) {
        // After Ethiopian New Year
        ethMonth = Math.floor(diffDays / 30) + 1;
        ethDay = (diffDays % 30) + 1;
      } else {
        // Before Ethiopian New Year (previous Ethiopian year)
        const prevSept11 = new Date(gregYear - 1, 8, (gregYear - 1) % 4 === 0 ? 12 : 11);
        const prevDiffDays = Math.floor((date - prevSept11) / (1000 * 60 * 60 * 24));
        ethMonth = Math.floor(prevDiffDays / 30) + 1;
        ethDay = (prevDiffDays % 30) + 1;
      }
      
      // Handle Pagume (13th month)
      if (ethMonth === 13) {
        const daysInPagume = (ethYear % 4 === 3) ? 6 : 5;
        if (ethDay > daysInPagume) {
          ethMonth = 1;
          ethDay = 1;
          ethYear++;
        }
      }

      return {
        year: ethYear,
        month: ethMonth,
        day: ethDay,
        monthName: ethiopianMonths[ethMonth - 1] || 'መስከረም'
      };
    } catch (error) {
      console.error('Ethiopian date conversion error:', error);
      return null;
    }
  };

  // Format Ethiopian date for display
  const formatEthiopianDate = (gregorianDate) => {
    const ethDate = toEthiopianDate(gregorianDate);
    if (!ethDate) return 'Invalid Date';
    return `${ethDate.monthName}-${ethDate.day}-${ethDate.year}`;
  };

  // Get Amharic date range text
  const getAmharicDateRange = () => {
    const startEth = toEthiopianDate(startDate);
    const endEth = toEthiopianDate(endDate);
    
    if (!startEth || !endEth) return '';
    
    return `ከ ${startEth.monthName}-${startEth.day}-${startEth.year} እስከ ${endEth.monthName}-${endEth.day}-${endEth.year}`;
  };

  // Function to export table to PDF
 // Function to export table to PDF
const exportTableToPDF = async () => {
  // Check if html2canvas and jspdf are available
  if (typeof html2canvas !== 'undefined' && typeof jsPDF !== 'undefined') {
    // Use advanced PDF export
    try {
      const table = document.querySelector('.table-responsive table');
      const canvas = await html2canvas(table, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('landscape');
      const imgWidth = 280;
      const pageHeight = pdf.internal.pageSize.height;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 20;

      // Add title and date range
      pdf.setFontSize(16);
      pdf.setTextColor(44, 62, 80);
      pdf.text('የአገልግሎት ስርጭት በወረዳ', 20, 15);
      pdf.setFontSize(12);
      pdf.setTextColor(127, 140, 141);
      pdf.text(getAmharicDateRange(), 20, 25);

      pdf.addImage(imgData, 'PNG', 15, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      // Add new pages if needed
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 15, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      // Save the PDF
      pdf.save(`service_distribution_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      // Fallback to simple print method
      exportTableToPDFSimple();
    }
  } else {
    // Fallback to simple print method
    exportTableToPDFSimple();
  }
};

// Simple print-based PDF export (fallback)
const exportTableToPDFSimple = () => {
  // Create a temporary table element for printing
  const tableElement = document.createElement('div');
  tableElement.style.position = 'absolute';
  tableElement.style.left = '-9999px';
  tableElement.style.backgroundColor = 'white';
  tableElement.style.padding = '20px';
  tableElement.style.fontFamily = 'Arial, sans-serif';
  
  // Get Amharic date range
  const dateRange = getAmharicDateRange();
  
  // Build the table HTML (same as before)
  tableElement.innerHTML = `
    <div style="text-align: center; margin-bottom: 20px;">
      <h2 style="color: #2c3e50; margin-bottom: 5px;">የአገልግሎት ስርጭት በወረዳ</h2>
      <h3 style="color: #7f8c8d; margin-bottom: 10px;">${dateRange}</h3>
      <p style="color: #95a5a6; font-size: 14px;">የሚያገለግሉ ወረዳዎች: ${analysisData.serviceCategoryDistribution.length} | ጠቅላላ ሪፖርቶች: ${serviceCategoryTotals.grandTotal || 0}</p>
    </div>
    <table border="1" cellspacing="0" cellpadding="8" style="width: 100%; border-collapse: collapse; font-size: 12px;">
      <!-- Your table HTML here (same as before) -->
    </table>
    <div style="margin-top: 20px; text-align: center; color: #7f8c8d; font-size: 12px;">
      <p>Generated on: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}</p>
    </div>
  `;

  // Add to document
  document.body.appendChild(tableElement);

  // Use window.print() to print the table
  window.print();

  // Remove the temporary element after printing
  setTimeout(() => {
    document.body.removeChild(tableElement);
  }, 1000);
};

  // Alternative PDF export using html2canvas and jspdf (more complex but better formatting)
  const exportTableToPDFAdvanced = async () => {
    // Check if html2canvas and jspdf are available
    if (typeof html2canvas === 'undefined' || typeof jsPDF === 'undefined') {
      alert('PDF export libraries not loaded. Using print version instead.');
      exportTableToPDF();
      return;
    }

    try {
      const table = document.querySelector('.table-responsive table');
      const canvas = await html2canvas(table, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('landscape');
      const imgWidth = 280;
      const pageHeight = pdf.internal.pageSize.height;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 20;

      // Add title and date range
      pdf.setFontSize(16);
      pdf.setTextColor(44, 62, 80);
      pdf.text('የአገልግሎት ስርጭት በወረዳ', 20, 15);
      pdf.setFontSize(12);
      pdf.setTextColor(127, 140, 141);
      pdf.text(getAmharicDateRange(), 20, 25);

      pdf.addImage(imgData, 'PNG', 15, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      // Add new pages if needed
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 15, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      // Save the PDF
      pdf.save(`service_distribution_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      // Fallback to simple print method
      exportTableToPDF();
    }
  };

  const fetchServices = async () => {
    try {
      const response = await getServices();
      setServices(response.data);
    } catch (error) {
      console.error('Error fetching services:', error);
    }
  };

  const fetchReports = async () => {
    if (!startDate || !endDate) {
      alert('Please select both start and end dates');
      return;
    }

    setLoading(true);
    try {
      const response = await getReports();
      
      let allReports = response.data;
      
      // Filter by date range
      const filteredReports = allReports.filter(report => {
        const reportDate = new Date(report.date);
        return reportDate >= startDate && reportDate <= endDate;
      });
      
      setReports(filteredReports);
      
      // Extract unique woredas from filtered reports
      const uniqueWoredas = [...new Set(filteredReports.map(report => report.woreda))].filter(woreda => woreda);
      setWoredas(uniqueWoredas);
      
      analyzeData(filteredReports);
    } catch (error) {
      console.error('Error fetching reports:', error);
      alert('Error fetching reports');
    } finally {
      setLoading(false);
    }
  };

  // Function to format woreda name
  const formatWoredaName = (woreda) => {
    if (woreda === '15') return 'ክፍለ ከተማ';
    return woreda;
  };

  // Function to sort woredas with special handling for woreda 15
  const sortWoredas = (woredaData) => {
    return woredaData.sort((a, b) => {
      // Handle woreda 15 (ክፍለ ከተማ) - put it at the end
      if (a.originalWoreda === '15') return 1;
      if (b.originalWoreda === '15') return -1;
      
      // Convert to numbers for proper numeric sorting
      const numA = parseInt(a.originalWoreda);
      const numB = parseInt(b.originalWoreda);
      
      return numA - numB;
    });
  };

  const analyzeData = (reportsData) => {
    if (!reportsData.length) return;

    // 1. Service Trends - Most popular services
    const serviceCounts = {};
    reportsData.forEach(report => {
      const serviceName = report.serviceId?.name || 'Unknown';
      serviceCounts[serviceName] = (serviceCounts[serviceName] || 0) + 1;
    });

    const serviceTrends = Object.entries(serviceCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // 2. Woreda Performance - Which woredas are most active
    const woredaCounts = {};
    reportsData.forEach(report => {
      const woreda = report.woreda || 'Unknown';
      woredaCounts[woreda] = (woredaCounts[woreda] || 0) + 1;
    });

    const woredaPerformance = Object.entries(woredaCounts)
      .map(([woreda, count]) => ({ woreda, count }))
      .sort((a, b) => b.count - a.count);

    // 3. Daily Trends - Reports per day
    const dailyCounts = {};
    reportsData.forEach(report => {
      const date = new Date(report.date).toLocaleDateString();
      dailyCounts[date] = (dailyCounts[date] || 0) + 1;
    });

    const dailyTrends = Object.entries(dailyCounts)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => new Date(a.date) - new Date(b.date));

    // 4. Service Category Distribution
    const categoryCounts = {};
    reportsData.forEach(report => {
      const category = report.serviceCategory || 'No Category';
      categoryCounts[category] = (categoryCounts[category] || 0) + 1;
    });

    const categoryDistribution = Object.entries(categoryCounts)
      .map(([name, value]) => ({ name, value }))
      .filter(item => item.name !== 'No Category');

    // 5. Service Distribution by Woreda - COMPREHENSIVE VERSION FOR ALL WOREDAS
    const serviceDistributionByWoreda = [];
    const allWoredas = [...new Set(reportsData.map(report => report.woreda))].filter(woreda => woreda);
    const allServices = [...new Set(reportsData.map(report => report.serviceId?.name))].filter(service => service);

    allWoredas.forEach(woreda => {
      const woredaData = { 
        woreda: formatWoredaName(woreda),
        originalWoreda: woreda // Keep original for sorting
      };
      
      // Initialize all service counts to 0
      allServices.forEach(service => {
        woredaData[service] = 0;
      });
      
      // Count reports for each service in this woreda
      const woredaReports = reportsData.filter(report => report.woreda === woreda);
      woredaReports.forEach(report => {
        const serviceName = report.serviceId?.name;
        if (serviceName && woredaData[serviceName] !== undefined) {
          woredaData[serviceName]++;
        }
      });
      
      // Calculate total for this woreda
      woredaData.total = woredaReports.length;
      
      serviceDistributionByWoreda.push(woredaData);
    });

    // 6. Service Category Distribution by Woreda
    const serviceCategoryDistribution = [];
    
    allWoredas.forEach(woreda => {
      const woredaData = {
        woreda: formatWoredaName(woreda),
        originalWoreda: woreda
      };
      
      // Initialize all service categories
      Object.keys(serviceCategories).forEach(service => {
        const categories = serviceCategories[service];
        if (categories.length > 0) {
          categories.forEach(category => {
            woredaData[`${service}_${category}`] = 0;
          });
          woredaData[`${service}_total`] = 0;
        } else {
          // For services without categories
          woredaData[`${service}_total`] = 0;
        }
      });
      
      // Count reports for each service category in this woreda
      const woredaReports = reportsData.filter(report => report.woreda === woreda);
      woredaReports.forEach(report => {
        const serviceName = report.serviceId?.name;
        const category = report.serviceCategory;
        
        if (serviceName && serviceCategories[serviceName]) {
          const categories = serviceCategories[serviceName];
          if (categories.length > 0 && category && categories.includes(category)) {
            woredaData[`${serviceName}_${category}`]++;
            woredaData[`${serviceName}_total`]++;
          } else if (categories.length === 0) {
            // For services without categories
            woredaData[`${serviceName}_total`]++;
          }
        }
      });
      
      serviceCategoryDistribution.push(woredaData);
    });

    // Sort woredas with special handling for woreda 15
    const sortedServiceDistribution = sortWoredas(serviceDistributionByWoreda);
    const sortedServiceCategoryDistribution = sortWoredas(serviceCategoryDistribution);

    setAnalysisData({
      serviceTrends,
      woredaPerformance,
      dailyTrends,
      categoryDistribution,
      serviceDistributionByWoreda: sortedServiceDistribution,
      serviceCategoryDistribution: sortedServiceCategoryDistribution,
      allServices
    });
  };

  const getTotalMetrics = () => {
    return {
      totalReports: reports.length,
      totalWoredas: new Set(reports.map(r => r.woreda)).size,
      totalServices: new Set(reports.map(r => r.serviceId?.name)).size,
      averageDaily: reports.length / Math.max(analysisData.dailyTrends.length, 1)
    };
  };

  const metrics = getTotalMetrics();

  // Prepare data for the stacked service distribution chart
  const prepareStackedChartData = () => {
    return analysisData.serviceDistributionByWoreda.map(woreda => {
      const dataPoint = { woreda: woreda.woreda };
      analysisData.allServices?.forEach(service => {
        dataPoint[service] = woreda[service] || 0;
      });
      return dataPoint;
    });
  };

  // Custom tooltip for stacked chart
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="custom-tooltip bg-white p-3 border shadow-sm">
          <p className="font-weight-bold">{`ወረዳ: ${label}`}</p>
          {payload.map((entry, index) => (
            <p key={index} style={{ color: entry.color }}>
              {`${entry.name}: ${entry.value}`}
            </p>
          ))}
          <p className="font-weight-bold mt-2">
            ጠቅላላ: {payload.reduce((sum, entry) => sum + (entry.value || 0), 0)}
          </p>
        </div>
      );
    }
    return null;
  };

  // Calculate totals for service category table
  const calculateServiceCategoryTotals = () => {
    const totals = {};
    
    Object.keys(serviceCategories).forEach(service => {
      const categories = serviceCategories[service];
      if (categories.length > 0) {
        categories.forEach(category => {
          totals[`${service}_${category}`] = analysisData.serviceCategoryDistribution.reduce(
            (sum, woreda) => sum + (woreda[`${service}_${category}`] || 0), 0
          );
        });
      }
      totals[`${service}_total`] = analysisData.serviceCategoryDistribution.reduce(
        (sum, woreda) => sum + (woreda[`${service}_total`] || 0), 0
      );
    });
    
    totals.grandTotal = analysisData.serviceCategoryDistribution.reduce(
      (sum, woreda) => sum + (woreda.total || 0), 0
    );
    
    return totals;
  };

  const serviceCategoryTotals = calculateServiceCategoryTotals();

  return (
    <div className="container-fluid">
      {/* Add custom styles for date picker */}
      <style>{customStyles}</style>
      
      <div className="row">
        <div className="col-12">
          {/* Header with Amharic Date Range */}
          <div className="card mb-4">
            <div className="card-body">
              <h1 className="card-title text-primary">
                የመረጃ ትንተና ሪፖርት
              </h1>
              <p className="card-text text-muted">
                የአገልግሎት እና የወረዳ አፈጻጸም ትንተና
              </p>
              {reports.length > 0 && (
                <div className="mt-3 p-3 bg-light rounded">
                  <h6 className="text-success mb-2">የተመረጠ የቀን ክልል:</h6>
                  <p className="h5 text-primary mb-0">{getAmharicDateRange()}</p>
                </div>
              )}
            </div>
          </div>

          {/* Date Range Selector with Fixed Date Picker */}
          <div className="card mb-4">
            <div className="card-body">
              <div className="row align-items-end">
                <div className="col-md-3 mb-3">
                  <label className="form-label">የመጀመሪያ ቀን</label>
                  <DatePicker
                    selected={startDate}
                    onChange={setStartDate}
                    className="form-control"
                    dateFormat="yyyy-MM-dd"
                    popperClassName="date-picker-popper"
                    popperPlacement="bottom-start"
                    placeholderText="የመጀመሪያ ቀን ይምረጡ"
                  />
                  <small className="form-text text-muted">
                    ኢትዮጵያ: {formatEthiopianDate(startDate)}
                  </small>
                </div>
                <div className="col-md-3 mb-3">
                  <label className="form-label">የመጨረሻ ቀን</label>
                  <DatePicker
                    selected={endDate}
                    onChange={setEndDate}
                    className="form-control"
                    dateFormat="yyyy-MM-dd"
                    popperClassName="date-picker-popper"
                    popperPlacement="bottom-start"
                    placeholderText="የመጨረሻ ቀን ይምረጡ"
                  />
                  <small className="form-text text-muted">
                    ኢትዮጵያ: {formatEthiopianDate(endDate)}
                  </small>
                </div>
                <div className="col-md-3 mb-3">
                  <button
                    onClick={fetchReports}
                    disabled={loading}
                    className="btn btn-primary w-100 mt-4"
                  >
                    {loading ? 'በመጫን ላይ...' : 'ሪፖርት አውጣ'}
                  </button>
                </div>
                <div className="col-md-3 mb-3">
                  {reports.length > 0 && (
                    <div className="mt-4">
                      <p className="text-muted mb-0">የተገኙ ሪፖርቶች: {reports.length}</p>
                      <p className="text-muted mb-0">ወረዳዎች: {metrics.totalWoredas}</p>
                      <p className="text-muted mb-0">አገልግሎቶች: {metrics.totalServices}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {reports.length > 0 && (
            <>
              {/* Service Distribution by Woreda - MAIN SECTION AT TOP */}
              <div className="card mb-4">
                <div className="card-header bg-primary text-white d-flex justify-content-between align-items-center">
                  <h4 className="card-title mb-0">የአገልግሎት ስርጭት በወረዳ</h4>
              <button
  onClick={exportTableToPDF}
  className="btn btn-success btn-sm"
>
  📊 ሰንጠረዥ ወደ PDF አምጣ
</button>
                </div>
                <div className="card-body">
                  {/* Stacked Bar Chart */}
                  <div className="row mb-4">
                    <div className="col-12">
                      <h5 className="text-center mb-3">የአገልግሎት ስርጭት በወረዳ - ግራፍ</h5>
                      <ResponsiveContainer width="100%" height={500}>
                        <BarChart
                          data={prepareStackedChartData()}
                          margin={{ top: 20, right: 30, left: 20, bottom: 80 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis 
                            dataKey="woreda" 
                            angle={-45}
                            textAnchor="end"
                            height={80}
                            interval={0}
                          />
                          <YAxis />
                          <Tooltip content={<CustomTooltip />} />
                          <Legend 
                            layout="vertical"
                            verticalAlign="middle"
                            align="right"
                            wrapperStyle={{ right: 10, top: 0, bottom: 0 }}
                          />
                          {analysisData.allServices?.map((service, index) => (
                            <Bar 
                              key={service}
                              dataKey={service} 
                              stackId="a"
                              name={service}
                              fill={SERVICE_COLORS[index % SERVICE_COLORS.length]}
                            />
                          ))}
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Detailed Table with Service Categories */}
                  <div className="row">
                    <div className="col-12">
                      <div className="d-flex justify-content-between align-items-center mb-3">
                        <h5 className="text-center mb-0">የአገልግሎት ስርጭት በወረዳ - ሰንጠረዥ</h5>
                        <button
                          onClick={exportTableToPDF}
                          className="btn btn-outline-primary btn-sm"
                        >
                          📄 PDF አምጣ
                        </button>
                      </div>
                      <div className="table-responsive">
                        <table className="table table-bordered table-striped table-hover">
                          <thead className="table-dark">
                            <tr>
                              <th rowSpan="2" className="text-center align-middle">ወረዳ</th>
                              {Object.keys(serviceCategories).map(service => (
                                <th 
                                  key={service} 
                                  colSpan={serviceCategories[service].length > 0 ? serviceCategories[service].length + 1 : 1}
                                  className="text-center"
                                  style={{ backgroundColor: '#2c3e50' }}
                                >
                                  {service}
                                </th>
                              ))}
                              <th rowSpan="2" className="text-center align-middle">ጠቅላላ</th>
                            </tr>
                            <tr>
                              {Object.keys(serviceCategories).map(service => {
                                const categories = serviceCategories[service];
                                return (
                                  <React.Fragment key={service}>
                                    {categories.map(category => (
                                      <th 
                                        key={`${service}_${category}`} 
                                        className="text-center small"
                                        style={{ backgroundColor: '#34495e' }}
                                      >
                                        {category}
                                      </th>
                                    ))}
                                    <th 
                                      className="text-center small"
                                      style={{ backgroundColor: '#16a085' }}
                                    >
                                      ጠቅላላ
                                    </th>
                                  </React.Fragment>
                                );
                              })}
                            </tr>
                          </thead>
                          <tbody>
                            {analysisData.serviceCategoryDistribution.map((woredaData, index) => (
                              <tr key={woredaData.originalWoreda}>
                                <td className="fw-bold" style={{ backgroundColor: '#f8f9fa' }}>
                                  {woredaData.woreda}
                                </td>
                                {Object.keys(serviceCategories).map(service => {
                                  const categories = serviceCategories[service];
                                  return (
                                    <React.Fragment key={service}>
                                      {categories.map(category => (
                                        <td key={`${service}_${category}`} className="text-center">
                                          {woredaData[`${service}_${category}`] || 0}
                                        </td>
                                      ))}
                                      <td className="text-center fw-bold" style={{ backgroundColor: '#e8f6f3' }}>
                                        {woredaData[`${service}_total`] || 0}
                                      </td>
                                    </React.Fragment>
                                  );
                                })}
                                <td className="text-center fw-bold" style={{ backgroundColor: '#d5f4f0' }}>
                                  {woredaData.total || 0}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot className="table-info">
                            <tr>
                              <td className="fw-bold" style={{ backgroundColor: '#e3f2fd' }}>ጠቅላላ</td>
                              {Object.keys(serviceCategories).map(service => {
                                const categories = serviceCategories[service];
                                return (
                                  <React.Fragment key={service}>
                                    {categories.map(category => (
                                      <td 
                                        key={`${service}_${category}`} 
                                        className="text-center fw-bold" 
                                        style={{ backgroundColor: '#e3f2fd' }}
                                      >
                                        {serviceCategoryTotals[`${service}_${category}`] || 0}
                                      </td>
                                    ))}
                                    <td 
                                      className="text-center fw-bold" 
                                      style={{ backgroundColor: '#bbdefb' }}
                                    >
                                      {serviceCategoryTotals[`${service}_total`] || 0}
                                    </td>
                                  </React.Fragment>
                                );
                              })}
                              <td 
                                className="text-center fw-bold" 
                                style={{ backgroundColor: '#90caf9' }}
                              >
                                {serviceCategoryTotals.grandTotal || 0}
                              </td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Key Metrics */}
              <div className="row mb-4">
                <div className="col-md-3 mb-3">
                  <div className="card text-center bg-primary text-white">
                    <div className="card-body">
                      <h3 className="card-title">{metrics.totalReports}</h3>
                      <p className="card-text">ጠቅላላ ሪፖርቶች</p>
                    </div>
                  </div>
                </div>
                <div className="col-md-3 mb-3">
                  <div className="card text-center bg-success text-white">
                    <div className="card-body">
                      <h3 className="card-title">{metrics.totalWoredas}</h3>
                      <p className="card-text">ወረዳዎች</p>
                    </div>
                  </div>
                </div>
                <div className="col-md-3 mb-3">
                  <div className="card text-center bg-info text-white">
                    <div className="card-body">
                      <h3 className="card-title">{metrics.totalServices}</h3>
                      <p className="card-text">የአገልግሎት ዓይነቶች</p>
                    </div>
                  </div>
                </div>
                <div className="col-md-3 mb-3">
                  <div className="card text-center bg-warning text-white">
                    <div className="card-body">
                      <h3 className="card-title">{metrics.averageDaily.toFixed(1)}</h3>
                      <p className="card-text">አማካይ በቀን</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Rest of the charts */}
              <div className="row">
                {/* Service Trends */}
                <div className="col-lg-6 mb-4">
                  <div className="card">
                    <div className="card-header">
                      <h5 className="card-title mb-0">በጣም ተወዳጅ አገልግሎቶች</h5>
                    </div>
                    <div className="card-body">
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={analysisData.serviceTrends}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <Bar dataKey="count" fill="#8884d8" name="የአገልግሎት ብዛት" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>

                {/* Woreda Performance */}
                <div className="col-lg-6 mb-4">
                  <div className="card">
                    <div className="card-header">
                      <h5 className="card-title mb-0">የወረዳ አፈጻጸም</h5>
                    </div>
                    <div className="card-body">
                      <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                          <Pie
                            data={analysisData.woredaPerformance.slice(0, 6)}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ woreda, percent }) => `${formatWoredaName(woreda)} (${(percent * 100).toFixed(0)}%)`}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="count"
                          >
                            {analysisData.woredaPerformance.slice(0, 6).map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={SERVICE_COLORS[index % SERVICE_COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>

                {/* Daily Trends */}
                <div className="col-lg-6 mb-4">
                  <div className="card">
                    <div className="card-header">
                      <h5 className="card-title mb-0">ዕለታዊ አገልግሎት እድገት</h5>
                    </div>
                    <div className="card-body">
                      <ResponsiveContainer width="100%" height={300}>
                        <AreaChart data={analysisData.dailyTrends}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="date" />
                          <YAxis />
                          <Tooltip />
                          <Area type="monotone" dataKey="count" stroke="#8884d8" fill="#8884d8" />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>

                {/* Category Distribution */}
                <div className="col-lg-6 mb-4">
                  <div className="card">
                    <div className="card-header">
                      <h5 className="card-title mb-0">የአገልግሎት ምድብ ስርጭት</h5>
                    </div>
                    <div className="card-body">
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={analysisData.categoryDistribution}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                          <YAxis />
                          <Tooltip />
                          <Bar dataKey="value" fill="#82ca9d" name="ብዛት" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {reports.length === 0 && !loading && (
            <div className="card text-center">
              <div className="card-body py-5">
                <div className="text-muted display-1 mb-4">📊</div>
                <h3 className="card-title text-muted mb-2">
                  ምንም ውሂብ አልተገኘም
                </h3>
                <p className="card-text text-muted">
                  የተወሰነ የቀን ክልል ለመጠቀም በላይኛው ፎርም ውስጥ ቀኖችን ይምረጡ እና "ሪፖርት አውጣ" የሚለውን ይጫኑ
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DataAnalysisReport;