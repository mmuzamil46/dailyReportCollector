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

async function testAtlasCumulativeStats() {
  try {
    console.log('🔍 Checking Atlas cumulativestats collection...\n');
    
    // Test 1: Get Atlas stats to see current structure
    console.log('📊 1. Getting current Atlas stats...');
    const atlasResult = await makeRequest('/api/reports/sync/atlas-stats');
    
    if (atlasResult.status === 401) {
      console.log('❌ Authentication required - this is expected');
      console.log('💡 The Atlas stats require Admin/Staff authentication');
    } else if (atlasResult.status === 200) {
      console.log('✅ Atlas Stats Retrieved:');
      if (atlasResult.data.success && atlasResult.data.data) {
        console.log(`   - Total Atlas Services: ${atlasResult.data.data.length}`);
        
        atlasResult.data.data.slice(0, 5).forEach(stat => {
          console.log(`   • ${stat.serviceName}: ${stat.totalCount} (last updated: ${stat.lastUpdated || 'N/A'})`);
        });
      } else {
        console.log('   No data found in Atlas cumulativestats');
      }
    } else {
      console.log('❌ Error getting Atlas stats:', atlasResult.status);
    }
    
    // Test 2: Get current local aggregate status
    console.log('\n📋 2. Getting current local aggregate status...');
    const aggStatus = await makeRequest('/api/reports/sync/aggregate/status');
    
    if (aggStatus.status === 401) {
      console.log('❌ Authentication required - this is expected');
    } else if (aggStatus.status === 200) {
      console.log('✅ Local Aggregate Status:');
      console.log(`   - Total Services: ${aggStatus.data.totalServices}`);
      console.log(`   - Total Reports: ${aggStatus.data.totalReports}`);
      
      if (aggStatus.data.localStats && aggStatus.data.localStats.length > 0) {
        console.log('\n📋 Current Local Service Counts:');
        aggStatus.data.localStats.slice(0, 5).forEach(stat => {
          console.log(`   • ${stat.serviceName}: ${stat.totalCount}`);
        });
      }
    }
    
    // Test 3: Get today's reports to understand count field usage
    console.log('\n📅 3. Checking today\'s reports for count field usage...');
    const todayReports = await makeRequest('/api/reports/public/reports?limit=10');
    
    if (todayReports.status === 200) {
      console.log('✅ Sample Reports with Count Fields:');
      console.log('=====================================');
      
      let totalWithCount = 0;
      let totalWithoutCount = 0;
      let totalSum = 0;
      
      todayReports.data.forEach((report, index) => {
        const count = report.count || 1;
        totalSum += count;
        
        if (report.count && report.count > 1) {
          totalWithCount++;
          console.log(`📋 Report ${index + 1}: ${report.serviceId?.name} - Count: ${count} (back-report)`);
        } else {
          totalWithoutCount++;
          console.log(`📋 Report ${index + 1}: ${report.serviceId?.name} - Count: ${count} (individual)`);
        }
      });
      
      console.log('\n📊 Count Field Analysis:');
      console.log(`   • Reports with count > 1: ${totalWithCount}`);
      console.log(`   • Reports with count = 1: ${totalWithoutCount}`);
      console.log(`   • Total sum of counts: ${totalSum}`);
      console.log(`   • Average count: ${(totalSum / todayReports.data.length).toFixed(2)}`);
    }
    
    console.log('\n🎯 Simplified Aggregate Sync Requirements:');
    console.log('==========================================');
    console.log('✅ WHAT YOU WANT:');
    console.log('   • Count each service for THIS YEAR only');
    console.log('   • Sum the count field values (not document count)');
    console.log('   • Simple service: count mapping');
    console.log('   • Update existing Atlas cumulativestats collection');
    
    console.log('\n📋 Expected Structure:');
    console.log('====================');
    console.log('{');
    console.log('  "serviceName": "ልደት",');
    console.log('  "totalCount": 2000,');
    console.log('  "lastUpdated": "2026-01-30T11:17:00Z",');
    console.log('  "date": "2026-01-30"');
    console.log('}');
    
    console.log('\n🔧 Implementation Needed:');
    console.log('========================');
    console.log('1. Filter reports by THIS YEAR only');
    console.log('2. Group by serviceId');
    console.log('3. Sum count field values');
    console.log('4. Update Atlas cumulativestats (no schema change)');
    console.log('5. Keep it simple - no categories, no complex breakdown');
    
  } catch (error) {
    console.error('❌ Error testing Atlas cumulativestats:', error.message);
  }
}

testAtlasCumulativeStats();
