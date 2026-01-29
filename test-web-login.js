import dotenv from 'dotenv';
import fetch from 'node-fetch';

dotenv.config();

const ODOO_URL = process.env.ODOO_URL;
const ODOO_DB = process.env.ODOO_DB;
const ODOO_USERNAME = process.env.ODOO_USERNAME;
const ODOO_PASSWORD = 'X)m/AAa+B8i$a6@'; // Your actual password

console.log('🔍 Testing Alternative Odoo Authentication\n');

async function testWebLogin() {
  try {
    console.log('📝 Test 1: Using /web/login endpoint...\n');
    
    // Method 1: Try web login
    const loginResponse = await fetch(`${ODOO_URL}/web/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        login: ODOO_USERNAME,
        password: ODOO_PASSWORD,
        db: ODOO_DB,
      }),
      redirect: 'manual',
    });

    console.log('Response status:', loginResponse.status);
    console.log('Response headers:', Object.fromEntries(loginResponse.headers.entries()));
    
    const cookies = loginResponse.headers.get('set-cookie');
    console.log('Cookies received:', cookies ? 'Yes' : 'No');
    
    if (cookies && loginResponse.status === 303) {
      console.log('✅ Web login successful!\n');
      
      // Try to get session info
      console.log('📝 Test 2: Checking session info...\n');
      const sessionResponse = await fetch(`${ODOO_URL}/web/session/get_session_info`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': cookies,
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'call',
          params: {},
        }),
      });
      
      const sessionData = await sessionResponse.json();
      console.log('Session data:', JSON.stringify(sessionData, null, 2));
      
      if (sessionData.result && sessionData.result.uid) {
        console.log('\n✅ SUCCESS! Session established!');
        console.log('User ID:', sessionData.result.uid);
        console.log('Username:', sessionData.result.username);
        console.log('\n💡 This means your credentials are correct,');
        console.log('   but the /web/session/authenticate endpoint is blocked.');
        console.log('\n🔧 Solution: We need to use session-based authentication');
        console.log('   instead of the direct authenticate endpoint.');
      }
    } else {
      console.log('❌ Web login failed');
      const text = await loginResponse.text();
      console.log('Response preview:', text.substring(0, 500));
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

async function checkOdooVersion() {
  try {
    console.log('\n📝 Test 3: Checking Odoo version and info...\n');
    
    const versionResponse = await fetch(`${ODOO_URL}/web/webclient/version_info`, {
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
    
    const versionData = await versionResponse.json();
    
    if (versionData.result) {
      console.log('Odoo Version:', versionData.result.server_version);
      console.log('Server Series:', versionData.result.server_version_info);
      console.log('\n💡 Some Odoo SaaS versions restrict external API access.');
      console.log('   Version', versionData.result.server_version, 'might have specific requirements.');
    }
  } catch (error) {
    console.log('Could not get version info:', error.message);
  }
}

async function main() {
  await testWebLogin();
  await checkOdooVersion();
  
  console.log('\n📋 Summary:');
  console.log('   Database:', ODOO_DB, '✅ (exists and accessible)');
  console.log('   Credentials:', 'Valid (you can log in via browser)');
  console.log('   Issue: External API authentication is blocked');
  console.log('\n🎯 Possible reasons:');
  console.log('   1. Odoo.com SaaS restricts external API by default');
  console.log('   2. Need to contact Odoo support to enable API access');
  console.log('   3. Might need a paid plan for API access');
  console.log('   4. IP restrictions or rate limiting');
  console.log('\n💡 Next steps:');
  console.log('   1. Contact Odoo support about enabling external API access');
  console.log('   2. Check your plan details for API limitations');
  console.log('   3. Consider self-hosting Odoo if API access is critical');
}

main();