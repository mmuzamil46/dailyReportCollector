try {
    console.log('Requiring mongoose...');
    const mongoose = require('mongoose');
    console.log('Mongoose required successfully.');

    console.log('Requiring Service model...');
    const Service = require('./models/Service');
    console.log('Service model required successfully.');
} catch (error) {
    console.error('Error requiring modules:', error);
}
