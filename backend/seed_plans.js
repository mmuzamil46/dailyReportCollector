const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const Plan = require('./models/Plan');

// Docker container connection string
// Use env var or default to the one from docker-compose
const MONGO_URI = process.env.MONGO_URI || 'mongodb://mongo:27017/dailyReport';

const seedPlans = async () => {
  try {
    console.log('Connecting to:', MONGO_URI);
    await mongoose.connect(MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connected to MongoDB');

    const backupPath = path.join(__dirname, 'plans_backup.json');
    if (!fs.existsSync(backupPath)) {
        console.error('Backup file not found:', backupPath);
        process.exit(1);
    }

    const fileContent = fs.readFileSync(backupPath, 'utf-8');
    let rawPlans = JSON.parse(fileContent);

    // Sanitize Extended JSON format
    const cleanPlans = rawPlans.map(p => {
        // Handle _id
        if (p._id && p._id.$oid) p._id = p._id.$oid;
        
        // Handle createdBy
        if (p.createdBy && p.createdBy.$oid) p.createdBy = p.createdBy.$oid;

        // Handle timestamps
        if (p.createdAt && p.createdAt.$date) p.createdAt = new Date(p.createdAt.$date);
        if (p.updatedAt && p.updatedAt.$date) p.updatedAt = new Date(p.updatedAt.$date);

        // Handle Services
        if (p.services && Array.isArray(p.services)) {
            p.services = p.services.map(s => {
                // Remove subdoc _id to let mongoose regenerate or cast if string
                // But better to remove to avoid conflict if format is weird
                if(s._id) delete s._id; 
                
                // Handle serviceId
                if (s.serviceId && s.serviceId.$oid) s.serviceId = s.serviceId.$oid;
                return s;
            });
        }
        return p;
    });

    console.log(`Prepared ${cleanPlans.length} plans for insertion.`);

    // Clear existing
    console.log('Clearing existing plans...');
    await Plan.deleteMany({});
    
    console.log('Inserting plans...');
    await Plan.insertMany(cleanPlans);

    console.log('Plans seeded successfully.');
    
    const count = await Plan.countDocuments();
    console.log('Total Plans in DB:', count);

    process.exit(0);
  } catch (err) {
    console.error('Seeding error:', err);
    process.exit(1);
  }
};

seedPlans();
