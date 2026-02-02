import 'dotenv/config';  // Add this at the very top!
import { userStorage } from './src/services/userStorage.js';
import crypto from 'crypto';

async function test() {
  await userStorage.initialize();
  
  const password = 'Admin@123';
  const secret = process.env.JWT_SECRET;
  
  console.log('JWT_SECRET exists:', !!secret);
  console.log('JWT_SECRET value:', secret?.substring(0, 10) + '...');
  
  // Hash with current secret
  const currentHash = crypto
    .createHash('sha256')
    .update(password + secret)
    .digest('hex');
  
  console.log('Current hash:', currentHash);
  
  // Get stored hash from user
  const user = await userStorage.findByEmail('admin@kejamatch.com');
  console.log('Stored hash:', user.password);
  
  console.log('Hashes match:', currentHash === user.password);
}

test();