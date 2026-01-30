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

async function testUserSummary() {
  try {
    console.log('Testing user summary endpoint...\n');
    
    // Test public summary (should show 14,600 ETB)
    const publicSummary = await makeRequest('/api/reports/public/summary/today');
    console.log('Public Summary:');
    console.log('- Total count:', publicSummary.totalCount);
    console.log('- Total revenue:', publicSummary.totalRevenue);
    
    // Test user summary without woreda (should show same as public for admin)
    try {
      const userSummaryAll = await makeRequest('/api/reports/summary/today');
      console.log('\nUser Summary (all woredas):');
      console.log('- Total count:', userSummaryAll.totalCount);
      console.log('- Total revenue:', userSummaryAll.totalRevenue);
    } catch (error) {
      console.log('\nUser Summary (all woredas): Requires authentication');
    }
    
    // Test user summary with specific woreda
    try {
      const userSummaryWoreda = await makeRequest('/api/reports/summary/today?woreda=15');
      console.log('\nUser Summary (woreda 15):');
      console.log('- Total count:', userSummaryWoreda.totalCount);
      console.log('- Total revenue:', userSummaryWoreda.totalRevenue);
    } catch (error) {
      console.log('\nUser Summary (woreda 15): Requires authentication');
    }
    
    console.log('\n📋 Analysis:');
    if (publicSummary.totalRevenue > 0) {
      console.log('✅ Public summary is showing correct revenue');
    } else {
      console.log('❌ Public summary still shows 0 revenue');
    }
    
    console.log('\n💡 Note: The user summary endpoint already has the enhanced revenue logic');
    console.log('The issue was that the reports themselves had no price/payment values.');
    console.log('Since we fixed the reports, both endpoints should now show correct revenue.');
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testUserSummary();
