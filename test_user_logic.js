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

async function testUserLogic() {
  try {
    console.log('Testing user summary logic vs public summary...\n');
    
    // Test public summary
    const publicSummary = await makeRequest('/api/reports/public/summary/today');
    console.log('📊 Public Summary:');
    console.log('- Total count:', publicSummary.totalCount);
    console.log('- Total revenue:', publicSummary.totalRevenue);
    
    // Test user summary logic (public version of user endpoint)
    const userLogicSummary = await makeRequest('/api/reports/test-user-summary');
    console.log('\n📊 User Summary Logic (same logic as user reports page):');
    console.log('- Total count:', userLogicSummary.totalCount);
    console.log('- Total revenue:', userLogicSummary.totalRevenue);
    
    // Compare results
    console.log('\n🔍 Comparison:');
    if (publicSummary.totalCount === userLogicSummary.totalCount) {
      console.log('✅ Total counts match');
    } else {
      console.log('❌ Total counts differ');
    }
    
    if (publicSummary.totalRevenue === userLogicSummary.totalRevenue) {
      console.log('✅ Total revenues match');
    } else {
      console.log('❌ Total revenues differ');
      console.log('- Public:', publicSummary.totalRevenue);
      console.log('- User Logic:', userLogicSummary.totalRevenue);
    }
    
    console.log('\n📋 Service-by-service comparison:');
    const publicServices = Object.keys(publicSummary.byService);
    const userServices = Object.keys(userLogicSummary.byService);
    
    console.log('Public services:', publicServices.length);
    console.log('User services:', userServices.length);
    
    // Show service revenue comparison
    publicServices.forEach(serviceName => {
      const publicRev = publicSummary.byService[serviceName]?.revenue || 0;
      const userRev = userLogicSummary.byService[serviceName]?.revenue || 0;
      
      if (publicRev !== userRev) {
        console.log(`❌ ${serviceName}: Public=${publicRev}, User=${userRev}`);
      } else if (publicRev > 0) {
        console.log(`✅ ${serviceName}: ${publicRev} ETB`);
      }
    });
    
    console.log('\n🎯 Conclusion:');
    if (publicSummary.totalRevenue === userLogicSummary.totalRevenue && publicSummary.totalRevenue > 0) {
      console.log('✅ SUCCESS! User reports page will show the same correct revenue as public display');
    } else {
      console.log('❌ There may still be an issue with the user reports page logic');
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testUserLogic();
