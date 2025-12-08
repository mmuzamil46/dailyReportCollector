// In getWoredaDetailedAnalysis function, update the service plan calculation:

// First, calculate total yearly plan for each service by summing all categories
//const serviceYearlyTotals = {};

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





    const serviceYearlyTotals = {};
    for (const servicePlan of plan.services) {
      const serviceName = servicePlan.serviceId.name;
      const categories = serviceCategories[serviceName] || [];
      
      // Get yearly plan
      const yearlyPlan = servicePlan.plan || 0;
      
      // Calculate cumulative quarterly plan
      let plannedValue = 0;
      if (targetQuarter === 'yearly') {
        plannedValue = yearlyPlan;
      } else {
        const quarterlyPlans = calculateCumulativeQuarterlyPlans(yearlyPlan);
        plannedValue = quarterlyPlans[`q${targetQuarter}`] || 0;
      }

      // Initialize service
      if (!analysis.services[serviceName]) {
        analysis.services[serviceName] = {
          planned: 0,
          reported: 0,
          achievementRate: 0,
          performance: 'NEUTRAL',
          categories: {},
          yearlyPlan: yearlyPlan
        };

        // Initialize categories
        categories.forEach(cat => {
          analysis.services[serviceName].categories[cat] = {
            planned: 0,
            reported: 0,
            achievementRate: 0
          };
        });
      }

      // For categorized services
      if (servicePlan.category && categories.includes(servicePlan.category)) {
        // Calculate cumulative quarterly plan for category
        const categoryYearlyPlan = servicePlan.plan || 0;
        let categoryPlannedValue = 0;
        if (targetQuarter === 'yearly') {
          categoryPlannedValue = categoryYearlyPlan;
        } else {
          const categoryQuarterlyPlans = calculateCumulativeQuarterlyPlans(categoryYearlyPlan);
          categoryPlannedValue = categoryQuarterlyPlans[`q${targetQuarter}`] || 0;
        }

        analysis.services[serviceName].categories[servicePlan.category].planned += categoryPlannedValue;
        
        // Count cumulative reports for this category
        const categoryReports = reports.filter(r => 
          r.serviceId.name === serviceName && 
          r.serviceCategory === servicePlan.category
        ).length;
        
        analysis.services[serviceName].categories[servicePlan.category].reported += categoryReports;
        
        // Add to service total
        analysis.services[serviceName].planned += categoryPlannedValue;
        analysis.services[serviceName].reported += categoryReports;
      } 
      // For non-categorized services
      else if (!servicePlan.category) {
        analysis.services[serviceName].planned += plannedValue;
        
        // Count cumulative reports for this service
        const serviceReports = reports.filter(r => 
          r.serviceId.name === serviceName
        ).length;
        
        analysis.services[serviceName].reported += serviceReports;
      }
    }

    // Calculate service achievement rates and overall totals
    for (const serviceName in analysis.services) {
      const service = analysis.services[serviceName];
      
      // Calculate service achievement rate
      service.achievementRate = service.planned > 0 
        ? Math.round((service.reported / service.planned) * 100 * 100) / 100 
        : 0;
      service.performance = getPerformanceLevel(service.achievementRate);
      
      // Calculate category achievement rates
      for (const category in service.categories) {
        const catData = service.categories[category];
        catData.achievementRate = catData.planned > 0 
          ? Math.round((catData.reported / catData.planned) * 100 * 100) / 100 
          : 0;
      }
      
      // Accumulate totals
      analysis.summary.totalPlanned += service.planned;
      analysis.summary.totalReported += service.reported;
    }