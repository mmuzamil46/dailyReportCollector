const mongoose = require('mongoose');
const { normalizeWoreda } = require('../utils/woredaUtils');

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
  evidenceType: [String],
  sourceWoreda: String,
  priceVariant: String,
  price: Number,
  payment: Number,
  remoteId: {
    type: mongoose.Schema.Types.ObjectId,
    sparse: true,
  },
  count: {
    type: Number,
    default: 1,
  },
}, { timestamps: true });

// Normalize woreda strings before saving
reportSchema.pre('save', function(next) {
  if (this.woreda) {
    this.woreda = normalizeWoreda(this.woreda);
  }
  if (this.sourceWoreda) {
    this.sourceWoreda = normalizeWoreda(this.sourceWoreda);
  }
  next();
});

module.exports = mongoose.model('Report', reportSchema);