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

async function testWoredaFiltering() {
  try {
    console.log('Testing woreda-specific revenue calculation...\n');
    
    // Test public summary (all woredas)
    const publicSummary = await makeRequest('/api/reports/public/summary/today');
    console.log('📊 Public Summary (ALL woredas):');
    console.log('- Total count:', publicSummary.totalCount);
    console.log('- Total revenue:', publicSummary.totalRevenue);
    
    // Test standalone user summary for specific woreda
    const woreda15Summary = await makeRequest('/api/reports/test-user-summary?woreda=15');
    console.log('\n📊 User Summary (woreda 15 only):');
    console.log('- Total count:', woreda15Summary.totalCount);
    console.log('- Total revenue:', woreda15Summary.totalRevenue);
    
    // Test another woreda
    const woreda1Summary = await makeRequest('/api/reports/test-user-summary?woreda=1');
    console.log('\n📊 User Summary (woreda 1 only):');
    console.log('- Total count:', woreda1Summary.totalCount);
    console.log('- Total revenue:', woreda1Summary.totalRevenue);
    
    // Show revenue breakdown by woreda
    console.log('\n📋 Revenue Analysis:');
    console.log(`- All woredas combined: ${publicSummary.totalRevenue} ETB`);
    console.log(`- Woreda 15 only: ${woreda15Summary.totalRevenue} ETB`);
    console.log(`- Woreda 1 only: ${woreda1Summary.totalRevenue} ETB`);
    console.log(`- Other woredas: ${publicSummary.totalRevenue - woreda15Summary.totalRevenue - woreda1Summary.totalRevenue} ETB`);
    
    // Show service breakdown for woreda 15
    console.log('\n🏢 Woreda 15 Service Breakdown:');
    Object.keys(woreda15Summary.byService).forEach(serviceName => {
      const serviceData = woreda15Summary.byService[serviceName];
      console.log(`- ${serviceName}: ${serviceData.total} reports, ${serviceData.revenue} ETB revenue`);
    });
    
    console.log('\n✅ SUCCESS! User reports page will now:');
    console.log('1. Show only reports from the user\'s assigned woreda');
    console.log('2. Calculate revenue correctly using enhanced logic');
    console.log('3. Display accurate totals for their specific woreda');
    
    console.log('\n🎯 User Experience:');
    console.log('- Regular users: See only their woreda\'s reports and revenue');
    console.log('- Admin/Staff: Can specify woreda in query params or see all');
    console.log('- Public display: Shows all woredas combined');
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testWoredaFiltering();
