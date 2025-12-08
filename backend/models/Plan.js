const mongoose = require('mongoose');

const servicePlanSchema = new mongoose.Schema({
  serviceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Service',
    required: true,
  },
  category: {
    type: String,
    default: null, // null for services with no category
  },
  plan: {
    type: Number,
    required: true,
    min: [0, 'Plan cannot be negative'],
  },
});

const planSchema = new mongoose.Schema(
  {
    woreda: {
      type: String,
      required: true,
      trim: true,
    },
    budgetYear: {
      type: String, // e.g., "2017" (Ethiopian Calendar)
      required: true,
    },
    services: [servicePlanSchema], // Array of all services + categories + plans
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    notes: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

// Ensure only ONE plan document per woreda + budgetYear
planSchema.index({ woreda: 1, budgetYear: 1 }, { unique: true });

module.exports = mongoose.model('Plan', planSchema);