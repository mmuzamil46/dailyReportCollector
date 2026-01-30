const mongoose = require('mongoose');
const Report = require('./backend/models/Report');
const Service = require('./backend/models/Service');
const User = require('./backend/models/User');

const MONGO_URI = 'mongodb://localhost:27017/dailyReport'; // Update if using inside docker to 'mongodb://mongo:27017/dailyReport'

async function inspectCounts() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB');

    const today = new Date();
    const currentYear = today.getFullYear();
    const startOfYear = new Date(currentYear, 0, 1);
    const endOfYear = new Date(currentYear + 1, 0, 1);

    console.log(`Inspecting reports for year ${currentYear}`);

    const services = await Service.find({ isActive: true }).select('name');
    console.log(`Found ${services.length} active services`);

    const stats = await Report.aggregate([
      {
        $match: {
          date: { $gte: startOfYear, $lt: endOfYear }
        }
      },
      {
        $group: {
          _id: '$serviceId',
          docCount: { $sum: 1 },
          totalCount: { $sum: { $ifNull: ['$count', 1] } }
        }
      }
    ]);

    console.log('\nService | Report Docs | Sum of Counts');
    console.log('--- | --- | ---');

    for (const stat of stats) {
      const service = services.find(s => s._id.toString() === stat._id.toString());
      const name = service ? service.name : 'Unknown Service (' + stat._id + ')';
      console.log(`${name} | ${stat.docCount} | ${stat.totalCount}`);
    }

    process.exit(0);
  } catch (err) {
    console.error('Inspection failed:', err);
    process.exit(1);
  }
}

inspectCounts();
