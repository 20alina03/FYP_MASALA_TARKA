const mongoose = require('mongoose');

const restaurantAdminSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  restaurant_name: {
    type: String,
    required: true
  },
  government_registration_number: {
    type: String,
    required: true,
    unique: true
  },
  cnic: {
    type: String,
    required: true,
    unique: true,
  },
  contact_number: {
    type: String,
    required: true,  
  },
  address: {
    type: String,
    required: true
  },
  city: {
    type: String,
    required: true
  },
  latitude: Number,
  longitude: Number,
  description: String,
  cuisine_types: [String],
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  restaurant_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Restaurant'
  },
  created_at: {
    type: Date,
    default: Date.now
  },
  approved_at: Date,
  approved_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
});

module.exports = mongoose.model('RestaurantAdmin', restaurantAdminSchema);