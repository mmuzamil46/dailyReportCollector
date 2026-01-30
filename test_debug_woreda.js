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

async function testDebugWoreda() {
  try {
    console.log('🔍 Testing woreda 15 with debug logging...\n');
    
    // Test woreda 15
    const result = await makeRequest('/api/reports/public/user-summary?woreda=15');
    console.log('Response:', result);
    
    // Check backend logs
    console.log('\n📋 Checking backend logs...');
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testDebugWoreda();
