const Plan = require('../models/Plan');
const Service = require('../models/Service');
const { getCurrentEthiopianYear, getEthiopianYearFromDate } = require('../utils/ethiopianDate');

// @desc    Create or update plan for a woreda + budgetYear
// @route   POST /api/plans
// @access  Private (Admin/Staff)
const upsertPlan = async (req, res) => {
  const { woreda, budgetYear, services } = req.body;

  if (!woreda || !budgetYear || !Array.isArray(services)) {
    return res.status(400).json({ message: 'Invalid data' });
  }

  try {
    const plan = await Plan.findOneAndUpdate(
      { woreda, budgetYear },
      {
        $set: {
          woreda,
          budgetYear,
          services,
          createdBy: req.user.id,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    ).populate('services.serviceId', 'name');

    res.json(plan);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get plan summary for table display
// @route   GET /api/plans/summary?budgetYear=2018
// @access  Private
const getPlanSummary = async (req, res) => {
  let { budgetYear } = req.query;
console.log(budgetYear);
  // Use current Ethiopian year if not provided
  if (!budgetYear) {
    budgetYear = getCurrentEthiopianYear().toString();
  }

  try {
    let query = { budgetYear };
    
    
    if (req.user.role !== 'Admin' && req.user.role !== 'Staff') {
      query.woreda = req.user.woreda;
    }

    const plans = await Plan.find(query)
      .populate('services.serviceId', 'name')
      .select('woreda budgetYear services')
      .lean();

    const result = plans.map(plan => ({
      _id: plan._id,
      woreda: plan.woreda,
      budgetYear: plan.budgetYear,
      rows: plan.services.map(s => ({
        serviceName: s.serviceId.name,
        category: s.category, // Keep as null for services without category
        plan: s.plan,
      }))
    }));
console.log(result);

    res.json(result);

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get single plan for editing
// @route   GET /api/plans/:woreda/:year
const getPlanByWoredaAndYear = async (req, res) => {
  const { woreda, year } = req.params;
  try {
    const plan = await Plan.findOne({ woreda, budgetYear: year })
      .populate('services.serviceId', 'name');
    if (!plan) return res.status(404).json({ message: 'Plan not found' });
    res.json(plan);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  upsertPlan,
  getPlanSummary,
  getPlanByWoredaAndYear,
};