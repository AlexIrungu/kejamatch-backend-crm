import dotenv from 'dotenv';
import fetch from 'node-fetch';

dotenv.config();

const ODOO_URL = process.env.ODOO_URL;
const ODOO_DB = process.env.ODOO_DB;
const ODOO_USERNAME = process.env.ODOO_USERNAME;
const ODOO_PASSWORD = process.env.ODOO_PASSWORD;

console.log('🔍 Testing Odoo Connection...\n');

// Check if all environment variables are set
console.log('📋 Configuration Check:');
console.log('  ODOO_URL:', ODOO_URL || '❌ NOT SET');
console.log('  ODOO_DB:', ODOO_DB || '❌ NOT SET');
console.log('  ODOO_USERNAME:', ODOO_USERNAME || '❌ NOT SET');
console.log('  ODOO_PASSWORD:', ODOO_PASSWORD ? '✅ SET (length: ' + ODOO_PASSWORD.length + ')' : '❌ NOT SET');
console.log('');

if (!ODOO_URL || !ODOO_DB || !ODOO_USERNAME || !ODOO_PASSWORD) {
  console.error('❌ Missing required environment variables!');
  process.exit(1);
}

async function testOdooConnection() {
  try {
    console.log('🔐 Attempting to authenticate...');
    
    const authResponse = await fetch(`${ODOO_URL}/web/session/authenticate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        params: {
          db: ODOO_DB,
          login: ODOO_USERNAME,
          password: ODOO_PASSWORD,
        },
      }),
    });

    const authData = await authResponse.json();
    
    if (authData.error) {
      console.error('❌ Authentication failed!');
      console.error('Error:', authData.error.data.message || authData.error.message);
      return false;
    }

    if (authData.result && authData.result.uid) {
      console.log('✅ Authentication successful!');
      console.log('   User ID:', authData.result.uid);
      console.log('   Username:', authData.result.username);
      console.log('   Company:', authData.result.company_id ? authData.result.company_id[1] : 'N/A');
      console.log('');

      // Test fetching CRM data
      console.log('📊 Testing CRM access...');
      
      const crmResponse = await fetch(`${ODOO_URL}/web/dataset/call_kw`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': authResponse.headers.get('set-cookie') || '',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'call',
          params: {
            model: 'crm.lead',
            method: 'search_read',
            args: [[], ['name', 'email_from', 'create_date']],
            kwargs: {
              limit: 5,
            },
          },
        }),
      });

      const crmData = await crmResponse.json();
      
      if (crmData.error) {
        console.error('⚠️  CRM access test failed:');
        console.error('   Error:', crmData.error.data.message || crmData.error.message);
      } else if (crmData.result) {
        console.log('✅ CRM access successful!');
        console.log('   Found', crmData.result.length, 'lead(s)');
        if (crmData.result.length > 0) {
          console.log('   Latest lead:', crmData.result[0].name);
        }
      }
      
      console.log('');
      console.log('🎉 Connection test completed successfully!');
      console.log('   You can now integrate Odoo with your application.');
      return true;
      
    } else {
      console.error('❌ Authentication failed - no user ID returned');
      console.log('Response:', JSON.stringify(authData, null, 2));
      return false;
    }
    
  } catch (error) {
    console.error('❌ Connection test failed!');
    console.error('Error:', error.message);
    if (error.cause) {
      console.error('Cause:', error.cause);
    }
    return false;
  }
}

// Run the test
testOdooConnection()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Unexpected error:', error);
    process.exit(1);
  });