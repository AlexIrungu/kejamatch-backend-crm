// Script to directly add passwords to users
// Run this: node fix-all-passwords.js

import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function fixAllPasswords() {
  console.log('\n' + '='.repeat(70));
  console.log('🔧 FIXING ALL USER PASSWORDS');
  console.log('='.repeat(70) + '\n');

  try {
    // Read the users.json file
    const usersFilePath = path.join(__dirname, 'data', 'users.json');
    console.log('📂 Reading file:', usersFilePath);
    
    const fileContent = fs.readFileSync(usersFilePath, 'utf-8');
    const users = JSON.parse(fileContent);
    
    console.log(`📊 Found ${users.length} users\n`);

    // Define passwords for each user
    const passwords = {
      'admin@kejamatch.com': 'Admin123!',
      'nontsale@gmail.com': 'Agent123!'
    };

    // Update each user with hashed password
    for (const user of users) {
      const password = passwords[user.email];
      
      if (password) {
        console.log(`🔐 Setting password for: ${user.email}`);
        console.log(`   Password: ${password}`);
        
        // Hash the password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        
        // Update user object
        user.password = hashedPassword;
        
        console.log(`✅ Password hashed successfully`);
        console.log(`   Hash preview: ${hashedPassword.substring(0, 30)}...\n`);
      }
    }

    // Write back to file
    console.log('💾 Writing updated users to file...');
    fs.writeFileSync(usersFilePath, JSON.stringify(users, null, 2));
    console.log('✅ File updated successfully!\n');

    // Verify the passwords work
    console.log('🧪 Verifying passwords...\n');
    
    for (const user of users) {
      const password = passwords[user.email];
      if (password && user.password) {
        const isValid = await bcrypt.compare(password, user.password);
        if (isValid) {
          console.log(`✅ ${user.email}: Password verified successfully`);
        } else {
          console.log(`❌ ${user.email}: Password verification FAILED`);
        }
      }
    }

    console.log('\n' + '='.repeat(70));
    console.log('🎉 SUCCESS! All passwords have been set!');
    console.log('='.repeat(70));
    console.log('\n📝 LOGIN CREDENTIALS:\n');
    console.log('Admin Account:');
    console.log('  📧 Email: admin@kejamatch.com');
    console.log('  🔑 Password: Admin123!\n');
    console.log('Agent Account:');
    console.log('  📧 Email: nontsale@gmail.com');
    console.log('  🔑 Password: Agent123!\n');
    console.log('⚠️  Remember to restart your backend server!\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
  }
}

fixAllPasswords();