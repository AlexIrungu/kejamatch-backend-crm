/**
 * Seed Script - Populate MongoDB with initial property data
 * 
 * Run this script once to add sample properties to your database:
 * node scripts/seed-properties.js
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

// Property Schema (inline for standalone script)
const imageSchema = new mongoose.Schema({
  url: { type: String, required: true },
  caption: { type: String, default: null },
  isPrimary: { type: Boolean, default: false },
  order: { type: Number, default: 0 }
}, { _id: true });

const locationSchema = new mongoose.Schema({
  address: { type: String, required: true, trim: true },
  city: { type: String, required: true, trim: true },
  county: { type: String, required: true, trim: true },
  coordinates: {
    lat: { type: Number, default: null },
    lng: { type: Number, default: null }
  }
}, { _id: false });

const agentSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  name: { type: String, required: true, trim: true },
  phone: { type: String, required: true, trim: true },
  email: { type: String, required: true, trim: true, lowercase: true }
}, { _id: false });

const propertySchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  description: { type: String, required: true, trim: true },
  type: { type: String, enum: ['Rent', 'Buy'], required: true },
  category: { type: String, enum: ['houses', 'apartments', 'land', 'commercial'], required: true },
  status: { type: String, enum: ['available', 'unavailable', 'sold', 'rented'], default: 'available' },
  price: { type: Number, required: true, min: 0 },
  beds: { type: Number, required: true, min: 0 },
  baths: { type: Number, required: true, min: 0 },
  sqft: { type: Number, default: null, min: 0 },
  parking: { type: Number, default: 0, min: 0 },
  yearBuilt: { type: Number, default: null },
  location: { type: locationSchema, required: true },
  images: [imageSchema],
  features: [{ type: String, trim: true }],
  amenities: [{ type: String, trim: true }],
  agent: { type: agentSchema, required: true },
  views: { type: Number, default: 0 },
  featured: { type: Boolean, default: false },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }
}, { timestamps: true });

const Property = mongoose.model('Property', propertySchema);

// Sample properties data
const sampleProperties = [
  {
    title: '2 Bedroom House for Rent',
    description: `This beautiful 2-bedroom house is located in the serene Kapsoya Estate in Eldoret. 
    The property features modern finishes, a spacious living area, and a well-equipped kitchen. 
    Perfect for a small family or young professionals looking for comfort and convenience.
    
    The house has been recently renovated with high-quality materials and offers excellent natural lighting throughout.`,
    type: 'Rent',
    category: 'houses',
    status: 'available',
    price: 16000,
    beds: 2,
    baths: 2,
    sqft: 440,
    parking: 1,
    yearBuilt: 2020,
    location: {
      address: 'Kapsoya Estate, Pipeline Road',
      city: 'Eldoret',
      county: 'Uasin Gishu',
      coordinates: { lat: 0.5143, lng: 35.2698 }
    },
    images: [
      { url: 'https://images.unsplash.com/photo-1592595896551-12b371d546d5?w=800&auto=format&fit=crop', isPrimary: true, order: 0 },
      { url: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&auto=format&fit=crop', isPrimary: false, order: 1 }
    ],
    features: ['WiFi', 'Parking', 'Security', 'Garden', 'Modern Kitchen', 'Balcony'],
    amenities: ['Swimming Pool', 'Gym', '24/7 Security', 'Playground', 'Shopping Center'],
    agent: {
      name: 'Sarah Wanjiku',
      phone: '+254 721 860 371',
      email: 'sarah@kejamatch.com'
    },
    featured: true,
    views: 245
  },
  {
    title: 'Luxury Apartments in Kileleshwa',
    description: `Experience luxury living in these stunning modern apartments in the heart of Kileleshwa. 
    Featuring contemporary design, premium finishes, and breathtaking city views.
    
    Each unit comes with high-end appliances, spacious balconies, and access to world-class amenities.`,
    type: 'Rent',
    category: 'apartments',
    status: 'available',
    price: 68000,
    beds: 3,
    baths: 2,
    sqft: 1800,
    parking: 2,
    yearBuilt: 2022,
    location: {
      address: 'Kileleshwa Drive',
      city: 'Nairobi',
      county: 'Nairobi County',
      coordinates: { lat: -1.2696, lng: 36.7809 }
    },
    images: [
      { url: 'https://images.unsplash.com/photo-1565953522043-baea26b83b7e?w=800&auto=format&fit=crop', isPrimary: true, order: 0 },
      { url: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&auto=format&fit=crop', isPrimary: false, order: 1 }
    ],
    features: ['High-Speed WiFi', 'Covered Parking', 'Premium Security', 'Rooftop Garden', 'Designer Kitchen', 'Private Balcony', 'Smart Home Features'],
    amenities: ['Infinity Pool', 'State-of-art Gym', '24/7 Concierge', 'Business Center', 'Spa & Wellness', "Children's Play Area"],
    agent: {
      name: 'James Kimani',
      phone: '+254 722 123 456',
      email: 'james@kejamatch.com'
    },
    featured: true,
    views: 512
  },
  {
    title: '4 Bedroom House for Sale in Kilimani',
    description: `Magnificent 4-bedroom house situated in the exclusive Pinnacle Point area of Kilimani. 
    This elegant home features spacious rooms, high ceilings, and large windows that flood the interior with natural light.
    
    The property includes a well-manicured garden, private driveway, and a separate servant quarter.`,
    type: 'Buy',
    category: 'houses',
    status: 'available',
    price: 45000000,
    beds: 4,
    baths: 3,
    sqft: 3200,
    parking: 2,
    yearBuilt: 2021,
    location: {
      address: 'Pinnacle Point, Kilimani',
      city: 'Nairobi',
      county: 'Nairobi County',
      coordinates: { lat: -1.3032, lng: 36.7856 }
    },
    images: [
      { url: 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800&auto=format&fit=crop', isPrimary: true, order: 0 },
      { url: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&auto=format&fit=crop', isPrimary: false, order: 1 }
    ],
    features: ['Golf Course View', 'Double Garage', 'Gated Community', 'Landscaped Garden', 'Modern Kitchen', 'Master En-suite', 'Study Room'],
    amenities: ['Golf Course', 'Clubhouse', '24/7 Security', 'Tennis Court', 'Swimming Pool', 'Fitness Center'],
    agent: {
      name: 'Mary Njeri',
      phone: '+254 723 789 012',
      email: 'mary@kejamatch.com'
    },
    featured: false,
    views: 189
  },
  {
    title: '5 Bedroom Villa for Sale in Karen',
    description: `Stunning 5-bedroom villa in the prestigious Karen Estate, one of Nairobi's most sought-after 
    residential areas. This spacious family home sits on a large plot with mature landscaping.
    
    Features include a private swimming pool, expansive outdoor entertaining areas, and breathtaking views.`,
    type: 'Buy',
    category: 'houses',
    status: 'available',
    price: 85000000,
    beds: 5,
    baths: 4,
    sqft: 5500,
    parking: 3,
    yearBuilt: 2019,
    location: {
      address: 'Karen Estate',
      city: 'Karen',
      county: 'Nairobi County',
      coordinates: { lat: -1.3197, lng: 36.6917 }
    },
    images: [
      { url: 'https://plus.unsplash.com/premium_photo-1734545294117-a910817d5961?w=800&auto=format&fit=crop', isPrimary: true, order: 0 },
      { url: 'https://images.unsplash.com/photo-1613977257363-707ba9348227?w=800&auto=format&fit=crop', isPrimary: false, order: 1 }
    ],
    features: ['Large Compound', 'Triple Garage', 'Servant Quarter', 'Mature Garden', 'Fireplace', 'Walk-in Closets', 'Outdoor Patio'],
    amenities: ['Private Pool', 'Exclusive Neighborhood', 'Private Schools Nearby', 'Shopping Centers', 'Golf Clubs'],
    agent: {
      name: 'Peter Mwangi',
      phone: '+254 724 456 789',
      email: 'peter@kejamatch.com'
    },
    featured: true,
    views: 324
  },
  {
    title: 'Modern Apartment in Riruta',
    description: `Modern 3-bedroom apartment in the vibrant Riruta area along Naivasha Road. This contemporary 
    unit offers comfortable living with modern amenities and finishes.
    
    Ideal for young professionals or small families looking for affordable quality housing.`,
    type: 'Buy',
    category: 'apartments',
    status: 'available',
    price: 8500000,
    beds: 3,
    baths: 2,
    sqft: 1200,
    parking: 1,
    yearBuilt: 2023,
    location: {
      address: 'Riruta Estate, Naivasha Road',
      city: 'Nairobi',
      county: 'Nairobi County',
      coordinates: { lat: -1.2921, lng: 36.7344 }
    },
    images: [
      { url: 'https://images.unsplash.com/photo-1635108199095-f2db38e6632e?w=800&auto=format&fit=crop', isPrimary: true, order: 0 },
      { url: 'https://images.unsplash.com/photo-1560185127-6ed189bf02f4?w=800&auto=format&fit=crop', isPrimary: false, order: 1 }
    ],
    features: ['Modern Design', 'Covered Parking', 'Urban Setting', 'Balcony Views', 'Contemporary Kitchen', 'Built-in Wardrobes'],
    amenities: ['Community Pool', 'Gym Facility', "Children's Area", 'CCTV Security', 'Backup Generator'],
    agent: {
      name: 'Grace Wanjiku',
      phone: '+254 725 567 890',
      email: 'grace@kejamatch.com'
    },
    featured: false,
    views: 156
  },
  {
    title: '5 Bedroom Townhouse in Westlands',
    description: `Luxurious 5-bedroom townhouse in the heart of Westlands, Nairobi's premier business and 
    entertainment district. This stunning property offers sophisticated living with premium finishes.
    
    Walking distance to major shopping centers, restaurants, and business hubs.`,
    type: 'Rent',
    category: 'houses',
    status: 'available',
    price: 250000,
    beds: 5,
    baths: 4,
    sqft: 4000,
    parking: 2,
    yearBuilt: 2022,
    location: {
      address: 'Westlands',
      city: 'Nairobi',
      county: 'Nairobi County',
      coordinates: { lat: -1.2676, lng: 36.8108 }
    },
    images: [
      { url: 'https://images.unsplash.com/photo-1723110994499-df46435aa4b3?w=800&auto=format&fit=crop', isPrimary: true, order: 0 },
      { url: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&auto=format&fit=crop', isPrimary: false, order: 1 }
    ],
    features: ['Prime Location', 'Double Parking', 'Modern Finishes', 'Rooftop Terrace', 'Smart Home System', 'High-end Appliances'],
    amenities: ['Business District', 'Shopping Malls', 'Fine Dining', 'Entertainment', 'Public Transport', 'Banking Services'],
    agent: {
      name: 'David Ochieng',
      phone: '+254 726 678 901',
      email: 'david@kejamatch.com'
    },
    featured: true,
    views: 287
  }
];

async function seedProperties() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/kejamatch';
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    // Check if properties already exist
    const existingCount = await Property.countDocuments();
    if (existingCount > 0) {
      console.log(`⚠️  Database already has ${existingCount} properties.`);
      const answer = process.argv.includes('--force');
      if (!answer) {
        console.log('   Run with --force to delete existing and re-seed.');
        console.log('   Exiting without changes.');
        await mongoose.disconnect();
        process.exit(0);
      }
      console.log('🗑️  Deleting existing properties...');
      await Property.deleteMany({});
    }

    // Get admin user ID (or create a placeholder ObjectId)
    const User = mongoose.models.User || mongoose.model('User', new mongoose.Schema({ email: String }));
    let adminUser = await User.findOne({ role: 'admin' });
    
    let createdById;
    if (adminUser) {
      createdById = adminUser._id;
      console.log(`✅ Found admin user: ${adminUser.email}`);
    } else {
      // Create a placeholder ObjectId if no admin exists
      createdById = new mongoose.Types.ObjectId();
      console.log('⚠️  No admin user found, using placeholder ID');
    }

    // Add createdBy to all properties
    const propertiesWithCreator = sampleProperties.map(prop => ({
      ...prop,
      createdBy: createdById
    }));

    // Insert properties
    console.log('📝 Inserting properties...');
    const result = await Property.insertMany(propertiesWithCreator);
    console.log(`✅ Successfully seeded ${result.length} properties!`);

    // List inserted properties
    console.log('\n📋 Inserted Properties:');
    result.forEach((prop, index) => {
      console.log(`   ${index + 1}. ${prop.title} (${prop.type}) - KES ${prop.price.toLocaleString()}`);
    });

    await mongoose.disconnect();
    console.log('\n✅ Database seeding completed!');
    process.exit(0);

  } catch (error) {
    console.error('❌ Error seeding database:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

// Run the seed function
seedProperties();