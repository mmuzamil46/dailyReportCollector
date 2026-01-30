const mongoose = require('mongoose');
const User = require('./backend/models/User');
const Report = require('./backend/models/Report');
const Plan = require('./backend/models/Plan');
const { normalizeWoreda } = require('./backend/utils/woredaUtils');

const MONGO_URI = 'mongodb://localhost:27017/dailyReport'; // Update if needed

async function migrate() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB');

    // 1. Normalize Users
    const users = await User.find({ woreda: { $ne: null } });
    console.log(`Found ${users.length} users with woredas`);
    for (const user of users) {
      const normalized = normalizeWoreda(user.woreda);
      if (normalized !== user.woreda) {
        console.log(`Normalizing User ${user.username}: ${user.woreda} -> ${normalized}`);
        user.woreda = normalized;
        await user.save();
      }
    }

    // 2. Normalize Reports
    const reports = await Report.find({});
    console.log(`Found ${reports.length} reports`);
    for (const report of reports) {
      let changed = false;
      const normalizedWoreda = normalizeWoreda(report.woreda);
      if (normalizedWoreda !== report.woreda) {
        report.woreda = normalizedWoreda;
        changed = true;
      }

      if (report.sourceWoreda) {
        const normalizedSource = normalizeWoreda(report.sourceWoreda);
        if (normalizedSource !== report.sourceWoreda) {
          report.sourceWoreda = normalizedSource;
          changed = true;
        }
      }

      if (changed) {
        console.log(`Normalizing Report ${report._id}`);
        await report.save();
      }
    }

    // 3. Normalize Plans
    const plans = await Plan.find({});
    console.log(`Found ${plans.length} plans`);
    for (const plan of plans) {
      const normalized = normalizeWoreda(plan.woreda);
      if (normalized !== plan.woreda) {
        console.log(`Normalizing Plan ${plan._id}: ${plan.woreda} -> ${normalized}`);
        plan.woreda = normalized;
        // Check for duplicates before saving as index is unique {woreda, budgetYear}
        const existing = await Plan.findOne({ woreda: normalized, budgetYear: plan.budgetYear, _id: { $ne: plan._id } });
        if (existing) {
          console.warn(`CONFLICT: Plan already exists for ${normalized} in ${plan.budgetYear}. Merging... (Manual merge recommended)`);
          // For now, let's just log it. Deleting or merging is risky without manual review.
        } else {
          await plan.save();
        }
      }
    }

    console.log('Migration complete');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

migrate();
