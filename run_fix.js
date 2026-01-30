const http = require('http');

function makeRequest(path, method, data) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 8080,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json'
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

async function runPriceFix() {
  try {
    console.log('🔧 Running price fix for existing reports...\n');
    
    // Check current state before fix
    const beforeSummary = await makeRequest('/api/reports/public/summary/today');
    console.log('Before fix:');
    console.log('- Total reports:', beforeSummary.totalCount);
    console.log('- Total revenue:', beforeSummary.totalRevenue);
    
    // Run the fix
    console.log('\n🚀 Executing price fix...');
    const fixResult = await makeRequest('/api/reports/fix-prices-temp', 'POST', {});
    console.log('Fix result:', fixResult);
    
    // Check state after fix
    console.log('\n⏳ Waiting 2 seconds for data to settle...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const afterSummary = await makeRequest('/api/reports/public/summary/today');
    console.log('\nAfter fix:');
    console.log('- Total reports:', afterSummary.totalCount);
    console.log('- Total revenue:', afterSummary.totalRevenue);
    
    if (afterSummary.totalRevenue > 0) {
      console.log('\n✅ SUCCESS! Total revenue is now showing correctly!');
      console.log('💰 Revenue increased from', beforeSummary.totalRevenue, 'to', afterSummary.totalRevenue, 'ETB');
    } else {
      console.log('\n❌ Revenue is still 0. There may be an issue.');
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

runPriceFix();
