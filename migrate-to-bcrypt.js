/**
 * Migration Script: Reset Admin Password with Bcrypt
 * 
 * This script will:
 * 1. Delete the existing users.json file
 * 2. Restart the server to create a new admin with bcrypt-hashed password
 * 
 * OR if you want to keep existing users:
 * Run this script to update just the admin password to use bcrypt
 * 
 * Usage: node migrate-to-bcrypt.js
 */

import 'dotenv/config';
import fs from 'fs/promises';
import path from 'path';
import bcrypt from 'bcrypt';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const USERS_FILE = path.join(__dirname, 'data/users.json');
const SALT_ROUNDS = 12;

async function migratePasswords() {
  console.log('🔄 Starting password migration to bcrypt...\n');

  try {
    // Read existing users
    const data = await fs.readFile(USERS_FILE, 'utf8');
    const users = JSON.parse(data);

    console.log(`📋 Found ${users.length} users to migrate\n`);

    // For each user, we need to reset their password since we can't decrypt SHA256
    // In production, you'd typically force users to reset their passwords
    // For now, we'll set a temporary password for each user

    const migratedUsers = [];

    for (const user of users) {
      // Check if already using bcrypt (starts with $2a$, $2b$, or $2y$)
      if (user.password && user.password.startsWith('$2')) {
        console.log(`✓ ${user.email} - Already using bcrypt`);
        migratedUsers.push(user);
        continue;
      }

      // Generate new bcrypt hash
      // For admin, use the default password
      // For agents, generate a temporary password they'll need to reset
      let newPassword;
      if (user.role === 'admin') {
        newPassword = 'Admin@123';
        console.log(`🔐 ${user.email} - Reset to default admin password (Admin@123)`);
      } else {
        // For agents, use a pattern they can remember: TempPass + first 4 chars of email + @123
        const emailPrefix = user.email.split('@')[0].substring(0, 4);
        newPassword = `TempPass${emailPrefix}@123`;
        console.log(`🔐 ${user.email} - Temporary password: ${newPassword}`);
      }

      const hashedPassword = await bcrypt.hash(newPassword, SALT_ROUNDS);
      
      migratedUsers.push({
        ...user,
        password: hashedPassword,
      });
    }

    // Save migrated users
    await fs.writeFile(USERS_FILE, JSON.stringify(migratedUsers, null, 2), 'utf8');

    console.log('\n✅ Migration complete!');
    console.log('\n⚠️  IMPORTANT:');
    console.log('   - Admin password has been reset to: Admin@123');
    console.log('   - All agent passwords have been reset to temporary passwords');
    console.log('   - Please have all users change their passwords after logging in');
    console.log('\n🚀 You can now restart your server with: node src/server.js');

  } catch (error) {
    if (error.code === 'ENOENT') {
      console.log('📝 No users.json found. Starting fresh.');
      console.log('   Run "node src/server.js" to create a new admin user.');
    } else {
      console.error('❌ Migration failed:', error);
    }
  }
}

// Alternative: Complete reset (delete users.json)
async function completeReset() {
  console.log('🗑️  Performing complete reset...\n');

  try {
    await fs.unlink(USERS_FILE);
    console.log('✅ Deleted users.json');
    console.log('\n🚀 Run "node src/server.js" to create a fresh admin user with bcrypt.');
  } catch (error) {
    if (error.code === 'ENOENT') {
      console.log('📝 No users.json found. Already clean.');
    } else {
      console.error('❌ Reset failed:', error);
    }
  }
}

// Check command line arguments
const args = process.argv.slice(2);

if (args.includes('--reset')) {
  completeReset();
} else {
  migratePasswords();
}