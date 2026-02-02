import mongoose from 'mongoose';

// Image sub-schema
const imageSchema = new mongoose.Schema({
  url: {
    type: String,
    required: true
  },
  caption: {
    type: String,
    default: null
  },
  isPrimary: {
    type: Boolean,
    default: false
  },
  order: {
    type: Number,
    default: 0
  }
}, { _id: true });

// Location sub-schema
const locationSchema = new mongoose.Schema({
  address: {
    type: String,
    required: true,
    trim: true
  },
  city: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  county: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  coordinates: {
    lat: {
      type: Number,
      default: null
    },
    lng: {
      type: Number,
      default: null
    }
  }
}, { _id: false });

// Agent sub-schema
const agentSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  phone: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    trim: true,
    lowercase: true
  }
}, { _id: false });

// Main Property schema
const propertySchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Property title is required'],
    trim: true,
    index: true
  },
  description: {
    type: String,
    required: [true, 'Property description is required'],
    trim: true
  },
  type: {
    type: String,
    enum: ['Rent', 'Buy'],
    required: true,
    index: true
  },
  category: {
    type: String,
    enum: ['houses', 'apartments', 'land', 'commercial'],
    required: true,
    index: true
  },
  status: {
    type: String,
    enum: ['available', 'unavailable', 'sold', 'rented'],
    default: 'available',
    required: true,
    index: true
  },
  // Pricing
  price: {
    type: Number,
    required: [true, 'Price is required'],
    min: 0
  },
  // Property details
  beds: {
    type: Number,
    required: true,
    min: 0
  },
  baths: {
    type: Number,
    required: true,
    min: 0
  },
  sqft: {
    type: Number,
    default: null,
    min: 0
  },
  parking: {
    type: Number,
    default: 0,
    min: 0
  },
  yearBuilt: {
    type: Number,
    default: null
  },
  // Location
  location: {
    type: locationSchema,
    required: true
  },
  // Images
  images: [imageSchema],
  // Features & Amenities
  features: [{
    type: String,
    trim: true
  }],
  amenities: [{
    type: String,
    trim: true
  }],
  // Agent information
  agent: {
    type: agentSchema,
    required: true
  },
  // Metadata
  views: {
    type: Number,
    default: 0
  },
  featured: {
    type: Boolean,
    default: false
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better query performance
propertySchema.index({ title: 'text', description: 'text' });
propertySchema.index({ 'location.city': 1, type: 1, status: 1 });
propertySchema.index({ price: 1, type: 1 });
propertySchema.index({ category: 1, type: 1, status: 1 });
propertySchema.index({ featured: 1, status: 1 });
propertySchema.index({ createdAt: -1 });

// Virtual for primary image
propertySchema.virtual('primaryImage').get(function() {
  const primary = this.images.find(img => img.isPrimary);
  return primary || this.images[0] || null;
});

// Virtual for formatted price
propertySchema.virtual('formattedPrice').get(function() {
  const price = this.price;
  if (price >= 1000000) {
    return `KES ${(price / 1000000).toFixed(1)}M`.replace('.0M', 'M');
  } else if (price >= 1000) {
    return `KES ${(price / 1000).toFixed(0)}K`;
  }
  return `KES ${price.toLocaleString()}`;
});

// Methods

// Increment view count
propertySchema.methods.incrementViews = async function() {
  this.views += 1;
  await this.save();
  return this.views;
};

// Update status
propertySchema.methods.updateStatus = async function(newStatus, userId) {
  this.status = newStatus;
  this.updatedBy = userId;
  await this.save();
  return this;
};

// Toggle featured
propertySchema.methods.toggleFeatured = async function() {
  this.featured = !this.featured;
  await this.save();
  return this;
};

// Add/Update images
propertySchema.methods.updateImages = async function(images) {
  // Ensure at least one image is marked as primary
  if (images.length > 0 && !images.some(img => img.isPrimary)) {
    images[0].isPrimary = true;
  }
  this.images = images;
  await this.save();
  return this;
};

// Static methods

// Search properties
propertySchema.statics.search = function(filters = {}) {
  const query = { status: 'available' };
  
  // Text search
  if (filters.search) {
    query.$text = { $search: filters.search };
  }
  
  // Type filter
  if (filters.type) {
    query.type = filters.type;
  }
  
  // Category filter
  if (filters.category) {
    query.category = filters.category;
  }
  
  // Location filter
  if (filters.city) {
    query['location.city'] = new RegExp(filters.city, 'i');
  }
  
  if (filters.county) {
    query['location.county'] = new RegExp(filters.county, 'i');
  }
  
  // Price range
  if (filters.minPrice || filters.maxPrice) {
    query.price = {};
    if (filters.minPrice) query.price.$gte = Number(filters.minPrice);
    if (filters.maxPrice) query.price.$lte = Number(filters.maxPrice);
  }
  
  // Beds/Baths
  if (filters.minBeds) {
    query.beds = { $gte: Number(filters.minBeds) };
  }
  
  if (filters.minBaths) {
    query.baths = { $gte: Number(filters.minBaths) };
  }
  
  // Featured
  if (filters.featured === 'true' || filters.featured === true) {
    query.featured = true;
  }
  
  return this.find(query).sort({ createdAt: -1 });
};

// Get featured properties
propertySchema.statics.getFeatured = function(limit = 6) {
  return this.find({ status: 'available', featured: true })
    .sort({ createdAt: -1 })
    .limit(limit);
};

// Get properties by category
propertySchema.statics.findByCategory = function(category, type = null) {
  const query = { category, status: 'available' };
  if (type) query.type = type;
  return this.find(query).sort({ createdAt: -1 });
};

// Get properties by agent
propertySchema.statics.findByAgent = function(userId) {
  return this.find({ 'agent.userId': userId }).sort({ createdAt: -1 });
};

// Get statistics
propertySchema.statics.getStats = async function() {
  const total = await this.countDocuments();
  const available = await this.countDocuments({ status: 'available' });
  const sold = await this.countDocuments({ status: 'sold' });
  const rented = await this.countDocuments({ status: 'rented' });
  
  const byType = await this.aggregate([
    { $group: { _id: '$type', count: { $sum: 1 } } }
  ]);
  
  const byCategory = await this.aggregate([
    { $group: { _id: '$category', count: { $sum: 1 } } }
  ]);
  
  const avgPrice = await this.aggregate([
    { $match: { status: 'available' } },
    { $group: { _id: null, avgPrice: { $avg: '$price' } } }
  ]);
  
  return {
    total,
    available,
    sold,
    rented,
    byType: byType.reduce((acc, item) => {
      acc[item._id] = item.count;
      return acc;
    }, {}),
    byCategory: byCategory.reduce((acc, item) => {
      acc[item._id] = item.count;
      return acc;
    }, {}),
    avgPrice: avgPrice.length > 0 ? Math.round(avgPrice[0].avgPrice) : 0
  };
};

const Property = mongoose.model('Property', propertySchema);

export default Property;