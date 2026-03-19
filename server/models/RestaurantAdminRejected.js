const mongoose = require('mongoose');

// Stores rejected restaurant admin registration requests.
// We keep the same shape as `RestaurantAdmin` so the frontend can render it consistently.
const restaurantAdminRejectedSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    restaurant_name: { type: String, required: true },
    government_registration_number: { type: String, required: true },
    cnic: { type: String, required: true },
    contact_number: { type: String, required: true },
    address: { type: String, required: true },
    city: { type: String, required: true },
    latitude: Number,
    longitude: Number,
    description: String,
    cuisine_types: [String],
    status: {
      type: String,
      enum: ['rejected'],
      default: 'rejected',
    },
    restaurant_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Restaurant',
    },
    created_at: { type: Date, default: Date.now },
    approved_at: Date,
    approved_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    rejected_at: { type: Date, default: Date.now },
  },
  { strict: false },
);

module.exports = mongoose.model('RestaurantAdminRejected', restaurantAdminRejectedSchema);

