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

async function testCategoryCounting() {
  try {
    console.log('🔍 Testing Category-Based Aggregate Counting...\n');
    
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
        console.log('\n📋 Service Breakdown with Categories:');
        aggStatus.data.localStats.slice(0, 3).forEach(stat => {
          console.log(`\n🏢 ${stat.serviceName}:`);
          console.log(`   Total: ${stat.totalCount}`);
          
          if (stat.categories && Object.keys(stat.categories).length > 0) {
            console.log(`   Categories (${Object.keys(stat.categories).length}):`);
            Object.entries(stat.categories).forEach(([category, counts]) => {
              console.log(`     • ${category}: ${counts.totalCount} (back: ${counts.backReportCount || 0}, current: ${counts.currentReportCount || 0})`);
            });
          } else {
            console.log(`   • No categories found`);
          }
        });
      }
    }
    
    // Test 2: Check today's summary for comparison
    console.log('\n📅 2. Getting today\'s summary for comparison...');
    const todaySummary = await makeRequest('/api/reports/public/summary/today');
    
    if (todaySummary.status === 200) {
      console.log('✅ Today\'s Summary:');
      console.log(`   - Today\'s Reports: ${todaySummary.data.totalCount}`);
      console.log(`   - Today\'s Revenue: ${todaySummary.data.totalRevenue}`);
      
      // Compare with aggregate (if available)
      if (aggStatus.status === 200 && aggStatus.data.totalReports) {
        const diff = aggStatus.data.totalReports - todaySummary.data.totalCount;
        console.log(`   - Historical/Back Reports: ${diff}`);
        console.log(`   - Historical Percentage: ${((diff / aggStatus.data.totalReports) * 100).toFixed(1)}%`);
        
        if (diff > 0) {
          console.log('✅ Historical/Back data detected in aggregate counts!');
        } else {
          console.log('ℹ️  All reports are recent (no historical/back data)');
        }
      }
    }
    
    // Test 3: Check public reports to see category distribution
    console.log('\n📋 3. Checking public reports for category analysis...');
    const publicReports = await makeRequest('/api/reports/public/reports?limit=10');
    
    if (publicReports.status === 200) {
      console.log('✅ Sample Public Reports with Categories:');
      console.log('=====================================');
      
      publicReports.data.forEach((report, index) => {
        console.log(`\n📋 Report ${index + 1}:`);
        console.log(`   Service: ${report.serviceId?.name || 'N/A'}`);
        console.log(`   Category: ${report.serviceCategory || 'N/A'}`);
        console.log(`   Count: ${report.count || 1}`);
        console.log(`   Date: ${report.date ? new Date(report.date).toDateString() : 'N/A'}`);
      });
      
      // Analyze category distribution
      const categoryCounts = {};
      publicReports.data.forEach(report => {
        const category = report.serviceCategory || 'N/A';
        categoryCounts[category] = (categoryCounts[category] || 0) + (report.count || 1);
      });
      
      console.log('\n📊 Category Distribution in Sample:');
      Object.entries(categoryCounts).forEach(([category, count]) => {
        console.log(`   • ${category}: ${count} reports`);
      });
    }
    
    console.log('\n🎯 Category-Based Counting Analysis:');
    console.log('=====================================');
    console.log('✅ NEW IMPLEMENTATION:');
    console.log('   • Counts by service AND category');
    console.log('   • Sums category counts to get service total');
    console.log('   • Preserves category breakdown in Atlas');
    console.log('   • Handles back-reports (count > 1) properly');
    
    console.log('\n📋 Expected Behavior:');
    console.log('==================');
    console.log('• Each service: sum of all its categories');
    console.log('• Each category: sum of all reports in that category');
    console.log('• Atlas storage: includes category breakdown');
    console.log('• Accurate totals matching all-reports page');
    
    console.log('\n🔧 Manual Sync Verification:');
    console.log('============================');
    console.log('1. Go to: http://localhost:8081');
    console.log('2. Login as Admin/Staff');
    console.log('3. Navigate to Atlas Sync page');
    console.log('4. Click "Manual Aggregate Sync"');
    console.log('5. Check console for category breakdown');
    console.log('6. Verify totals match all-reports page');
    
  } catch (error) {
    console.error('❌ Error testing category counting:', error.message);
  }
}

testCategoryCounting();
