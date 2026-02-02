// Script to set password for existing admin account
// Run this: node fix-admin-password.js

import { userStorage } from './src/services/userStorage.js';

async function fixAdminPassword() {
  console.log('\n🔧 Fixing Admin Password\n');
  console.log('='.repeat(50));
  
  try {
    // Find the admin user
    const users = await userStorage.getAllUsers();
    const admin = users.find(u => u.role === 'admin');
    
    if (!admin) {
      console.log('❌ No admin user found!');
      return;
    }
    
    console.log('\n👤 Current Admin:');
    console.log('  - Email:', admin.email);
    console.log('  - Name:', admin.name);
    console.log('  - Password Hash:', admin.password ? 'EXISTS' : 'MISSING ❌');
    
    // Set new password
    const newPassword = 'Admin123!';
    
    console.log('\n🔒 Setting new password...');
    console.log('  Password:', newPassword);
    
    // Update the admin user with new password
    const updatedAdmin = await userStorage.updateUser(admin.id, {
      password: newPassword
    });
    
    console.log('\n✅ Admin password updated successfully!');
    console.log('\n📝 Login Credentials:');
    console.log('  Email:', updatedAdmin.email);
    console.log('  Password:', newPassword);
    
    // Verify the password works
    console.log('\n🧪 Testing login...');
    const testLogin = await userStorage.authenticate(updatedAdmin.email, newPassword);
    
    if (testLogin) {
      console.log('✅ Password verification successful!');
      console.log('\n🎉 You can now log in with:');
      console.log('  📧 Email: admin@kejamatch.com');
      console.log('  🔑 Password: Admin123!');
    } else {
      console.log('❌ Password verification failed!');
    }
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
  }
}

fixAdminPassword();