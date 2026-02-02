// Test script to verify admin credentials
// Run this in your backend directory: node test-admin-login.js

import { userStorage } from './src/services/userStorage.js';

async function testAdminLogin() {
  console.log('\n🔍 Testing Admin Login\n');
  console.log('='.repeat(50));
  
  try {
    // Get all users
    const users = await userStorage.getAllUsers();
    console.log('\n📊 Total users:', users.length);
    
    // Find admin
    const admin = users.find(u => u.role === 'admin');
    
    if (!admin) {
      console.log('❌ No admin user found!');
      return;
    }
    
    console.log('\n👤 Admin User Found:');
    console.log('  - Email:', admin.email);
    console.log('  - Name:', admin.name);
    console.log('  - Role:', admin.role);
    console.log('  - Active:', admin.isActive);
    console.log('  - Password Hash:', admin.password ? 'EXISTS' : 'MISSING');
    
    // Try to authenticate with common passwords
    const testPasswords = [
      'admin123',
      'Admin123',
      'admin@123',
      'Admin@123',
      'password',
      'Password123',
    ];
    
    console.log('\n🔐 Testing common passwords...\n');
    
    for (const password of testPasswords) {
      try {
        const result = await userStorage.authenticate(admin.email, password);
        if (result) {
          console.log(`✅ SUCCESS! Password is: "${password}"`);
          return;
        }
      } catch (error) {
        console.log(`❌ Not: "${password}"`);
      }
    }
    
    console.log('\n⚠️  None of the common passwords worked.');
    console.log('💡 The admin password might be custom or not set properly.');
    console.log('\n📝 To reset the admin password, you can:');
    console.log('1. Delete the data/users.json file');
    console.log('2. Restart the server');
    console.log('3. Register a new admin user');
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

testAdminLogin();