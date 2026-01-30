const mongoose = require('mongoose');

const CumulativeStatsSchema = new mongoose.Schema({
  serviceName: {
    type: String,
    required: true,
    unique: true
  },
  totalCount: {
    type: Number,
    required: true,
    default: 0
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  },
  date: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index for efficient queries
CumulativeStatsSchema.index({ serviceName: 1 });
CumulativeStatsSchema.index({ date: -1 });

module.exports = mongoose.model('CumulativeStats', CumulativeStatsSchema);
