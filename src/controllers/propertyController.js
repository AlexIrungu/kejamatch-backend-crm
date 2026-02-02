import PropertyStorage from '../services/propertyStorage.js';
import logger from '../utils/logger.js';

// Get all properties (with optional filters)
export const getAllProperties = async (req, res) => {
  try {
    const filters = {
      search: req.query.search,
      type: req.query.type,
      category: req.query.category,
      city: req.query.city,
      county: req.query.county,
      minPrice: req.query.minPrice,
      maxPrice: req.query.maxPrice,
      minBeds: req.query.minBeds,
      minBaths: req.query.minBaths,
      featured: req.query.featured
    };

    // Remove undefined values
    Object.keys(filters).forEach(key => 
      filters[key] === undefined && delete filters[key]
    );

    const result = await PropertyStorage.getAllProperties(filters);
    res.status(200).json({ success: true, data: result.properties });
  } catch (error) {
    logger.error('❌ Get all properties error:', error);
    res.status(500).json({ success: false, message: 'Failed to get properties' });
  }
};

// Get single property by ID
export const getProperty = async (req, res) => {
  try {
    const { id } = req.params;
    const property = await PropertyStorage.findById(id);

    if (!property) {
      return res.status(404).json({ success: false, message: 'Property not found' });
    }

    // Increment view count
    await PropertyStorage.incrementViews(id);

    res.status(200).json({ success: true, data: property });
  } catch (error) {
    logger.error('❌ Get property error:', error);
    res.status(500).json({ success: false, message: 'Failed to get property' });
  }
};

// Create new property (Admin only)
export const createProperty = async (req, res) => {
  try {
    const propertyData = req.body;
    const userId = req.user.id;

    // Validate required fields
    if (!propertyData.title || !propertyData.description || !propertyData.price) {
      return res.status(400).json({ 
        success: false, 
        message: 'Missing required fields: title, description, price' 
      });
    }

    if (!propertyData.location || !propertyData.location.address || !propertyData.location.city) {
      return res.status(400).json({ 
        success: false, 
        message: 'Location with address and city is required' 
      });
    }

    if (!propertyData.agent || !propertyData.agent.name || !propertyData.agent.phone || !propertyData.agent.email) {
      return res.status(400).json({ 
        success: false, 
        message: 'Agent information (name, phone, email) is required' 
      });
    }

    const result = await PropertyStorage.createProperty(propertyData, userId);

    if (!result.success) {
      return res.status(400).json({ success: false, message: result.error });
    }

    logger.info(`✅ Property created by ${req.user.email}`);
    res.status(201).json({ 
      success: true, 
      message: 'Property created successfully', 
      data: result.property 
    });
  } catch (error) {
    logger.error('❌ Create property error:', error);
    res.status(500).json({ success: false, message: 'Failed to create property' });
  }
};

// Update property (Admin only)
export const updateProperty = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const userId = req.user.id;

    const result = await PropertyStorage.updateProperty(id, updates, userId);

    if (!result.success) {
      return res.status(404).json({ success: false, message: result.error });
    }

    logger.info(`✅ Property updated: ${id} by ${req.user.email}`);
    res.status(200).json({ 
      success: true, 
      message: 'Property updated successfully', 
      data: result.property 
    });
  } catch (error) {
    logger.error('❌ Update property error:', error);
    res.status(500).json({ success: false, message: 'Failed to update property' });
  }
};

// Delete property (Admin only)
export const deleteProperty = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await PropertyStorage.deleteProperty(id);

    if (!result.success) {
      return res.status(404).json({ success: false, message: result.error });
    }

    logger.info(`✅ Property deleted: ${id} by ${req.user.email}`);
    res.status(200).json({ success: true, message: 'Property deleted successfully' });
  } catch (error) {
    logger.error('❌ Delete property error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete property' });
  }
};

// Update property status (Admin only)
export const updatePropertyStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['available', 'unavailable', 'sold', 'rented'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }

    const result = await PropertyStorage.updateStatus(id, status, req.user.id);

    if (!result.success) {
      return res.status(404).json({ success: false, message: result.error });
    }

    logger.info(`✅ Property status updated: ${id} -> ${status} by ${req.user.email}`);
    res.status(200).json({ 
      success: true, 
      message: 'Property status updated successfully', 
      data: result.property 
    });
  } catch (error) {
    logger.error('❌ Update property status error:', error);
    res.status(500).json({ success: false, message: 'Failed to update property status' });
  }
};

// Toggle featured status (Admin only)
export const toggleFeatured = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await PropertyStorage.toggleFeatured(id);

    if (!result.success) {
      return res.status(404).json({ success: false, message: result.error });
    }

    logger.info(`✅ Property featured toggled: ${id} by ${req.user.email}`);
    res.status(200).json({ 
      success: true, 
      message: `Property ${result.property.featured ? 'featured' : 'unfeatured'} successfully`, 
      data: result.property 
    });
  } catch (error) {
    logger.error('❌ Toggle featured error:', error);
    res.status(500).json({ success: false, message: 'Failed to toggle featured status' });
  }
};

// Get featured properties (Public)
export const getFeaturedProperties = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 6;
    const result = await PropertyStorage.getFeaturedProperties(limit);

    res.status(200).json({ success: true, data: result.properties });
  } catch (error) {
    logger.error('❌ Get featured properties error:', error);
    res.status(500).json({ success: false, message: 'Failed to get featured properties' });
  }
};

// Search properties (Public)
export const searchProperties = async (req, res) => {
  try {
    const filters = {
      search: req.query.q || req.query.search,
      type: req.query.type,
      category: req.query.category,
      city: req.query.city,
      county: req.query.county,
      minPrice: req.query.minPrice,
      maxPrice: req.query.maxPrice,
      minBeds: req.query.minBeds,
      minBaths: req.query.minBaths
    };

    // Remove undefined values
    Object.keys(filters).forEach(key => 
      filters[key] === undefined && delete filters[key]
    );

    const result = await PropertyStorage.searchProperties(filters);

    res.status(200).json({ success: true, data: result.properties });
  } catch (error) {
    logger.error('❌ Search properties error:', error);
    res.status(500).json({ success: false, message: 'Failed to search properties' });
  }
};

// Get properties by category (Public)
export const getPropertiesByCategory = async (req, res) => {
  try {
    const { category } = req.params;
    const type = req.query.type;

    const result = await PropertyStorage.getPropertiesByCategory(category, type);

    res.status(200).json({ success: true, data: result.properties });
  } catch (error) {
    logger.error('❌ Get properties by category error:', error);
    res.status(500).json({ success: false, message: 'Failed to get properties' });
  }
};

// Get property statistics (Admin only)
export const getPropertyStats = async (req, res) => {
  try {
    const result = await PropertyStorage.getStats();

    if (!result.success) {
      return res.status(500).json({ success: false, message: result.error });
    }

    res.status(200).json({ success: true, data: result.stats });
  } catch (error) {
    logger.error('❌ Get property stats error:', error);
    res.status(500).json({ success: false, message: 'Failed to get property statistics' });
  }
};

// Update property images (Admin only)
export const updatePropertyImages = async (req, res) => {
  try {
    const { id } = req.params;
    const { images } = req.body;

    if (!images || !Array.isArray(images)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Images array is required' 
      });
    }

    const result = await PropertyStorage.updateImages(id, images);

    if (!result.success) {
      return res.status(404).json({ success: false, message: result.error });
    }

    logger.info(`✅ Property images updated: ${id} by ${req.user.email}`);
    res.status(200).json({ 
      success: true, 
      message: 'Property images updated successfully', 
      data: result.property 
    });
  } catch (error) {
    logger.error('❌ Update property images error:', error);
    res.status(500).json({ success: false, message: 'Failed to update property images' });
  }
};

export default {
  getAllProperties,
  getProperty,
  createProperty,
  updateProperty,
  deleteProperty,
  updatePropertyStatus,
  toggleFeatured,
  getFeaturedProperties,
  searchProperties,
  getPropertiesByCategory,
  getPropertyStats,
  updatePropertyImages
};