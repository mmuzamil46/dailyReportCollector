const mongoose = require('mongoose');

const winnerSchema = new mongoose.Schema({
  woreda: {
    type: String,
    required: true
  },
  score: {
    type: Number,
    required: true
  },
  reportCount: {
    type: Number,
    required: true
  },
  dailyGoal: {
    type: Number,
    required: true
  },
  announcementDate: {
    type: Date,
    default: Date.now
  },
  isActive: {
    type: Boolean,
    default: true
  }
});

// Automatically set previous winners to inactive when a new one is created
winnerSchema.pre('save', async function(next) {
  if (this.isNew) {
    await this.constructor.updateMany({}, { isActive: false });
  }
  next();
});

module.exports = mongoose.model('Winner', winnerSchema);
