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
          resolve(JSON.parse(responseData));
        } catch (e) {
          resolve(responseData);
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

async function testFixEndpoint() {
  try {
    console.log('Testing fix endpoint availability...\n');
    
    // Test the endpoint exists (should get auth error)
    const response = await makeRequest('/api/reports/fix-prices', 'POST', {});
    console.log('Fix endpoint response:', response);
    
    if (response.message && response.message.includes('token')) {
      console.log('✅ Fix endpoint exists and requires authentication (as expected)');
    }
    
    // Check current revenue before fix
    const summaryBefore = await makeRequest('/api/reports/public/summary/today');
    console.log('\nCurrent summary before fix:');
    console.log('- Total count:', summaryBefore.totalCount);
    console.log('- Total revenue:', summaryBefore.totalRevenue);
    
    console.log('\n📋 NEXT STEPS:');
    console.log('1. The fix endpoint is ready at POST /api/reports/fix-prices');
    console.log('2. You need to call this endpoint with admin authentication');
    console.log('3. This will update all existing reports with correct prices');
    console.log('4. After running the fix, total revenue should show correctly');
    
    console.log('\n💡 To run the fix, you can:');
    console.log('- Use the admin interface to call the endpoint');
    console.log('- Or use curl with admin token:');
    console.log('curl -X POST http://localhost:8080/api/reports/fix-prices \\');
    console.log('  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \\');
    console.log('  -H "Content-Type: application/json"');
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testFixEndpoint();
