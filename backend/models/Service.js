const mongoose = require('mongoose');
const { Schema } = mongoose;

const serviceSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 100,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    yearlyPlan: {
      type: Number,
      default: null,
    },
    price: {
      type: Number,
      default: 0
    },
    categories: [{
      name: String,
      price: Number,
      excludeFromReporting: { type: Boolean, default: false },
      hasPriceVariants: { type: Boolean, default: false },
      priceVariants: [{
        label: String,
        price: Number
      }]
    }],
    isSubcityOnly: {
      type: Boolean,
      default: false,
    },
    requiresEvidence: {
      type: Boolean,
      default: false,
    },
    evidenceTypes: [String],
    showCardSerial: { type: Boolean, default: true },
    showReferenceNo: { type: Boolean, default: true },
    showRegistrationNumber: { type: Boolean, default: false },
    showLetterNumber: { type: Boolean, default: false },
    isActive: {
      type: Boolean,
      default: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Service', serviceSchema);