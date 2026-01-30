const mongoose = require('mongoose');
const Service = require('./models/Service');
require('dotenv').config();

const seedRemoteService = async () => {
  try {
    const serviceName = 'ወቅታዊ ምዝገባ';
    
    // Check if service exists
    let service = await Service.findOne({ name: serviceName });
    
    if (service) {
      console.log(`Service '${serviceName}' already exists. Updating categories...`);
      // Update categories if needed
      service.categories = [
        { name: 'ልደት', price: 0 },
        { name: 'ሞት', price: 0 },
        { name: 'ፍቺ', price: 0 }
      ];
      await service.save();
      console.log(`Service '${serviceName}' updated.`);
    } else {
      console.log(`Creating Service '${serviceName}'...`);
      service = new Service({
        name: serviceName,
        description: 'Remote registration for Birth, Death, and Divorce from hospitals and courts',
        price: 0,
        categories: [
          { name: 'ልደት', price: 0 },
          { name: 'ሞት', price: 0 },
          { name: 'ፍቺ', price: 0 }
        ],
        isActive: true
      });
      await service.save();
      console.log(`Service '${serviceName}' created.`);
    }
    
    return service;
  } catch (error) {
    console.error('Error seeding remote service:', error);
    process.exit(1);
  }
};

// If run directly
if (require.main === module) {
  mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/daily_report_db')
    .then(async () => {
      console.log('MongoDB Connected for Seeding');
      await seedRemoteService();
      mongoose.disconnect();
    })
    .catch(err => {
      console.error(err);
      process.exit(1);
    });
}

module.exports = seedRemoteService;
