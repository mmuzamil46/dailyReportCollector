const mongoose = require('mongoose');

const voidCardSchema = new mongoose.Schema({
  serviceType: {
    type: String,
    required: true,
  },
  serialNumber: {
    type: String, // String to allow for any leading zeros if preferred, though Number is easier for range checks
    required: true,
  },
  woreda: {
    type: String,
    required: true,
  },
  reportedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  reason: {
    type: String,
    required: true, // e.g., "Printer Jam", "Typo", "Torn"
  },
  voidDate: {
    type: Date,
    default: Date.now,
  }
}, { timestamps: true });

module.exports = mongoose.model('VoidCard', voidCardSchema);
