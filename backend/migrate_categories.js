const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config();

console.log('Current directory:', __dirname);
const servicePath = path.join(__dirname, 'models', 'Service');
console.log('Loading Service model from:', servicePath);

const Service = require(servicePath);

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/dailyReport';

const serviceCategories = {
    'ልደት': [
        { name: 'በወቅቱ', price: 100 },
        { name: 'በዘገየ', price: 150 },
        { name: 'በነባር', price: 50 }
    ],
    'ጋብቻ': [
        { name: 'በወቅቱ', price: 200 },
        { name: 'በዘገየ', price: 300 },
        { name: 'በነባር', price: 100 }
    ],
    'ሞት': [
        { name: 'በወቅቱ', price: 50 },
        { name: 'በዘገየ', price: 75 },
        { name: 'በነባር', price: 25 }
    ],
    'ፍቺ': [
        { name: 'በወቅቱ', price: 200 },
        { name: 'በዘገየ', price: 300 },
        { name: 'በነባር', price: 100 }
    ],
    'ጉዲፈቻ': [
        { name: 'በወቅቱ', price: 100 },
        { name: 'በዘገየ', price: 150 },
        { name: 'በነባር', price: 50 }
    ],
    'መታወቂያ': [
        { name: 'አዲስ', price: 200 },
        { name: 'እድሳት', price: 150 },
        { name: 'ምትክ', price: 250 }
    ],
    'ያላገባ': [
        { name: 'አዲስ', price: 100 },
        { name: 'እድሳት', price: 50 },
        { name: 'እርማት', price: 50 },
        { name: 'ምትክ', price: 75 }
    ]
};

const migrate = async () => {
    try {
        console.log('Connecting to MongoDB at:', MONGO_URI);
        await mongoose.connect(MONGO_URI);
        console.log('Connected to MongoDB');

        const services = await Service.find();
        console.log(`Found ${services.length} services`);

        for (const service of services) {
            console.log(`Processing service: ${service.name}`);
            if (serviceCategories[service.name]) {
                console.log(`Updating categories for ${service.name}`);
                service.categories = serviceCategories[service.name];
                try {
                    await service.save();
                    console.log(`Saved ${service.name}`);
                } catch (saveError) {
                    console.error(`Error saving ${service.name}:`, saveError);
                }
            } else {
                console.log(`No categories defined for ${service.name}`);
            }
        }

        console.log('Migration completed');
        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
};

migrate();
