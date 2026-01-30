
// ... [In controller/analysisController.js]

// @desc    Get daily service progress (Actual vs Goal)
// @route   GET /api/analysis/daily-progress
// @access  Private
const getDailyServiceProgress = async (req, res) => {
  try {
    const { woreda } = req.query; // Optional filter
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const budgetYear = getCurrentEthiopianYear().toString(); // Default to current budget year

    // 1. Fetch Plans
    const planQuery = { budgetYear };
    if (woreda && woreda !== 'all') {
      planQuery.woreda = normalizeWoreda(woreda);
    }
    
    const plans = await Plan.find(planQuery).populate('services.serviceId', 'name').lean();

    // 2. Fetch Today's Reports
    const reportQuery = { 
      date: { $gte: today, $lt: tomorrow } 
    };
    if (woreda && woreda !== 'all') {
      reportQuery.woreda = normalizeWoreda(woreda);
    }
    
    const reports = await Report.find(reportQuery).populate('serviceId', 'name').lean();

    // 3. Aggregate Daily Goals (Plan / 301) and Actuals
    const serviceProgress = {};
    const BUSINESS_DAYS = 301;

    // Initialize with aggregated plans
    plans.forEach(plan => {
      plan.services.forEach(sp => {
        const serviceName = sp.serviceId.name;
        if (!serviceProgress[serviceName]) {
          serviceProgress[serviceName] = { 
            name: serviceName, 
            dailyGoal: 0, 
            actual: 0,
            percentage: 0 
          };
        }
        // Daily Goal = Yearly Plan / 301 (Rounded Down)
        serviceProgress[serviceName].dailyGoal += Math.floor((sp.plan || 0) / BUSINESS_DAYS);
      });
    });

    // Sum Actuals
    reports.forEach(report => {
      const serviceName = report.serviceId?.name || 'Unknown';
      if (serviceProgress[serviceName]) {
        serviceProgress[serviceName].actual += (report.count || 1);
      } else {
         // Handle reports for services without plans (optional)
         // serviceProgress[serviceName] = { name: serviceName, dailyGoal: 0, actual: (report.count || 1), percentage: 100 };
      }
    });

    // Calculate Percentages
    Object.values(serviceProgress).forEach(item => {
      if (item.dailyGoal > 0) {
        item.percentage = Math.round((item.actual / item.dailyGoal) * 100);
      } else if (item.actual > 0) {
        item.percentage = 100; // infinite progress if no goal but has reports
      }
    });
    
    // Sort by name or percentage as needed
    const result = Object.values(serviceProgress).sort((a, b) => a.name.localeCompare(b.name));

    // Calculate Overall Average
    const validItems = result.filter(i => i.dailyGoal > 0);
    const overallAverage = validItems.length > 0 
      ? Math.round(validItems.reduce((sum, i) => sum + i.percentage, 0) / validItems.length)
      : 0;

    res.json({
      date: today,
      overallAverage,
      services: result
    });

  } catch (error) {
    console.error('Daily progress error:', error);
    res.status(500).json({ message: 'Server error fetching daily progress' });
  }
};

// ... [In routes/analysisRoutes.js]
// router.get('/daily-progress', authMiddleware, getDailyServiceProgress);


// ... [In controller/notificationController.js]
const { getCurrentEthiopianYear } = require('../utils/ethiopianDate');
const Plan = require('../models/Plan');
const Report = require('../models/Report');

// Find Best Woreda and Create Notification
exports.announceDailyBestWoreda = async (req, res) => {
  try {
     const today = new Date();
     today.setHours(0, 0, 0, 0);
     const tomorrow = new Date(today);
     tomorrow.setDate(tomorrow.getDate() + 1);
     const budgetYear = getCurrentEthiopianYear().toString();
     const BUSINESS_DAYS = 301;

     // Fetch plans and reports for ALL woredas
     const plans = await Plan.find({ budgetYear }).populate('services.serviceId', 'name').lean();
     const reports = await Report.find({ date: { $gte: today, $lt: tomorrow } }).populate('serviceId', 'name').lean();

     const woredaStats = {};

     // Calculate Goals per Woreda
     plans.forEach(plan => {
       const woreda = plan.woreda; // normalize if needed
       if (!woredaStats[woreda]) woredaStats[woreda] = { goal: 0, actual: 0 };
       
       let planTotal = 0;
       plan.services.forEach(sp => planTotal += (sp.plan || 0));
       woredaStats[woreda].goal += Math.floor(planTotal / BUSINESS_DAYS);
     });

     // Calculate Actuals
     reports.forEach(r => {
       const woreda = r.woreda; // normalize if needed (Reports usually store normalized or same format)
       // Note: ensure woreda formatting matches between Plan and Report
       // Let's assume normalizedWoreda logic is applied consistently
       if (woredaStats[woreda]) {
         woredaStats[woreda].actual += (r.count || 1);
       }
     });

     // Find Winner
     let bestWoreda = null;
     let highestRate = -1;

     Object.entries(woredaStats).forEach(([woreda, stats]) => {
       if (stats.goal > 0) {
         const rate = (stats.actual / stats.goal) * 100;
         if (rate > highestRate) {
           highestRate = rate;
           bestWoreda = woreda;
         }
       }
     });

     if (!bestWoreda) {
       return res.json({ message: 'No eligible woredas found for today.' });
     }

     // Create Message
     const dateStr = today.toLocaleDateString();
     const message = `🎉 የዕለቱ ምርጥ ወረዳ! ወረዳ ${bestWoreda} በእለቱ ${Math.round(highestRate)}% አፈጻጸም በማስመዝገብ አሸናፊ ሆኗል!`;

     // Check for existing notification to avoid spam
     const existing = await Notification.findOne({ 
       message: { $regex: 'የዕለቱ ምርጥ ወረዳ' },
       createdAt: { $gte: today } 
     });

     if (existing) {
       return res.json({ message: 'Announcement already made for today.', notification: existing });
     }

     const notification = new Notification({
       message,
       targetWoreda: null, // Broadcast
       sender: req.user.id 
     });
     
     await notification.save();
     
     res.status(201).json(notification);

  } catch (error) {
    console.error('Best woreda announcement error:', error);
    res.status(500).json({ message: 'Error creating announcement' });
  }
};
