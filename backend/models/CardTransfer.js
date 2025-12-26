const mongoose = require('mongoose');

const cardTransferSchema = new mongoose.Schema({
  stockRef: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CardStock', // Optional: link back to original stock batch if useful
  },
  serviceType: {
    type: String,
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
  quantity: {
    type: Number,
    required: true,
  },
  fromUser: { // The store keeper/admin sending it
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  toWoreda: { // Target Woreda 
    type: String,
    required: true,
  },
  // Optional: to specific officer if distributing further down
  toOfficer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  transferDate: {
    type: Date,
    default: Date.now,
  },
  status: {
    type: String,
    enum: ['Pending', 'Accepted', 'Rejected'], // For simple flow, maybe just auto-accept for now
    default: 'Accepted',
  }
}, { timestamps: true });

module.exports = mongoose.model('CardTransfer', cardTransferSchema);
