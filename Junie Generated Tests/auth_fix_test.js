/**
 * Test script to verify the authentication fix
 * Tests the login functionality with the corrected response format handling
 */

import axios from 'axios';

const API_BASE_URL = 'http://localhost:3008/api';

// Test data - using a known test user from the database
const testCredentials = {
  username: 'admin',
  password: 'password123'
};

async function testLogin() {
  console.log('🧪 Testing login functionality...');
  
  try {
    // Test the backend API directly
    console.log('📡 Testing backend API response format...');
    const response = await axios.post(`${API_BASE_URL}/auth/login`, testCredentials);
    
    console.log('✅ Backend response received:');
    console.log('Response structure:', {
      success: response.data.success,
      hasData: !!response.data.data,
      hasUser: !!(response.data.data && response.data.data.user),
      hasToken: !!(response.data.data && response.data.data.token)
    });
    
    if (response.data.data && response.data.data.user && response.data.data.token) {
      console.log('✅ Backend returns correct format: response.data.user and response.data.token');
      console.log('User data:', response.data.data.user);
      console.log('Token present:', !!response.data.data.token);
    } else {
      console.log('❌ Backend response format is incorrect');
    }
    
  } catch (error) {
    if (error.response) {
      console.log('❌ Backend error:', error.response.data.message);
      console.log('Status:', error.response.status);
    } else {
      console.log('❌ Network error:', error.message);
      console.log('Make sure the backend server is running on port 3008');
    }
  }
}

async function testDatabaseConnection() {
  console.log('🔍 Testing database connection...');
  
  try {
    const response = await axios.get(`${API_BASE_URL}/health`);
    console.log('✅ Database connection test:', response.data);
  } catch (error) {
    console.log('❌ Database connection failed:', error.message);
  }
}

// Run tests
async function runTests() {
  console.log('🚀 Starting authentication fix tests...\n');
  
  await testDatabaseConnection();
  console.log('');
  await testLogin();
  
  console.log('\n✨ Test completed!');
}

runTests().catch(console.error);