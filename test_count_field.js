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

async function testCountField() {
  try {
    console.log('🔍 Checking for count field in reports...\n');
    
    // Get some recent reports to check structure
    const reportsResult = await makeRequest('/api/reports/public/reports?limit=5');
    
    if (reportsResult.status === 200) {
      console.log('✅ Sample reports structure:');
      console.log('=====================================');
      
      reportsResult.data.forEach((report, index) => {
        console.log(`\n📋 Report ${index + 1}:`);
        console.log(`   Service: ${report.serviceId?.name || 'N/A'}`);
        console.log(`   Date: ${report.date ? new Date(report.date).toDateString() : 'N/A'}`);
        console.log(`   Woreda: ${report.woreda || 'N/A'}`);
        console.log(`   Category: ${report.serviceCategory || 'N/A'}`);
        console.log(`   Fields: ${Object.keys(report).join(', ')}`);
        
        // Check for count field
        if (report.count !== undefined) {
          console.log(`   🎯 COUNT FIELD: ${report.count}`);
        } else {
          console.log(`   ❌ No count field found`);
        }
      });
      
      console.log('\n📊 Analysis:');
      const hasCountField = reportsResult.data.some(report => report.count !== undefined);
      
      if (hasCountField) {
        console.log('✅ Count field detected in some reports');
        const countReports = reportsResult.data.filter(report => report.count !== undefined);
        console.log(`📈 ${countReports.length} out of ${reportsResult.data.length} reports have count field`);
        
        countReports.forEach(report => {
          console.log(`   • ${report.serviceId?.name}: count = ${report.count}`);
        });
      } else {
        console.log('❌ No count field found in sample reports');
        console.log('💡 Reports may use count: 1 (implicit) or have a different structure');
      }
    } else {
      console.log('❌ Error fetching reports:', reportsResult.status);
    }
    
    console.log('\n🎯 Next Steps:');
    console.log('================');
    console.log('1. If count field exists: Update aggregate sync to sum count values');
    console.log('2. If no count field: Use document count (current implementation)');
    console.log('3. Need to check back-reports specifically for count field');
    
  } catch (error) {
    console.error('❌ Error testing count field:', error.message);
  }
}

testCountField();
