// Comprehensive auth debugging script
// Run this: node debug-auth-flow.js

import { userStorage } from './src/services/userStorage.js';
import { generateToken } from './src/middleware/auth.js';
import jwt from 'jsonwebtoken';

async function debugAuthFlow() {
  console.log('\n' + '='.repeat(70));
  console.log('🔍 COMPREHENSIVE AUTH DEBUGGING');
  console.log('='.repeat(70) + '\n');

  try {
    // Step 1: Check all users
    console.log('📊 Step 1: Loading users from storage...\n');
    const users = await userStorage.getAllUsers();
    console.log(`Found ${users.length} users:\n`);
    
    users.forEach((user, index) => {
      console.log(`${index + 1}. ${user.email}`);
      console.log(`   - Name: ${user.name}`);
      console.log(`   - Role: ${user.role}`);
      console.log(`   - Active: ${user.isActive}`);
      console.log(`   - Has Password: ${!!user.password}`);
      console.log(`   - Password Length: ${user.password ? user.password.length : 0}`);
      console.log('');
    });

    // Step 2: Test authentication for each user
    console.log('\n' + '='.repeat(70));
    console.log('🔐 Step 2: Testing Authentication\n');
    console.log('='.repeat(70) + '\n');

    const testPasswords = {
      'admin@kejamatch.com': ['Admin123!', 'admin123', 'Admin123', 'password'],
      'nontsale@gmail.com': ['Agent123!', 'agent123', 'password'] // Add the actual password you used
    };

    for (const user of users) {
      console.log(`\nTesting: ${user.email}`);
      console.log('-'.repeat(50));
      
      const passwordsToTest = testPasswords[user.email] || ['Admin123!', 'password'];
      let foundPassword = false;
      
      for (const password of passwordsToTest) {
        try {
          const result = await userStorage.authenticate(user.email, password);
          if (result) {
            console.log(`✅ SUCCESS with password: "${password}"`);
            foundPassword = true;
            
            // Test token generation
            try {
              const token = generateToken(result);
              console.log(`✅ Token generated successfully`);
              console.log(`   Token preview: ${token.substring(0, 30)}...`);
              
              // Verify token
              const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key-change-this-in-production');
              console.log(`✅ Token verified successfully`);
              console.log(`   User ID: ${decoded.userId}`);
              console.log(`   Role: ${decoded.role}`);
            } catch (tokenError) {
              console.log(`❌ Token error: ${tokenError.message}`);
            }
            
            break;
          }
        } catch (error) {
          // Password didn't work, continue to next
        }
      }
      
      if (!foundPassword) {
        console.log(`❌ None of the test passwords worked`);
        console.log(`   Tried: ${passwordsToTest.join(', ')}`);
      }
    }

    // Step 3: Test the full login flow
    console.log('\n\n' + '='.repeat(70));
    console.log('🧪 Step 3: Simulating Full Login Flow\n');
    console.log('='.repeat(70) + '\n');

    // Test admin login
    console.log('Testing Admin Login Flow:');
    console.log('-'.repeat(50));
    try {
      const adminUser = await userStorage.authenticate('admin@kejamatch.com', 'Admin123!');
      if (adminUser) {
        console.log('✅ Authentication successful');
        console.log('📦 User object:', JSON.stringify(adminUser, null, 2));
        
        const token = generateToken(adminUser);
        console.log('✅ Token generated');
        
        console.log('\n📝 Expected Response:');
        console.log(JSON.stringify({
          success: true,
          message: 'Login successful',
          data: {
            user: adminUser,
            token: token.substring(0, 30) + '...'
          }
        }, null, 2));
      }
    } catch (error) {
      console.log('❌ Admin login failed:', error.message);
    }

    // Step 4: Check JWT secret
    console.log('\n\n' + '='.repeat(70));
    console.log('🔑 Step 4: Environment Check\n');
    console.log('='.repeat(70) + '\n');
    
    console.log('JWT_SECRET exists:', !!process.env.JWT_SECRET);
    console.log('JWT_SECRET length:', process.env.JWT_SECRET ? process.env.JWT_SECRET.length : 0);
    console.log('NODE_ENV:', process.env.NODE_ENV || 'not set');
    console.log('PORT:', process.env.PORT || 'not set');

    // Step 5: Recommendations
    console.log('\n\n' + '='.repeat(70));
    console.log('💡 RECOMMENDATIONS\n');
    console.log('='.repeat(70) + '\n');

    if (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'your-secret-key-change-this-in-production') {
      console.log('⚠️  WARNING: JWT_SECRET is not properly set!');
      console.log('   Add this to your .env file:');
      console.log('   JWT_SECRET=some-very-long-and-random-secret-key-here');
      console.log('');
    }

    console.log('✅ Next Steps:');
    console.log('1. Note the working passwords from Step 2');
    console.log('2. Clear your browser localStorage');
    console.log('3. Try logging in with the correct password');
    console.log('4. Check browser console for detailed logs');
    console.log('');

  } catch (error) {
    console.error('\n❌ Fatal Error:', error);
    console.error('Stack:', error.stack);
  }
}

debugAuthFlow();