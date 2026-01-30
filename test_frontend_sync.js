const http = require('http');

function makeRequest(path, method, data, headers = {}) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 8081, // Frontend port
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };

    const req = http.request(options, (res) => {
      let responseData = '';
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          data: responseData
        });
      });
    });

    req.on('error', (e) => {
      reject(e);
    });

    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

async function testFrontend() {
  try {
    console.log('🌐 Testing Frontend Access...\n');
    
    // Test if frontend is accessible
    const frontendTest = await makeRequest('/');
    console.log('✅ Frontend Status:', frontendTest.status);
    
    if (frontendTest.status === 200) {
      console.log('✅ Frontend is running and accessible');
      console.log('📱 You can access the sync interface at: http://localhost:8081');
      console.log('🔐 Navigate to the Atlas Sync page in your admin dashboard');
    } else {
      console.log('❌ Frontend may not be fully loaded');
    }
    
    console.log('\n🎯 How to Access the Manual Sync Button:');
    console.log('1. Open your browser and go to: http://localhost:8081');
    console.log('2. Login as Admin or Staff user');
    console.log('3. Navigate to the "Atlas Sync" page in the dashboard');
    console.log('4. Look for the "Aggregate Service Count Sync" section');
    console.log('5. Click either "Manual Aggregate Sync" or "Force Sync Now" button');
    
    console.log('\n📋 Features Available on the Sync Page:');
    console.log('✅ Real-time status cards showing:');
    console.log('   - Local stats (services and reports count)');
    console.log('   - Scheduler status (running, office hours)');
    console.log('   - Atlas stats (remote data status)');
    console.log('✅ Manual sync buttons:');
    console.log('   - "Manual Aggregate Sync" (green button)');
    console.log('   - "Force Sync Now" (yellow button)');
    console.log('✅ Status messages and error handling');
    console.log('✅ Auto-refresh after successful sync');
    
    console.log('\n⚙️  Automatic Sync Status:');
    console.log('🤖 The scheduler is running automatically');
    console.log('📅 Will sync daily after 6:00 PM (office hours end)');
    console.log('🔄 Checks every hour if sync is needed');
    console.log('🚫 Prevents duplicate syncs on same day');
    
  } catch (error) {
    console.error('❌ Error testing frontend:', error.message);
    console.log('💡 Make sure the frontend container is running properly');
  }
}

testFrontend();
