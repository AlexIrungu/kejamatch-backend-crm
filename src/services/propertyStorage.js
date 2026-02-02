/**
 * Property Storage Service - MongoDB Implementation
 * Handles all property CRUD operations
 */

import Property from '../models/PropertyModel.js';
import logger from '../utils/logger.js';

class PropertyStorage {
  static async initialize() {
    // MongoDB doesn't need initialization
    return true;
  }

  static async createProperty(propertyData, userId) {
    try {
      const property = new Property({
        ...propertyData,
        createdBy: userId,
        status: 'available'
      });

      await property.save();

      logger.info(`✅ Property created: ${property.title} (${property._id})`);

      return { success: true, property: property.toObject() };
    } catch (error) {
      logger.error('❌ Create property error:', error);
      return { success: false, error: error.message };
    }
  }

  static async getAllProperties(filters = {}) {
    try {
      const properties = await Property.search(filters);
      
      return { success: true, properties };
    } catch (error) {
      logger.error('❌ Get all properties error:', error);
      return { success: false, error: error.message, properties: [] };
    }
  }

  static async getAvailableProperties(filters = {}) {
    try {
      const query = { status: 'available', ...filters };
      const properties = await Property.find(query).sort({ createdAt: -1 });
      
      return { success: true, properties };
    } catch (error) {
      logger.error('❌ Get available properties error:', error);
      return { success: false, error: error.message, properties: [] };
    }
  }

  static async findById(propertyId) {
    try {
      const property = await Property.findById(propertyId);
      return property;
    } catch (error) {
      logger.error('❌ Find property by ID error:', error);
      return null;
    }
  }

  static async updateProperty(propertyId, updates, userId) {
    try {
      const property = await Property.findById(propertyId);
      
      if (!property) {
        return { success: false, error: 'Property not found' };
      }

      // Update fields
      Object.keys(updates).forEach(key => {
        if (updates[key] !== undefined) {
          property[key] = updates[key];
        }
      });
      
      property.updatedBy = userId;
      await property.save();

      logger.info(`✅ Property updated: ${propertyId}`);

      return { success: true, property: property.toObject() };
    } catch (error) {
      logger.error('❌ Update property error:', error);
      return { success: false, error: error.message };
    }
  }

  static async deleteProperty(propertyId) {
    try {
      const property = await Property.findByIdAndDelete(propertyId);
      
      if (!property) {
        return { success: false, error: 'Property not found' };
      }

      logger.info(`✅ Property deleted: ${propertyId}`);

      return { success: true };
    } catch (error) {
      logger.error('❌ Delete property error:', error);
      return { success: false, error: error.message };
    }
  }

  static async updateStatus(propertyId, status, userId) {
    try {
      const property = await Property.findById(propertyId);
      
      if (!property) {
        return { success: false, error: 'Property not found' };
      }

      await property.updateStatus(status, userId);

      logger.info(`✅ Property status updated: ${propertyId} -> ${status}`);

      return { success: true, property: property.toObject() };
    } catch (error) {
      logger.error('❌ Update property status error:', error);
      return { success: false, error: error.message };
    }
  }

  static async toggleFeatured(propertyId) {
    try {
      const property = await Property.findById(propertyId);
      
      if (!property) {
        return { success: false, error: 'Property not found' };
      }

      await property.toggleFeatured();

      logger.info(`✅ Property featured toggled: ${propertyId} -> ${property.featured}`);

      return { success: true, property: property.toObject() };
    } catch (error) {
      logger.error('❌ Toggle featured error:', error);
      return { success: false, error: error.message };
    }
  }

  static async incrementViews(propertyId) {
    try {
      const property = await Property.findById(propertyId);
      
      if (!property) {
        return { success: false, error: 'Property not found' };
      }

      const views = await property.incrementViews();

      return { success: true, views };
    } catch (error) {
      logger.error('❌ Increment views error:', error);
      return { success: false, error: error.message };
    }
  }

  static async getFeaturedProperties(limit = 6) {
    try {
      const properties = await Property.getFeatured(limit);
      
      return { success: true, properties };
    } catch (error) {
      logger.error('❌ Get featured properties error:', error);
      return { success: false, error: error.message, properties: [] };
    }
  }

  static async getPropertiesByCategory(category, type = null) {
    try {
      const properties = await Property.findByCategory(category, type);
      
      return { success: true, properties };
    } catch (error) {
      logger.error('❌ Get properties by category error:', error);
      return { success: false, error: error.message, properties: [] };
    }
  }

  static async getPropertiesByAgent(userId) {
    try {
      const properties = await Property.findByAgent(userId);
      
      return { success: true, properties };
    } catch (error) {
      logger.error('❌ Get agent properties error:', error);
      return { success: false, error: error.message, properties: [] };
    }
  }

  static async searchProperties(filters) {
    try {
      const properties = await Property.search(filters);
      
      return { success: true, properties };
    } catch (error) {
      logger.error('❌ Search properties error:', error);
      return { success: false, error: error.message, properties: [] };
    }
  }

  static async getStats() {
    try {
      const stats = await Property.getStats();
      return { success: true, stats };
    } catch (error) {
      logger.error('❌ Get property stats error:', error);
      return { success: false, error: error.message };
    }
  }

  static async updateImages(propertyId, images) {
    try {
      const property = await Property.findById(propertyId);
      
      if (!property) {
        return { success: false, error: 'Property not found' };
      }

      await property.updateImages(images);

      logger.info(`✅ Property images updated: ${propertyId}`);

      return { success: true, property: property.toObject() };
    } catch (error) {
      logger.error('❌ Update property images error:', error);
      return { success: false, error: error.message };
    }
  }
}

export default PropertyStorage;