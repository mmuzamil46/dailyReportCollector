const mongoose = require('mongoose');

const onTimeRegSchema = new mongoose.Schema({
  serviceName: {
    type: String,
    required: true,
    enum: ['ልደት', 'ሞት', 'ፍቺ'], 
  },
  referenceNumber: {
    type: String,
    required: true,
    trim: true,
  },
  gender: {
    type: String,
    enum: ['ወንድ', 'ሴት'],
    required: true,
  },
  woreda: {
    type: String,
    required: true,
  },
  hospitalName: {
    type: String,
    trim: true, // Only for Birth/Death
  },
  courtName: {
    type: String,
    trim: true, // Only for Divorce
  },
  date: {
    type: Date,
    default: Date.now,
  },
  synced: {
    type: Boolean,
    default: false,
  },
}, { timestamps: true });

module.exports = mongoose.model('OnTimeReg', onTimeRegSchema);
