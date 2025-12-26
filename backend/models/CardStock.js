const mongoose = require('mongoose');

const cardStockSchema = new mongoose.Schema({
  serviceType: {
    type: String, // e.g., "Birth", "Marriage" - could be linked to Service model if needed, but string is flexible for now
    required: true,
  },
  startSerial: {
    type: Number,
    required: true,
  },
  endSerial: {
    type: Number,
    required: true,
  },
  quantity: { // Calculated automatically: end - start + 1
    type: Number,
    required: true,
  },
  dateAdded: {
    type: Date,
    default: Date.now,
  },
  addedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  // We might want to track if these are fully distributed or slightly distributed, 
  // but transfers will track that logically.
}, { timestamps: true });

// Ensure ranges don't overlap for the same service type (basic validation)
// Implementation of overlap check might be better in the controller for complex logic.

module.exports = mongoose.model('CardStock', cardStockSchema);
