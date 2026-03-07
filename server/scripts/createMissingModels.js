const fs = require('fs');
const path = require('path');

const modelsToCreate = {
  'PostLike.js': `const mongoose = require('mongoose');

const postLikeSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  post_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CommunityPost',
    required: true
  },
  created_at: {
    type: Date,
    default:  Date.now
  }
});

postLikeSchema.index({ user_id: 1, post_id: 1 }, { unique: true });

module.exports = mongoose.model('PostLike', postLikeSchema);
`,

  'CommunityPost.js': `const mongoose = require('mongoose');

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
    type: String,
    default: null
  },
  likes_count: {
    type:  Number,
    default: 0
  },
  comments_count: {
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

communityPostSchema.index({ restaurant_id: 1, created_at: -1 });
communityPostSchema.index({ post_type: 1 });
communityPostSchema.index({ created_at: -1 });

module.exports = mongoose.model('CommunityPost', communityPostSchema);
`,

  'MenuCategory.js': `const mongoose = require('mongoose');

const menuCategorySchema = new mongoose.Schema({
  restaurant_id: {
    type: mongoose.Schema. Types.ObjectId,
    ref: 'Restaurant',
    required: true
  },
  name: {
    type: String,
    required: true
  },
  description: {
    type: String,
    default: ''
  },
  display_order: {
    type: Number,
    default: 0
  },
  is_active: {
    type: Boolean,
    default: true
  },
  created_at: {
    type: Date,
    default: Date.now
  }
});

menuCategorySchema.index({ restaurant_id: 1, display_order: 1 });

module.exports = mongoose.model('MenuCategory', menuCategorySchema);
`
};

const modelsDir = path.join(__dirname, '..', 'models');

console.log('🔧 Creating missing model files...\n');

Object.entries(modelsToCreate).forEach(([filename, content]) => {
  const filePath = path.join(modelsDir, filename);
  
  if (fs.existsSync(filePath)) {
    console.log(`⏭️  Skipping ${filename} (already exists)`);
  } else {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✅ Created ${filename}`);
  }
});

console.log('\n✅ All missing model files have been created!');
console.log('You can now start the server with: node index.js\n');