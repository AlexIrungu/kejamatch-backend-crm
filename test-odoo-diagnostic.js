import dotenv from 'dotenv';
import fetch from 'node-fetch';

dotenv.config();

const ODOO_URL = process.env.ODOO_URL;
const ODOO_DB = process.env.ODOO_DB;
const ODOO_USERNAME = process.env.ODOO_USERNAME;
const ODOO_PASSWORD = process.env.ODOO_PASSWORD;

console.log('🔍 Odoo Connection Diagnostic Test\n');

// Check configuration
console.log('📋 Configuration:');
console.log('  URL:', ODOO_URL);
console.log('  Database:', ODOO_DB);
console.log('  Username:', ODOO_USERNAME);
console.log('  Password length:', ODOO_PASSWORD?.length || 0);
console.log('  Password starts with:', ODOO_PASSWORD?.substring(0, 4) + '...');
console.log('');

async function diagnosticTest() {
  try {
    // Test 1: Check if Odoo server is reachable
    console.log('🌐 Test 1: Checking if Odoo server is reachable...');
    try {
      const pingResponse = await fetch(`${ODOO_URL}/web/database/selector`, {
        method: 'GET',
      });
      console.log('  Status:', pingResponse.status);
      if (pingResponse.ok) {
        console.log('  ✅ Server is reachable');
      } else {
        console.log('  ⚠️  Server responded with status:', pingResponse.status);
      }
    } catch (error) {
      console.log('  ❌ Cannot reach server:', error.message);
      return;
    }
    console.log('');

    // Test 2: List available databases
    console.log('🗄️  Test 2: Checking available databases...');
    try {
      const dbResponse = await fetch(`${ODOO_URL}/web/database/list`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'call',
          params: {},
        }),
      });
      const dbData = await dbResponse.json();
      if (dbData.result) {
        console.log('  Available databases:', dbData.result);
        if (dbData.result.includes(ODOO_DB)) {
          console.log('  ✅ Your database "' + ODOO_DB + '" exists');
        } else {
          console.log('  ⚠️  Your database "' + ODOO_DB + '" not found in list');
          console.log('  💡 Try using one of:', dbData.result);
        }
      } else {
        console.log('  ℹ️  Database listing might be disabled (this is normal for production)');
      }
    } catch (error) {
      console.log('  ℹ️  Could not list databases (might be disabled)');
    }
    console.log('');

    // Test 3: Try authentication with detailed error info
    console.log('🔐 Test 3: Testing authentication...');
    
    const authPayload = {
      jsonrpc: '2.0',
      method: 'call',
      params: {
        db: ODOO_DB,
        login: ODOO_USERNAME,
        password: ODOO_PASSWORD,
      },
      id: 1,
    };
    
    console.log('  Request payload:', JSON.stringify({
      ...authPayload,
      params: { ...authPayload.params, password: '***' }
    }, null, 2));
    
    const authResponse = await fetch(`${ODOO_URL}/web/session/authenticate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(authPayload),
    });

    console.log('  Response status:', authResponse.status);
    console.log('  Response headers:', Object.fromEntries(authResponse.headers.entries()));
    
    const authData = await authResponse.json();
    console.log('  Response body:', JSON.stringify(authData, null, 2));
    console.log('');

    if (authData.error) {
      console.log('❌ Authentication Error Details:');
      console.log('  Type:', authData.error.data?.name || 'Unknown');
      console.log('  Message:', authData.error.data?.message || authData.error.message);
      console.log('  Debug:', authData.error.data?.debug || 'No debug info');
      console.log('');
      
      console.log('💡 Troubleshooting Steps:');
      console.log('  1. If using API key:');
      console.log('     - Go to Odoo → Click your name → Preferences → Account Security');
      console.log('     - Delete old API key and create a new one');
      console.log('     - Copy the FULL key (usually 40+ characters)');
      console.log('  2. Try using your regular password instead:');
      console.log('     - Change ODOO_PASSWORD in .env to your login password');
      console.log('  3. Check if 2FA is enabled:');
      console.log('     - If yes, you MUST use an API key, not password');
      console.log('  4. Verify database name:');
      console.log('     - Check Settings → About in Odoo');
      console.log('     - Or check the URL: https://DBNAME.odoo.com');
      
    } else if (authData.result && authData.result.uid) {
      console.log('✅ AUTHENTICATION SUCCESSFUL!');
      console.log('  User ID:', authData.result.uid);
      console.log('  Username:', authData.result.username);
      console.log('  Session ID:', authData.result.session_id ? 'Present' : 'Not present');
      console.log('');
      console.log('🎉 Your Odoo connection is working correctly!');
    } else {
      console.log('⚠️  Unexpected response format');
      console.log('  Full response:', JSON.stringify(authData, null, 2));
    }

  } catch (error) {
    console.error('❌ Test failed with error:');
    console.error('  Message:', error.message);
    console.error('  Stack:', error.stack);
  }
}

diagnosticTest();