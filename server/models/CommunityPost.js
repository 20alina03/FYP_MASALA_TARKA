const mongoose = require('mongoose');

const communityPostSchema = new mongoose.Schema({
  restaurant_id: {
    type:  mongoose.Schema.Types.ObjectId,
    ref: 'Restaurant',
    required: true
  },
  post_type: {
    type: String,
    enum: ['text', 'image', 'video'],
    required: true
  },
  content: {
    type: String,
    required: true
  },
  media_url: {
    type:  String,
    default: null
  },
  likes_count: {
    type: Number,
    default: 0
  },
  comments_count:  {
    type: Number,
    default: 0
  },
  created_at: {
    type: Date,
    default: Date.now
  },
  updated_at: {
    type: Date,
    default: Date.now
  }
});

// Indexes for better query performance
communityPostSchema.index({ restaurant_id: 1, created_at: -1 });
communityPostSchema.index({ post_type: 1 });
communityPostSchema.index({ created_at: -1 });

module.exports = mongoose.model('CommunityPost', communityPostSchema);