// Script to create fresh admin user
// Run this: node create-fresh-admin.js

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { userStorage } from './src/services/userStorage.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function createFreshAdmin() {
  console.log('\n' + '='.repeat(70));
  console.log('🆕 CREATING FRESH ADMIN USER');
  console.log('='.repeat(70) + '\n');

  try {
    // Step 1: Backup current users
    const usersFilePath = path.join(__dirname, 'data', 'users.json');
    const backupPath = path.join(__dirname, 'data', 'users.backup.json');
    
    if (fs.existsSync(usersFilePath)) {
      console.log('💾 Backing up current users.json...');
      fs.copyFileSync(usersFilePath, backupPath);
      console.log(`✅ Backup saved to: ${backupPath}\n`);
    }

    // Step 2: Get current users
    const currentUsers = await userStorage.getAllUsers();
    console.log(`📊 Current users: ${currentUsers.length}\n`);
    
    currentUsers.forEach(user => {
      console.log(`  - ${user.email} (${user.role})`);
    });
    console.log('');

    // Step 3: Delete old admin
    console.log('🗑️  Removing old admin account...');
    const oldAdmin = currentUsers.find(u => u.email === 'admin@kejamatch.com');
    if (oldAdmin) {
      // Manually delete from file
      const updatedUsers = currentUsers.filter(u => u.email !== 'admin@kejamatch.com');
      fs.writeFileSync(usersFilePath, JSON.stringify(updatedUsers, null, 2));
      console.log('✅ Old admin removed\n');
    }

    // Step 4: Create new admin
    console.log('👤 Creating new admin user...');
    console.log('  Email: admin@kejamatch.com');
    console.log('  Password: Admin123!');
    console.log('  Name: Admin User');
    console.log('  Role: admin\n');

    const newAdmin = await userStorage.createUser({
      email: 'admin@kejamatch.com',
      password: 'Admin123!',
      name: 'Admin User',
      role: 'admin'
    });

    console.log('✅ Admin user created successfully!\n');
    console.log('User Details:');
    console.log(`  ID: ${newAdmin.id}`);
    console.log(`  Email: ${newAdmin.email}`);
    console.log(`  Name: ${newAdmin.name}`);
    console.log(`  Role: ${newAdmin.role}`);
    console.log(`  Active: ${newAdmin.isActive}`);
    console.log(`  Has Password: ${!!newAdmin.password}`);
    console.log(`  Password Hash Length: ${newAdmin.password ? newAdmin.password.length : 0}\n`);

    // Step 5: Test authentication
    console.log('🧪 Testing authentication...\n');
    
    const authResult = await userStorage.authenticate('admin@kejamatch.com', 'Admin123!');
    
    if (authResult) {
      console.log('✅ Authentication successful!');
      console.log('✅ Login works correctly!\n');
    } else {
      console.log('❌ Authentication failed!\n');
    }

    // Step 6: Create/update agent if needed
    const agent = currentUsers.find(u => u.email === 'nontsale@gmail.com');
    if (agent && !agent.password) {
      console.log('🔧 Fixing agent password...\n');
      await userStorage.updateUser(agent.id, { password: 'Agent123!' });
      console.log('✅ Agent password updated\n');
    }

    // Final summary
    const allUsers = await userStorage.getAllUsers();
    
    console.log('='.repeat(70));
    console.log('🎉 SETUP COMPLETE!');
    console.log('='.repeat(70));
    console.log(`\n📊 Total users: ${allUsers.length}\n`);
    
    allUsers.forEach(user => {
      console.log(`${user.role === 'admin' ? '👑' : '👤'} ${user.email}`);
      console.log(`   Role: ${user.role}`);
      console.log(`   Has Password: ${!!user.password ? '✅' : '❌'}`);
      console.log('');
    });

    console.log('='.repeat(70));
    console.log('📝 LOGIN CREDENTIALS');
    console.log('='.repeat(70));
    console.log('\n🔐 Admin Account:');
    console.log('   Email: admin@kejamatch.com');
    console.log('   Password: Admin123!');
    
    if (allUsers.find(u => u.email === 'nontsale@gmail.com')) {
      console.log('\n🔐 Agent Account:');
      console.log('   Email: nontsale@gmail.com');
      console.log('   Password: Agent123!');
    }
    
    console.log('\n⚠️  NEXT STEPS:');
    console.log('1. Restart your backend server');
    console.log('2. Clear browser localStorage');
    console.log('3. Try logging in with the credentials above\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
  }
}

createFreshAdmin();