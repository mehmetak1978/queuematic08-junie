/**
 * Password Hash Test
 * Tests bcrypt password verification with stored hash
 */

import bcrypt from 'bcryptjs';

async function testPasswordHash() {
  const storedHash = '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj6ukx/2.K5W';
  const password = 'password123';
  
  console.log('Testing bcrypt password verification:');
  console.log('====================================');
  console.log('Password:', password);
  console.log('Stored hash:', storedHash);
  console.log('');
  
  try {
    const isValid = await bcrypt.compare(password, storedHash);
    console.log('bcrypt.compare result:', isValid);
    
    if (isValid) {
      console.log('✅ Password verification SUCCESSFUL');
    } else {
      console.log('❌ Password verification FAILED');
      
      // Let's also test generating a new hash for comparison
      console.log('');
      console.log('Generating new hash for comparison:');
      const newHash = await bcrypt.hash(password, 12);
      console.log('New hash:', newHash);
      
      const newHashValid = await bcrypt.compare(password, newHash);
      console.log('New hash verification:', newHashValid);
    }
  } catch (error) {
    console.error('Error during password verification:', error);
  }
}

testPasswordHash();