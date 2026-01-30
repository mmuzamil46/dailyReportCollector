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

async function testSimpleAggregate() {
  try {
    console.log('🔍 Testing Simplified Aggregate Sync (THIS YEAR ONLY)\n');
    
    // Test 1: Get current aggregate status
    console.log('📊 1. Getting current aggregate status...');
    const aggStatus = await makeRequest('/api/reports/sync/aggregate/status');
    
    if (aggStatus.status === 401) {
      console.log('❌ Authentication required - this is expected');
      console.log('💡 The aggregate sync requires Admin/Staff authentication');
    } else if (aggStatus.status === 200) {
      console.log('✅ Aggregate Status Retrieved:');
      console.log(`   - Total Services: ${aggStatus.data.totalServices}`);
      console.log(`   - Total Reports: ${aggStatus.data.totalReports}`);
      console.log(`   - Last Sync: ${aggStatus.data.syncStatus?.lastSyncTime || 'Never'}`);
      
      if (aggStatus.data.localStats && aggStatus.data.localStats.length > 0) {
        console.log('\n📋 Current Service Counts (This Year):');
        aggStatus.data.localStats.forEach(stat => {
          console.log(`   • ${stat.serviceName}: ${stat.totalCount} reports`);
        });
      }
    }
    
    // Test 2: Get today's summary for comparison
    console.log('\n📅 2. Getting today\'s summary for comparison...');
    const todaySummary = await makeRequest('/api/reports/public/summary/today');
    
    if (todaySummary.status === 200) {
      console.log('✅ Today\'s Summary:');
      console.log(`   - Today\'s Reports: ${todaySummary.data.totalCount}`);
      console.log(`   - Today\'s Revenue: ${todaySummary.data.totalRevenue}`);
      
      // Compare with aggregate (if available)
      if (aggStatus.status === 200 && aggStatus.data.totalReports) {
        const diff = aggStatus.data.totalReports - todaySummary.data.totalCount;
        console.log(`   - Year-to-Date Total: ${aggStatus.data.totalReports}`);
        console.log(`   - Today\'s Share: ${((todaySummary.data.totalCount / aggStatus.data.totalReports) * 100).toFixed(1)}%`);
      }
    }
    
    // Test 3: Check Atlas stats
    console.log('\n🌐 3. Checking Atlas stats...');
    const atlasResult = await makeRequest('/api/reports/sync/atlas-stats');
    
    if (atlasResult.status === 401) {
      console.log('❌ Authentication required for Atlas stats');
    } else if (atlasResult.status === 200) {
      console.log('✅ Atlas Stats Retrieved:');
      if (atlasResult.data.success && atlasResult.data.data) {
        console.log(`   - Atlas Services: ${atlasResult.data.data.length}`);
        
        atlasResult.data.data.slice(0, 5).forEach(stat => {
          console.log(`   • ${stat.serviceName}: ${stat.totalCount} (updated: ${stat.lastUpdated || 'N/A'})`);
        });
      } else {
        console.log('   No data found in Atlas cumulativestats');
      }
    }
    
    console.log('\n🎯 Simplified Aggregate Sync Summary:');
    console.log('=====================================');
    console.log('✅ WHAT WE IMPLEMENTED:');
    console.log('   • Count each service for THIS YEAR only');
    console.log('   • Sum the count field values (not document count)');
    console.log('   • Simple service: count mapping');
    console.log('   • Update existing Atlas cumulativestats collection');
    console.log('   • No schema changes - keep it simple');
    
    console.log('\n📋 Expected Atlas Structure:');
    console.log('============================');
    console.log('{');
    console.log('  "serviceName": "ልደት",');
    console.log('  "totalCount": 2000,');
    console.log('  "lastUpdated": "2026-01-30T11:17:00Z",');
    console.log('  "date": "2026-01-30"');
    console.log('}');
    
    console.log('\n🔧 Manual Sync Test:');
    console.log('==================');
    console.log('1. Go to: http://localhost:8081');
    console.log('2. Login as Admin/Staff');
    console.log('3. Navigate to Atlas Sync page');
    console.log('4. Click "Manual Aggregate Sync"');
    console.log('5. Check console for service breakdown');
    console.log('6. Verify Atlas cumulativestats updated');
    
    console.log('\n📊 Expected Console Output:');
    console.log('==========================');
    console.log('📅 Current Ethiopian Year: 2018');
    console.log('✅ Calculated stats for 8 services (THIS YEAR ONLY)');
    console.log('📊 Total reports this year: 15,432');
    console.log('🔄 Back-reports (count > 1): 2,567');
    console.log('🆕 Current reports (count = 1): 12,865');
    console.log('');
    console.log('📋 Service Breakdown:');
    console.log('====================');
    console.log('🏢 ልደት: 2,000 reports');
    console.log('🏢 መታወቂያ: 3,500 reports');
    console.log('🏢 ልደት: 1,800 reports');
    console.log('🏢 ሞት: 1,200 reports');
    console.log('🏢 ጋብቻ: 950 reports');
    console.log('🏢 ፍቺ: 450 reports');
    console.log('🏢 መሸኛ: 3,200 reports');
    console.log('🏢 ያላገባ: 2,332 reports');
    
  } catch (error) {
    console.error('❌ Error testing simple aggregate:', error.message);
  }
}

testSimpleAggregate();
