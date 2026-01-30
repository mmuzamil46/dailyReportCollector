const mongoose = require('mongoose');
const { Schema } = mongoose;

const woredaRankingSchema = new Schema(
  {
    woreda: {
      type: String,
      required: true,
    },
    rank: {
      type: Number,
      required: true,
    },
    totalServices: {
      type: Number,
      required: true,
      default: 0,
    },
    date: {
      type: Date,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Index for efficient querying
woredaRankingSchema.index({ date: -1, woreda: 1 });

module.exports = mongoose.model('WoredaRanking', woredaRankingSchema);
