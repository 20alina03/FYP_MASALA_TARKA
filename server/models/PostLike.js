const mongoose = require('mongoose');

const postLikeSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  post_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CommunityPost',
    required:  true
  },
  created_at: {
    type: Date,
    default: Date.now
  }
});

// Create unique index to prevent duplicate likes
postLikeSchema.index({ user_id: 1, post_id: 1 }, { unique: true });

module.exports = mongoose.model('PostLike', postLikeSchema);