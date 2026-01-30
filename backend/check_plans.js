const mongoose = require('mongoose');
const path = require('path');
// Hardcoded DB URI for Docker environment
const MAIN_DB_URI = 'mongodb://mongo:27017/daily_report_db';

const checkPlans = async () => {
  try {
    console.log('CWD:', process.cwd());
    // Try to require the model
    const Plan = require('./models/Plan');
    
    await mongoose.connect(MAIN_DB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connected to DB');

    const years = await Plan.distinct('budgetYear');
    console.log('Distinct Plan Years:', years);

    const count2018 = await Plan.countDocuments({ budgetYear: '2018' });
    console.log('Count 2018:', count2018);
    
    const count2025 = await Plan.countDocuments({ budgetYear: '2025' }); // Just in case stored as GC
    console.log('Count 2025 (GC?):', count2025);

    const count2017 = await Plan.countDocuments({ budgetYear: '2017' });
    console.log('Count 2017:', count2017);

    // Check one plan to see structure
    const sample = await Plan.findOne().populate('services.serviceId', 'name');
    if (sample) {
        console.log('Sample Plan:', JSON.stringify(sample, null, 2));
    } else {
        console.log('No plans found at all.');
    }

    process.exit();
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
};

checkPlans();
