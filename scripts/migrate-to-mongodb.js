#!/usr/bin/env node

/**
 * Migration Script: JSON to MongoDB
 * 
 * This script migrates data from JSON files to MongoDB Atlas
 * Run: node scripts/migrate-to-mongodb.js
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../src/models/UserModel.js';
import Lead from '../src/models/LeadModel.js';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const USERS_FILE = path.join(__dirname, '../data/users.json');
const LEADS_FILE = path.join(__dirname, '../data/leads.json');
const BACKUP_DIR = path.join(__dirname, '../data/backups');

class Migration {
  constructor() {
    this.stats = {
      users: { total: 0, migrated: 0, skipped: 0, errors: 0 },
      leads: { total: 0, migrated: 0, skipped: 0, errors: 0 }
    };
  }

  async createBackup() {
    console.log('\n📦 Creating backup of existing JSON files...');
    
    try {
      await fs.mkdir(BACKUP_DIR, { recursive: true });
      
      const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];
      
      try {
        await fs.copyFile(USERS_FILE, path.join(BACKUP_DIR, `users-${timestamp}.json`));
        console.log('✅ Users backup created');
      } catch (err) {
        if (err.code !== 'ENOENT') throw err;
        console.log('⚠️  No users.json file to backup');
      }
      
      try {
        await fs.copyFile(LEADS_FILE, path.join(BACKUP_DIR, `leads-${timestamp}.json`));
        console.log('✅ Leads backup created');
      } catch (err) {
        if (err.code !== 'ENOENT') throw err;
        console.log('⚠️  No leads.json file to backup');
      }
      
    } catch (error) {
      console.error('❌ Backup failed:', error);
      throw error;
    }
  }

  async readJsonFile(filePath) {
    try {
      const data = await fs.readFile(filePath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      if (error.code === 'ENOENT') {
        return null;
      }
      throw error;
    }
  }

  async migrateUsers() {
    console.log('\n👥 Migrating users...');
    
    const usersData = await this.readJsonFile(USERS_FILE);
    
    if (!usersData || !Array.isArray(usersData)) {
      console.log('⚠️  No users data found in JSON file');
      return;
    }

    this.stats.users.total = usersData.length;
    console.log(`Found ${usersData.length} users to migrate`);

    for (const userData of usersData) {
      try {
        // Check if user already exists
        const existing = await User.findOne({ email: userData.email });
        
        if (existing) {
          console.log(`⏭️  Skipping ${userData.email} (already exists)`);
          this.stats.users.skipped++;
          continue;
        }

        // Create new user - but we need to handle password specially
        // Since JSON passwords are already hashed, we'll import them as-is
        const newUser = new User({
          email: userData.email,
          name: userData.name,
          role: userData.role,
          isActive: userData.isActive !== undefined ? userData.isActive : true,
          isVerified: userData.isVerified !== undefined ? userData.isVerified : false,
          lastLogin: userData.lastLogin ? new Date(userData.lastLogin) : null,
          createdAt: userData.createdAt ? new Date(userData.createdAt) : new Date(),
        });

        // Manually set the hashed password (bypass the pre-save hook)
        // This preserves the existing password hash from JSON
        if (userData.password) {
          newUser.password = userData.password;
          // Save without triggering the password hashing middleware
          await User.collection.insertOne(newUser.toObject());
          console.log(`✅ Migrated ${userData.email}`);
        } else {
          // If no password in JSON, user needs to reset
          console.log(`⚠️  ${userData.email} has no password - will need to reset`);
          await newUser.save();
        }
        
        this.stats.users.migrated++;
        
      } catch (error) {
        console.error(`❌ Error migrating user ${userData.email}:`, error.message);
        this.stats.users.errors++;
      }
    }
  }

  async migrateLeads() {
    console.log('\n📋 Migrating leads...');
    
    const leadsData = await this.readJsonFile(LEADS_FILE);
    
    if (!leadsData || !leadsData.leads || !Array.isArray(leadsData.leads)) {
      console.log('⚠️  No leads data found in JSON file');
      return;
    }

    this.stats.leads.total = leadsData.leads.length;
    console.log(`Found ${leadsData.leads.length} leads to migrate`);

    // Create a map of old user IDs to new MongoDB IDs
    const userIdMap = {};
    const allUsers = await User.find({});
    
    for (const user of allUsers) {
      userIdMap[user.email] = user._id;
    }

    for (const leadData of leadsData.leads) {
      try {
        // Check if lead already exists (by email + createdAt)
        const createdAt = leadData.createdAt ? new Date(leadData.createdAt) : new Date();
        const existing = await Lead.findOne({
          email: leadData.email,
          createdAt: {
            $gte: new Date(createdAt.getTime() - 1000),
            $lte: new Date(createdAt.getTime() + 1000)
          }
        });
        
        if (existing) {
          console.log(`⏭️  Skipping lead ${leadData.email} (already exists)`);
          this.stats.leads.skipped++;
          continue;
        }

        // Convert old UUID-based assignedTo to MongoDB ObjectId
        let assignedToId = null;
        if (leadData.assignedTo) {
          // Try to find user by the old ID first (won't work, but keeping for reference)
          // We'll need to match by assignedToName if available
          if (leadData.assignedToName) {
            const assignedUser = await User.findOne({ name: leadData.assignedToName });
            if (assignedUser) {
              assignedToId = assignedUser._id;
            }
          }
        }

        // Create new lead
        const newLead = new Lead({
          name: leadData.name,
          email: leadData.email,
          phoneNumber: leadData.phoneNumber || leadData.phone,
          subject: leadData.subject,
          message: leadData.message,
          status: leadData.status || 'new',
          source: leadData.source || 'website_contact_form',
          syncedToOdoo: leadData.syncedToOdoo || false,
          odooLeadId: leadData.odooLeadId || null,
          syncedAt: leadData.syncedAt ? new Date(leadData.syncedAt) : null,
          assignedTo: assignedToId,
          assignedToName: leadData.assignedToName || null,
          assignedAt: leadData.assignedAt ? new Date(leadData.assignedAt) : null,
          lastContactedAt: leadData.lastContactedAt ? new Date(leadData.lastContactedAt) : null,
          lastNote: leadData.lastNote || null,
          createdAt: createdAt,
          updatedAt: leadData.updatedAt ? new Date(leadData.updatedAt) : createdAt,
          activities: leadData.activities || [],
          viewings: leadData.viewings || [],
          interestedProperties: leadData.interestedProperties || []
        });

        await newLead.save();
        console.log(`✅ Migrated lead: ${leadData.email}`);
        this.stats.leads.migrated++;
        
      } catch (error) {
        console.error(`❌ Error migrating lead ${leadData.email}:`, error.message);
        this.stats.leads.errors++;
      }
    }
  }

  async createDefaultAdmin() {
    console.log('\n👨‍💼 Checking for admin user...');
    
    const adminCount = await User.countDocuments({ role: 'admin' });
    
    if (adminCount === 0) {
      console.log('No admin found, creating default admin...');
      await User.createDefaultAdmin();
    } else {
      console.log(`✅ Found ${adminCount} admin user(s)`);
    }
  }

  printStats() {
    console.log('\n' + '='.repeat(50));
    console.log('📊 MIGRATION SUMMARY');
    console.log('='.repeat(50));
    
    console.log('\n👥 Users:');
    console.log(`   Total:    ${this.stats.users.total}`);
    console.log(`   Migrated: ${this.stats.users.migrated}`);
    console.log(`   Skipped:  ${this.stats.users.skipped}`);
    console.log(`   Errors:   ${this.stats.users.errors}`);
    
    console.log('\n📋 Leads:');
    console.log(`   Total:    ${this.stats.leads.total}`);
    console.log(`   Migrated: ${this.stats.leads.migrated}`);
    console.log(`   Skipped:  ${this.stats.leads.skipped}`);
    console.log(`   Errors:   ${this.stats.leads.errors}`);
    
    console.log('\n' + '='.repeat(50));
  }

  async run() {
    try {
      console.log('🚀 Starting MongoDB Migration');
      console.log('='.repeat(50));
      
      // Check if MongoDB URI is set
      if (!process.env.MONGODB_URI) {
        console.error('\n❌ MONGODB_URI not found in .env file!');
        console.log('Please add your MongoDB connection string:');
        console.log('MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/kejamatch');
        process.exit(1);
      }

      // Connect to MongoDB
      console.log('\n🔌 Connecting to MongoDB...');
      await mongoose.connect(process.env.MONGODB_URI);
      console.log('✅ Connected to MongoDB');
      console.log(`📍 Database: ${mongoose.connection.name}`);

      // Create backup
      await this.createBackup();

      // Migrate users first (so we have IDs for lead assignment)
      await this.migrateUsers();

      // Migrate leads
      await this.migrateLeads();

      // Ensure default admin exists
      await this.createDefaultAdmin();

      // Print summary
      this.printStats();

      console.log('\n✅ Migration completed successfully!');
      console.log('\n💡 Next steps:');
      console.log('   1. Update your server.js to use MongoDB');
      console.log('   2. Test the application thoroughly');
      console.log('   3. Keep JSON backups until confident in migration');
      
    } catch (error) {
      console.error('\n❌ Migration failed:', error);
      throw error;
    } finally {
      await mongoose.disconnect();
      console.log('\n👋 Disconnected from MongoDB\n');
    }
  }
}

// Run migration
const migration = new Migration();
migration.run().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});