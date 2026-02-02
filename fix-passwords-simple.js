// Script to fix passwords using userStorage service
// Run this: node fix-passwords-simple.js

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { userStorage } from './src/services/userStorage.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function fixPasswords() {
  console.log('\n' + '='.repeat(70));
  console.log('🔧 FIXING ALL USER PASSWORDS');
  console.log('='.repeat(70) + '\n');

  try {
    // Get all users
    const users = await userStorage.getAllUsers();
    console.log(`📊 Found ${users.length} users\n`);

    // Check current status
    for (const user of users) {
      console.log(`User: ${user.email}`);
      console.log(`  - Has password: ${!!user.password}`);
      console.log(`  - Password length: ${user.password ? user.password.length : 0}\n`);
    }

    // Define new passwords
    const newPasswords = {
      'admin@kejamatch.com': 'Admin123!',
      'nontsale@gmail.com': 'Agent123!'
    };

    console.log('🔐 Setting new passwords...\n');

    // Update each user
    for (const user of users) {
      const newPassword = newPasswords[user.email];
      
      if (newPassword) {
        console.log(`Updating: ${user.email}`);
        console.log(`  New password: ${newPassword}`);
        
        try {
          // Use userStorage.updateUser which will hash the password
          await userStorage.updateUser(user.id, {
            password: newPassword
          });
          
          console.log(`  ✅ Password updated successfully\n`);
          
          // Verify it works
          const authResult = await userStorage.authenticate(user.email, newPassword);
          if (authResult) {
            console.log(`  ✅ Authentication verified!\n`);
          } else {
            console.log(`  ❌ Authentication verification failed!\n`);
          }
        } catch (error) {
          console.log(`  ❌ Error updating password: ${error.message}\n`);
        }
      }
    }

    console.log('='.repeat(70));
    console.log('🎉 PASSWORD UPDATE COMPLETE!');
    console.log('='.repeat(70));
    console.log('\n📝 LOGIN CREDENTIALS:\n');
    console.log('Admin Account:');
    console.log('  📧 Email: admin@kejamatch.com');
    console.log('  🔑 Password: Admin123!\n');
    console.log('Agent Account:');
    console.log('  📧 Email: nontsale@gmail.com');
    console.log('  🔑 Password: Agent123!\n');
    console.log('⚠️  IMPORTANT: Restart your backend server now!\n');
    console.log('Then try logging in with the credentials above.\n');

  } catch (error) {
    console.error('❌ Fatal Error:', error.message);
    console.error('Stack:', error.stack);
  }
}

fixPasswords();