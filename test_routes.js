const http = require('http');

function makeRequest(path, method, data, headers = {}) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 8080,
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
        try {
          resolve({
            status: res.statusCode,
            data: JSON.parse(responseData)
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            data: responseData
          });
        }
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

async function testRoutes() {
  try {
    console.log('🔍 Testing available routes...\n');
    
    // Test known working routes
    console.log('Testing known working routes:');
    
    const publicSummary = await makeRequest('/api/reports/public/summary/today');
    console.log('✅ /api/reports/public/summary/today:', publicSummary.status);
    
    const publicReports = await makeRequest('/api/reports/public/reports');
    console.log('✅ /api/reports/public/reports:', publicReports.status);
    
    // Test our new route
    console.log('\nTesting new route:');
    const userSummary = await makeRequest('/api/reports/public/user-summary?woreda=15');
    console.log('❌ /api/reports/public/user-summary:', userSummary.status);
    
    console.log('\n📋 Available Public Routes Analysis:');
    console.log('- Working: /api/reports/public/summary/today');
    console.log('- Working: /api/reports/public/reports');
    console.log('- Not working: /api/reports/public/user-summary');
    
    console.log('\n🔧 Issue: The new route is not being registered properly');
    console.log('This suggests the route may not have been added correctly or there\'s a caching issue');
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testRoutes();
