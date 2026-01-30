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

async function testDirect() {
  try {
    console.log('Testing endpoints directly...\n');
    
    // Test public summary
    const publicResult = await makeRequest('/api/reports/public/summary/today');
    console.log('Public endpoint:', publicResult.status, publicResult.data);
    
    // Test standalone user summary
    const userResult = await makeRequest('/api/reports/test-user-summary?woreda=15');
    console.log('User endpoint:', userResult.status, userResult.data);
    
    // Test without woreda
    const userAllResult = await makeRequest('/api/reports/test-user-summary');
    console.log('User all endpoint:', userAllResult.status, userAllResult.data);
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testDirect();
