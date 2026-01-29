import dotenv from 'dotenv';
import fetch from 'node-fetch';
import readline from 'readline';

dotenv.config();

const ODOO_URL = process.env.ODOO_URL;
const ODOO_DB = process.env.ODOO_DB;
const ODOO_USERNAME = process.env.ODOO_USERNAME;

console.log('🔍 Odoo Authentication Method Tester\n');
console.log('This will help us find the right way to authenticate.\n');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function testAuthentication(password) {
  try {
    const authResponse = await fetch(`${ODOO_URL}/web/session/authenticate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'call',
        params: {
          db: ODOO_DB,
          login: ODOO_USERNAME,
          password: password,
        },
      }),
    });

    const authData = await authResponse.json();
    
    if (authData.error) {
      return { success: false, error: authData.error.data.message };
    }

    if (authData.result && authData.result.uid) {
      return { 
        success: true, 
        uid: authData.result.uid,
        username: authData.result.username 
      };
    }

    return { success: false, error: 'Unknown error' };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function main() {
  console.log('Configuration:');
  console.log('  URL:', ODOO_URL);
  console.log('  Database:', ODOO_DB);
  console.log('  Username:', ODOO_USERNAME);
  console.log('\n');

  // Test 1: Try with .env password
  console.log('📝 Test 1: Using password from .env file...');
  const envPassword = process.env.ODOO_PASSWORD;
  if (envPassword) {
    const result1 = await testAuthentication(envPassword);
    if (result1.success) {
      console.log('✅ SUCCESS with .env password!');
      console.log('   User ID:', result1.uid);
      console.log('\n✨ Your .env file is configured correctly!\n');
      rl.close();
      return;
    } else {
      console.log('❌ Failed:', result1.error);
    }
  } else {
    console.log('⚠️  No password in .env file');
  }
  console.log('');

  // Test 2: Ask for manual password entry
  console.log('📝 Test 2: Let\'s try with your actual login password');
  console.log('(The password you use to log into Odoo website)\n');
  
  const manualPassword = await question('Enter your Odoo login password: ');
  
  if (manualPassword) {
    console.log('\nTesting with manual password...');
    const result2 = await testAuthentication(manualPassword);
    if (result2.success) {
      console.log('✅ SUCCESS with login password!');
      console.log('   User ID:', result2.uid);
      console.log('\n💡 Action Required:');
      console.log('   Update your .env file to use your login password:');
      console.log('   ODOO_PASSWORD=' + manualPassword);
      console.log('\n⚠️  Note: If you have 2FA enabled, you\'ll need to disable it');
      console.log('   or use the API key method (which we\'re still troubleshooting).\n');
    } else {
      console.log('❌ Failed:', result2.error);
      console.log('\n🤔 Possible issues:');
      console.log('   1. Two-Factor Authentication (2FA) might be enabled');
      console.log('   2. Password might be incorrect');
      console.log('   3. Account might have additional security restrictions');
      console.log('\n💡 Next steps:');
      console.log('   1. Check if 2FA is enabled: Odoo → Preferences → Security');
      console.log('   2. If 2FA is enabled, you MUST use API keys (we need to fix that)');
      console.log('   3. Try resetting your password if you\'re unsure');
    }
  }
  
  console.log('');
  rl.close();
}

main();