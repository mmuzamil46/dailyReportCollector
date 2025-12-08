const Plan = require('../models/Plan');
const Report = require('../models/Report');
const Service = require('../models/Service');
const { getCurrentEthiopianYear, getEthiopianYearFromDate } = require('../utils/ethiopianDate');
const { getCumulativeQuarterDateRange , calculateCumulativeQuarterlyPlans } = require('../utils/quarterCalculator');
// Helper function to normalize woreda format
const normalizeWoreda = (woreda) => {
  if (!woreda) return '';
  
  // If it's already in "Woreda X" format, extract the number
  if (woreda.startsWith('Woreda ')) {
    return woreda.replace('Woreda ', '');
  }
  
  // If it's just a number, return it as is
  return woreda.toString();
};

// Helper function to convert to plan woreda format
const toPlanWoredaFormat = (woreda) => {
  if (!woreda) return '';
  
  // If it's already in "Woreda X" format, return as is
  if (woreda.startsWith('Woreda ')) {
    return woreda;
  }
  
  // If it's just a number, convert to "Woreda X" format
  return `Woreda ${woreda}`;
};

// @desc    Get comprehensive plan vs report analysis
// @route   GET /api/analysis/plan-vs-report
// @access  Private (Admin/Staff)
const getPlanVsReportAnalysis = async (req, res) => {
  try {
    const { budgetYear, quarter } = req.query;
    
    // Use current Ethiopian year if not provided
    const targetBudgetYear = budgetYear || getCurrentEthiopianYear().toString();
    const targetQuarter = quarter || 'yearly';
    
    console.log(`Analysis for budget year: ${targetBudgetYear}, quarter: ${targetQuarter}`);

    // Get cumulative date range for reports
    let dateFilter = {};
    if (targetQuarter === 'yearly') {
      const { startDate, endDate } = getCumulativeQuarterDateRange(targetBudgetYear, 4);
      dateFilter = { date: { $gte: startDate, $lte: endDate } };
    } else {
      const quarterNum = parseInt(targetQuarter);
      const { startDate, endDate } = getCumulativeQuarterDateRange(targetBudgetYear, quarterNum);
      dateFilter = { date: { $gte: startDate, $lte: endDate } };
    }

    console.log('Date filter for reports:', dateFilter);

    // Get all plans for the budget year
    const plans = await Plan.find({ budgetYear: targetBudgetYear })
      .populate('services.serviceId', 'name')
      .lean();

    // Get all reports within cumulative date range
    const reports = await Report.find(dateFilter)
      .populate('serviceId', 'name')
      .lean();

    console.log(`Found ${plans.length} plans and ${reports.length} reports`);

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

    // Initialize analysis structure
    const analysis = {
      budgetYear: targetBudgetYear,
      quarter: targetQuarter,
      dateRange: dateFilter,
      overallMetrics: {
        totalPlanned: 0,
        totalReported: 0,
        overallAchievementRate: 0,
        averageWoredaPerformance: 0,
        bestPerformingWoreda: '',
        worstPerformingWoreda: '',
        totalWoredas: plans.length,
        totalReports: reports.length
      },
      woredaAnalysis: {},
      serviceAnalysis: {},
      performanceRankings: {
        byAchievementRate: [],
        byVolume: [],
        byConsistency: []
      },
      dataIssues: {
        woredaMismatch: [],
        plansWithoutReports: [],
        reportsWithoutPlans: []
      }
    };

    // Process each woreda
    // for (const plan of plans) {
    //   const woreda = plan.woreda;
    //   const normalizedWoreda = normalizeWoreda(woreda);
      
    //   analysis.woredaAnalysis[woreda] = {
    //     planned: 0,
    //     reported: 0,
    //     achievementRate: 0,
    //     services: {},
    //     performanceScore: 0,
    //     ranking: 0,
    //     reportCount: 0,
    //     normalizedWoreda: normalizedWoreda
    //   };

    //   // Calculate planned and reported for each service in this woreda
    //   for (const servicePlan of plan.services) {
    //     const serviceName = servicePlan.serviceId.name;
    //     const categories = serviceCategories[serviceName] || [];
        
    //     // Get yearly plan
    //     const yearlyPlan = servicePlan.plan || 0;
        
    //     // Calculate cumulative quarterly plan
    //     let plannedValue = 0;
    //     if (targetQuarter === 'yearly') {
    //       plannedValue = yearlyPlan;
    //     } else {
    //       const quarterlyPlans = calculateCumulativeQuarterlyPlans(yearlyPlan);
    //       plannedValue = quarterlyPlans[`q${targetQuarter}`] || 0;
    //     }

    //     // Get reported value for this service in this woreda - USE NORMALIZED WOREDA
    //     const serviceReports = reports.filter(r => {
    //       const reportWoreda = normalizeWoreda(r.woreda);
    //       return r.serviceId && 
    //              r.serviceId.name === serviceName && 
    //              reportWoreda === normalizedWoreda;
    //     });
        
    //     const reportedValue = serviceReports.length;

    //     // Calculate achievement rate
    //     const achievementRate = plannedValue > 0 ? (reportedValue / plannedValue) * 100 : 0;

    //     analysis.woredaAnalysis[woreda].services[serviceName] = {
    //       planned: plannedValue,
    //       reported: reportedValue,
    //       achievementRate: Math.round(achievementRate * 100) / 100,
    //       performance: getPerformanceLevel(achievementRate),
    //       yearlyPlan: yearlyPlan
    //     };

    //     // Accumulate woreda totals
    //     analysis.woredaAnalysis[woreda].planned += plannedValue;
    //     analysis.woredaAnalysis[woreda].reported += reportedValue;
    //     analysis.woredaAnalysis[woreda].reportCount += reportedValue;
    //   }

     
    // }
// Process each woreda
// In getPlanVsReportAnalysis function, update the service plan calculation:

// First, let's pre-calculate the total yearly plan for each service in each woreda
const yearlyPlanTotals = {};

for (const plan of plans) {
  const woreda = plan.woreda;
  if (!yearlyPlanTotals[woreda]) {
    yearlyPlanTotals[woreda] = {};
  }
  
  // Group plans by service
  for (const servicePlan of plan.services) {
    const serviceName = servicePlan.serviceId.name;
    if (!yearlyPlanTotals[woreda][serviceName]) {
      yearlyPlanTotals[woreda][serviceName] = 0;
    }
    yearlyPlanTotals[woreda][serviceName] += servicePlan.plan || 0;
  }
}

console.log('Yearly plan totals by woreda:', yearlyPlanTotals);

// Now process each woreda with the correct yearly totals
for (const plan of plans) {
  const woreda = plan.woreda;
  const normalizedWoreda = normalizeWoreda(woreda);
  
  analysis.woredaAnalysis[woreda] = {
    planned: 0,
    reported: 0,
    achievementRate: 0,
    services: {},
    performanceScore: 0,
    ranking: 0,
    reportCount: 0,
    normalizedWoreda: normalizedWoreda
  };

  // Calculate planned and reported for each service in this woreda
  // We need to process each service only once, not per category
  const servicesProcessed = new Set();
  
  for (const servicePlan of plan.services) {
    const serviceName = servicePlan.serviceId.name;
    
    // Skip if we've already processed this service
    if (servicesProcessed.has(serviceName)) {
      continue;
    }
    servicesProcessed.add(serviceName);
    
    const categories = serviceCategories[serviceName] || [];
    
    // Get the TOTAL yearly plan for this service (sum of all categories)
    const yearlyPlan = yearlyPlanTotals[woreda][serviceName] || 0;
    
    // Calculate cumulative quarterly plan from TOTAL yearly plan
    let plannedValue = 0;
    if (targetQuarter === 'yearly') {
      plannedValue = yearlyPlan;
    } else {
      const quarterlyPlans = calculateCumulativeQuarterlyPlans(yearlyPlan);
      plannedValue = quarterlyPlans[`q${targetQuarter}`] || 0;
    }

    // Get reported value for this service in this woreda
    const normalizedWoreda = normalizeWoreda(woreda);
    const serviceReports = reports.filter(r => {
      const reportWoreda = normalizeWoreda(r.woreda);
      return r.serviceId && 
             r.serviceId.name === serviceName && 
             reportWoreda === normalizedWoreda;
    });
    
    const reportedValue = serviceReports.length;

    // Calculate achievement rate
    const achievementRate = plannedValue > 0 ? (reportedValue / plannedValue) * 100 : 0;

    analysis.woredaAnalysis[woreda].services[serviceName] = {
      planned: plannedValue,
      reported: reportedValue,
      achievementRate: Math.round(achievementRate * 100) / 100,
      performance: getPerformanceLevel(achievementRate),
      yearlyPlan: yearlyPlan,
      // Store category breakdown for debugging
      categoryBreakdown: categories.length > 0 ? {} : null
    };

    // If it's a categorized service, also store per-category data
    if (categories.length > 0) {
      const categoryData = {};
      
      // Get all plans for this service (all categories)
      const servicePlans = plan.services.filter(sp => sp.serviceId.name === serviceName);
      
      for (const category of categories) {
        // Find plan for this specific category
        const categoryPlan = servicePlans.find(sp => sp.category === category);
        const categoryYearlyPlan = categoryPlan ? categoryPlan.plan : 0;
        
        // Calculate category quarterly plan
        let categoryPlannedValue = 0;
        if (targetQuarter === 'yearly') {
          categoryPlannedValue = categoryYearlyPlan;
        } else {
          const categoryQuarterlyPlans = calculateCumulativeQuarterlyPlans(categoryYearlyPlan);
          categoryPlannedValue = categoryQuarterlyPlans[`q${targetQuarter}`] || 0;
        }
        
        // Get category reports
        const categoryReports = reports.filter(r => {
          const reportWoreda = normalizeWoreda(r.woreda);
          return r.serviceId && 
                 r.serviceId.name === serviceName && 
                 r.serviceCategory === category &&
                 reportWoreda === normalizedWoreda;
        });
        
        const categoryReportedValue = categoryReports.length;
        const categoryAchievementRate = categoryPlannedValue > 0 ? 
          (categoryReportedValue / categoryPlannedValue) * 100 : 0;
        
        categoryData[category] = {
          planned: categoryPlannedValue,
          reported: categoryReportedValue,
          achievementRate: Math.round(categoryAchievementRate * 100) / 100,
          yearlyPlan: categoryYearlyPlan
        };
      }
      
      analysis.woredaAnalysis[woreda].services[serviceName].categoryBreakdown = categoryData;
    }

    // Accumulate woreda totals
    analysis.woredaAnalysis[woreda].planned += plannedValue;
    analysis.woredaAnalysis[woreda].reported += reportedValue;
    analysis.woredaAnalysis[woreda].reportCount += reportedValue;
    
  }

  // Rest of the code remains the same...
   // Calculate woreda achievement rate
      const woredaPlanned = analysis.woredaAnalysis[woreda].planned;
      const woredaReported = analysis.woredaAnalysis[woreda].reported;
      analysis.woredaAnalysis[woreda].achievementRate = 
        woredaPlanned > 0 ? Math.round((woredaReported / woredaPlanned) * 100 * 100) / 100 : 0;
      
      analysis.woredaAnalysis[woreda].performanceScore = 
        calculatePerformanceScore(analysis.woredaAnalysis[woreda]);

      // Track data issues
      if (analysis.woredaAnalysis[woreda].reported === 0 && analysis.woredaAnalysis[woreda].planned > 0) {
        analysis.dataIssues.plansWithoutReports.push({
          woreda: woreda,
          normalizedWoreda: normalizedWoreda,
          planned: analysis.woredaAnalysis[woreda].planned
        });
      }
}
    // Track reports without matching plans
    const planWoredas = plans.map(p => normalizeWoreda(p.woreda));
    const reportWoredas = [...new Set(reports.map(r => normalizeWoreda(r.woreda)))];
    
    analysis.dataIssues.reportsWithoutPlans = reportWoredas.filter(rw => 
      !planWoredas.includes(rw)
    ).map(woreda => {
      const reportsForWoreda = reports.filter(r => normalizeWoreda(r.woreda) === woreda);
      return {
        woreda: woreda,
        reportCount: reportsForWoreda.length
      };
    });

    // // Calculate service-level analysis
    // const services = await Service.find().select('name').lean();
    // for (const service of services) {
    //   const serviceName = service.name;
    //   analysis.serviceAnalysis[serviceName] = {
    //     totalPlanned: 0,
    //     totalReported: 0,
    //     achievementRate: 0,
    //     woredaPerformance: {},
    //     performance: 'NEUTRAL'
    //   };

    //   // Calculate totals across all woredas
    //   for (const woreda of Object.keys(analysis.woredaAnalysis)) {
    //     const serviceData = analysis.woredaAnalysis[woreda].services[serviceName];
    //     if (serviceData) {
    //       analysis.serviceAnalysis[serviceName].totalPlanned += serviceData.planned;
    //       analysis.serviceAnalysis[serviceName].totalReported += serviceData.reported;
    //       analysis.serviceAnalysis[serviceName].woredaPerformance[woreda] = {
    //         achievementRate: serviceData.achievementRate,
    //         performance: serviceData.performance
    //       };
    //     }
    //   }

    //   // Calculate service achievement rate
    //   const servicePlanned = analysis.serviceAnalysis[serviceName].totalPlanned;
    //   const serviceReported = analysis.serviceAnalysis[serviceName].totalReported;
    //   analysis.serviceAnalysis[serviceName].achievementRate = 
    //     servicePlanned > 0 ? Math.round((serviceReported / servicePlanned) * 100 * 100) / 100 : 0;
      
    //   analysis.serviceAnalysis[serviceName].performance = 
    //     getPerformanceLevel(analysis.serviceAnalysis[serviceName].achievementRate);
    // }
// Calculate service-level analysis
const services = await Service.find().select('name').lean();
for (const service of services) {
  const serviceName = service.name;
  analysis.serviceAnalysis[serviceName] = {
    totalPlanned: 0,
    totalReported: 0,
    achievementRate: 0,
    woredaPerformance: {},
    performance: 'NEUTRAL',
    yearlyPlanTotal: 0 // Add this to track yearly plans
  };

  // Calculate totals across all woredas
  for (const woreda of Object.keys(analysis.woredaAnalysis)) {
    const serviceData = analysis.woredaAnalysis[woreda].services[serviceName];
    if (serviceData) {
      analysis.serviceAnalysis[serviceName].totalPlanned += serviceData.planned;
      analysis.serviceAnalysis[serviceName].totalReported += serviceData.reported;
      analysis.serviceAnalysis[serviceName].yearlyPlanTotal += serviceData.yearlyPlan || 0;
      analysis.serviceAnalysis[serviceName].woredaPerformance[woreda] = {
        achievementRate: serviceData.achievementRate,
        performance: serviceData.performance,
        planned: serviceData.planned,
        reported: serviceData.reported,
        yearlyPlan: serviceData.yearlyPlan
      };
    }
  }

  // Calculate service achievement rate
  const servicePlanned = analysis.serviceAnalysis[serviceName].totalPlanned;
  const serviceReported = analysis.serviceAnalysis[serviceName].totalReported;
  analysis.serviceAnalysis[serviceName].achievementRate = 
    servicePlanned > 0 ? Math.round((serviceReported / servicePlanned) * 100 * 100) / 100 : 0;
  
  analysis.serviceAnalysis[serviceName].performance = 
    getPerformanceLevel(analysis.serviceAnalysis[serviceName].achievementRate);
}
    // Calculate overall metrics
    analysis.overallMetrics.totalPlanned = Object.values(analysis.woredaAnalysis)
      .reduce((sum, w) => sum + w.planned, 0);
    analysis.overallMetrics.totalReported = Object.values(analysis.woredaAnalysis)
      .reduce((sum, w) => sum + w.reported, 0);
    analysis.overallMetrics.overallAchievementRate = 
      analysis.overallMetrics.totalPlanned > 0 
        ? Math.round((analysis.overallMetrics.totalReported / analysis.overallMetrics.totalPlanned) * 100 * 100) / 100 
        : 0;

    // Calculate rankings
    analysis.performanceRankings.byAchievementRate = Object.entries(analysis.woredaAnalysis)
      .filter(([, data]) => data.planned > 0)
      .sort(([,a], [,b]) => b.achievementRate - a.achievementRate)
      .map(([woreda, data], index) => ({
        woreda,
        achievementRate: data.achievementRate,
        rank: index + 1,
        performance: getPerformanceLevel(data.achievementRate),
        planned: data.planned,
        reported: data.reported
      }));

    // Identify best and worst performing woredas
    if (analysis.performanceRankings.byAchievementRate.length > 0) {
      analysis.overallMetrics.bestPerformingWoreda = 
        analysis.performanceRankings.byAchievementRate[0].woreda;
      analysis.overallMetrics.worstPerformingWoreda = 
        analysis.performanceRankings.byAchievementRate[analysis.performanceRankings.byAchievementRate.length - 1].woreda;
      
      analysis.overallMetrics.averageWoredaPerformance = Math.round(
        analysis.performanceRankings.byAchievementRate.reduce((sum, w) => sum + w.achievementRate, 0) / 
        analysis.performanceRankings.byAchievementRate.length * 100
      ) / 100;
    }

    console.log('Analysis completed with data issues:', analysis.dataIssues);
    res.json(analysis);
  } catch (error) {
    console.error('Analysis error:', error);
    res.status(500).json({ message: 'Server error while generating analysis' });
  }
}

// @desc    Get detailed woreda performance report
// @route   GET /api/analysis/woreda/:woreda
// @access  Private (Admin/Staff)
const getWoredaDetailedAnalysis = async (req, res) => {
  try {
    const { woreda } = req.params;
    const { budgetYear, quarter } = req.query;
    
    const targetBudgetYear = budgetYear || getCurrentEthiopianYear().toString();
    const targetQuarter = quarter || 'yearly';

    // Get plan for the woreda
    const plan = await Plan.findOne({ woreda, budgetYear: targetBudgetYear })
      .populate('services.serviceId', 'name')
      .lean();

    if (!plan) {
      return res.status(404).json({ message: 'Plan not found for this woreda and budget year' });
    }

    // Get cumulative date range for reports
    let dateFilter = {};
    if (targetQuarter === 'yearly') {
      const { startDate, endDate } = getCumulativeQuarterDateRange(targetBudgetYear, 4);
      dateFilter = { date: { $gte: startDate, $lte: endDate } };
    } else {
      const quarterNum = parseInt(targetQuarter);
      const { startDate, endDate } = getCumulativeQuarterDateRange(targetBudgetYear, quarterNum);
      dateFilter = { date: { $gte: startDate, $lte: endDate } };
    }

    // Get reports for the woreda within cumulative date range
    const normalizedWoreda = woreda.startsWith('Woreda ') ? woreda.replace('Woreda ', '') : woreda;
    const reports = await Report.find({
      woreda: normalizedWoreda,
      ...dateFilter
    }).populate('serviceId', 'name').lean();

    console.log(`Found ${reports.length} cumulative reports for woreda ${normalizedWoreda} in quarter ${targetQuarter}`);

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

    const analysis = {
      woreda,
      budgetYear: targetBudgetYear,
      quarter: targetQuarter,
      summary: {
        totalPlanned: 0,
        totalReported: 0,
        achievementRate: 0,
        performance: 'NEUTRAL',
        reportCount: reports.length
      },
      services: {},
      recommendations: []
    };

    // Process each service in the plan
// In getWoredaDetailedAnalysis function, update the service plan calculation:

// First, calculate total yearly plan for each service by summing all categories
const serviceYearlyTotals = {};

for (const servicePlan of plan.services) {
  const serviceName = servicePlan.serviceId.name;
  if (!serviceYearlyTotals[serviceName]) {
    serviceYearlyTotals[serviceName] = 0;
  }
  serviceYearlyTotals[serviceName] += servicePlan.plan || 0;
}

console.log(`Service yearly totals for ${woreda}:`, serviceYearlyTotals);

// Process each service (only once per service, not per category)
const servicesProcessed = new Set();

for (const servicePlan of plan.services) {
  const serviceName = servicePlan.serviceId.name;
  
  // Skip if we've already processed this service
  if (servicesProcessed.has(serviceName)) {
    continue;
  }
  servicesProcessed.add(serviceName);
  
  const categories = serviceCategories[serviceName] || [];
  
  // Get TOTAL yearly plan for this service (sum of all categories)
  const yearlyPlan = serviceYearlyTotals[serviceName] || 0;
  
  // Calculate cumulative quarterly plan from TOTAL yearly plan
  let plannedValue = 0;
  if (targetQuarter === 'yearly') {
    plannedValue = yearlyPlan;
  } else {
    const quarterlyPlans = calculateCumulativeQuarterlyPlans(yearlyPlan);
    plannedValue = quarterlyPlans[`q${targetQuarter}`] || 0;
  }

  // Initialize service
  analysis.services[serviceName] = {
    planned: 0,
    reported: 0,
    achievementRate: 0,
    performance: 'NEUTRAL',
    categories: {},
    yearlyPlan: yearlyPlan
  };

  // For categorized services, process each category
  if (categories.length > 0) {
    // Get all plans for this service (all categories)
    const servicePlans = plan.services.filter(sp => sp.serviceId.name === serviceName);
    
    for (const category of categories) {
      // Find plan for this specific category
      const categoryPlan = servicePlans.find(sp => sp.category === category);
      const categoryYearlyPlan = categoryPlan ? categoryPlan.plan : 0;
      
      // Calculate category quarterly plan
      let categoryPlannedValue = 0;
      if (targetQuarter === 'yearly') {
        categoryPlannedValue = categoryYearlyPlan;
      } else {
        const categoryQuarterlyPlans = calculateCumulativeQuarterlyPlans(categoryYearlyPlan);
        categoryPlannedValue = categoryQuarterlyPlans[`q${targetQuarter}`] || 0;
      }

      analysis.services[serviceName].categories[category] = {
        planned: categoryPlannedValue,
        reported: 0,
        achievementRate: 0,
        yearlyPlan: categoryYearlyPlan
      };
      
      // Add to service total
      analysis.services[serviceName].planned += categoryPlannedValue;
    }
  } else {
    // For non-categorized services
    analysis.services[serviceName].planned += plannedValue;
  }
}

// Now count reports for each service and category
for (const serviceName in analysis.services) {
  const service = analysis.services[serviceName];
  const categories = serviceCategories[serviceName] || [];
  
  if (categories.length > 0) {
    // For categorized services, count reports per category
    for (const category in service.categories) {
      const categoryReports = reports.filter(r => 
        r.serviceId.name === serviceName && 
        r.serviceCategory === category
      ).length;
      
      service.categories[category].reported = categoryReports;
      service.categories[category].achievementRate = service.categories[category].planned > 0 
        ? Math.round((categoryReports / service.categories[category].planned) * 100 * 100) / 100 
        : 0;
      
      // Add to service total reported
      service.reported += categoryReports;
    }
  } else {
    // For non-categorized services
    const serviceReports = reports.filter(r => 
      r.serviceId.name === serviceName
    ).length;
    
    service.reported = serviceReports;
  }
  
  // Calculate service achievement rate
  service.achievementRate = service.planned > 0 
    ? Math.round((service.reported / service.planned) * 100 * 100) / 100 
    : 0;
  service.performance = getPerformanceLevel(service.achievementRate);
  
  // Accumulate totals for woreda summary
  analysis.summary.totalPlanned += service.planned;
  analysis.summary.totalReported += service.reported;
}

// Debug log to check totals
console.log(`Debug for ${woreda}:`);
console.log(`ያላገባ yearly plan total: ${serviceYearlyTotals['ያላገባ'] || 0}`);
console.log(`ያላገባ analysis planned: ${analysis.services['ያላገባ'] ? analysis.services['ያላገባ'].planned : 0}`);
console.log(`ያላገባ category breakdown:`, analysis.services['ያላገባ'] ? analysis.services['ያላገባ'].categories : {});

// Rest of the code remains the same...

    // Calculate overall achievement rate
    analysis.summary.achievementRate = analysis.summary.totalPlanned > 0 
      ? Math.round((analysis.summary.totalReported / analysis.summary.totalPlanned) * 100 * 100) / 100 
      : 0;
    analysis.summary.performance = getPerformanceLevel(analysis.summary.achievementRate);

    // Generate recommendations
    analysis.recommendations = generateRecommendations(analysis);

    res.json(analysis);
  } catch (error) {
    console.error('Woreda analysis error:', error);
    res.status(500).json({ message: 'Server error while generating woreda analysis' });
  }
};

// Helper function to determine performance level
function getPerformanceLevel(achievementRate) {
  if (achievementRate >= 90) return 'በጣም_ጥሩ';
  if (achievementRate >= 75) return 'ጥሩ';
  if (achievementRate >= 60) return 'አማካይ';
  if (achievementRate >= 40) return 'ከአማካይ_በታች';
  return 'ደካማ';
}

// Helper function to calculate performance score
function calculatePerformanceScore(woredaData) {
  const achievementWeight = 0.6;
  const consistencyWeight = 0.4;
  
  // Calculate consistency (standard deviation of service achievement rates)
  const serviceRates = Object.values(woredaData.services)
    .map(s => s.achievementRate)
    .filter(rate => rate > 0);
  
  const averageRate = serviceRates.length > 0 
    ? serviceRates.reduce((sum, rate) => sum + rate, 0) / serviceRates.length 
    : 0;
  
  const variance = serviceRates.length > 0
    ? serviceRates.reduce((sum, rate) => sum + Math.pow(rate - averageRate, 2), 0) / serviceRates.length
    : 0;
  
  const consistency = Math.max(0, 100 - Math.sqrt(variance));
  
  return Math.round(
    (woredaData.achievementRate * achievementWeight) + 
    (consistency * consistencyWeight)
  );
}

// Helper function to calculate consistency rankings
function calculateConsistencyRankings(analysis) {
  const consistencyScores = Object.entries(analysis.woredaAnalysis).map(([woreda, data]) => {
    const serviceRates = Object.values(data.services)
      .map(s => s.achievementRate)
      .filter(rate => rate > 0);
    
    const averageRate = serviceRates.length > 0 
      ? serviceRates.reduce((sum, rate) => sum + rate, 0) / serviceRates.length 
      : 0;
    
    const variance = serviceRates.length > 0
      ? serviceRates.reduce((sum, rate) => sum + Math.pow(rate - averageRate, 2), 0) / serviceRates.length
      : 0;
    
    const consistency = Math.max(0, 100 - Math.sqrt(variance));
    
    return {
      woreda,
      consistency: Math.round(consistency * 100) / 100,
      performance: getPerformanceLevel(consistency)
    };
  });

  return consistencyScores.sort((a, b) => b.consistency - a.consistency)
    .map((item, index) => ({
      ...item,
      rank: index + 1
    }));
}

// Helper function to generate recommendations
function generateRecommendations(analysis) {
  const recommendations = [];
  
  // Overall performance recommendations
  if (analysis.summary.achievementRate < 40) {
    recommendations.push({
      type: 'አሳሳቢ',
      message: 'ጥቅል አፈፃፀሙ በጣም ዝቅተኛ ነው! አፋጣኝ የመፍትሄ እርምጃ አስፈላጊ ነው!',
      action: 'አፈፃፀሙን ለማሻሻል የክትትል እና ድጋፍ ስራ በጥልቀት መሰራት አለበት!'
    });
  } else if (analysis.summary.achievementRate < 60) {
    recommendations.push({
      type: 'ትኩረት',
      message: 'Performance is below expectations. Needs improvement. አፈፃፃሙ ከሚጠበቀው በታች ነው!መሻሻል አለበት!',
      action: 'አስፈላጊው ክትትል እና ደጋፍ ቢደረግ መሻሻል የሚችል አፈፃፀም ነው።'
    });
  } else if (analysis.summary.achievementRate >= 90) {
    recommendations.push({
      type: 'ስኬት',
      message: 'እጅግ በጣም ጥሩ አፈፃፀም ነው! መስፋፈት ያለበት ጥሩ አካሄድ ነው!',
      action: 'መልካም ተሞክሮዎችን  ለሌሎችም ወረዳዎች የማጋራት ስራ መሰራት አለበት።'
    });
  }

  // Service-specific recommendations
  for (const [serviceName, service] of Object.entries(analysis.services)) {
    if (service.achievementRate < 40 && service.planned > 0) {
      recommendations.push({
        type: 'እንደ_አገልግሎት',
        service: serviceName,
        message: `የ${serviceName} አገልግሎት አፈጻጸም ከሚገባው በታች ነው፤ (${service.achievementRate}% ክንውን)`,
        action: ` በ ${serviceName} አገልገሎት አሰጣጥ ዙሪያ ያሉ ተግዳሮቶችን በጥልቀት ማየት ያስፈልጋል`
      });
    }
    
    if (service.achievementRate > 120) {
      recommendations.push({
        type: 'እንደ_አገልግሎት',
        service: serviceName,
        message: `የ${serviceName} አገልግሎት ከዕቅድ ${service.achievementRate - 100}% በላይ ማሳካት ተችሏል!`,
        action: ` የ ${serviceName} አገልግሎት ዕቅድን በቀጣይ አመት ክፍ ለማድረግ ቢታሰብ።`
      });
    }
  }

  return recommendations;
}
module.exports = {
  getPlanVsReportAnalysis,
  getWoredaDetailedAnalysis
};