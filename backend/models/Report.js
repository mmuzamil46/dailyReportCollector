const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
  serviceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Service',
    required: true,
  },
  woreda: {
    type: String,
    required: true,
  },
  serviceCategory: {
    type: String,
    required: false, // Not required for services with no categories
  },
  date: {
    type: Date,
    default: Date.now,
  },
  reportedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  cardSerial: {
    type: String,
    trim: true,
    maxlength: 50,
    sparse: true,
  },
  referenceNo: {
    type: String,
    trim: true,
    maxlength: 100,
    sparse: true,
  },
  registrationNumber: {
    type: String,
    trim: true,
    maxlength: 100,
    sparse: true,
  },
  letterNumber: {
    type: String,
    trim: true,
    maxlength: 100,
    sparse: true,
  },
}, { timestamps: true });

module.exports = mongoose.model('Report', reportSchema);