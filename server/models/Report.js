const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
  reporter_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  report_type: {
    type: String,
    enum: ['restaurant_review', 'menu_item_review'],
    required: true
  },
  review_id: {
    type: mongoose. Schema.Types.ObjectId,
    required: true
  },
  restaurant_id: {
    type:  mongoose.Schema.Types.ObjectId,
    ref: 'Restaurant',
    required: true
  },
  reason: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'resolved', 'rejected'],
    default: 'pending'
  },
  resolved_by: {
    type: mongoose. Schema.Types.ObjectId,
    ref: 'User'
  },
  resolution_note: String,
  created_at: {
    type: Date,
    default: Date.now
  },
  resolved_at: Date
});

reportSchema.index({ status: 1, created_at: -1 });

module.exports = mongoose.model('Report', reportSchema);