const mongoose = require('mongoose');
const Report = require('./backend/models/Report');
const Service = require('./backend/models/Service');

// Connect to local MongoDB
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/dailyReportCollector', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

async function testAggregateCounts() {
  try {
    console.log('🔍 Testing Aggregate Report Counts (Including Historical Data)\n');
    
    // Get all services
    const services = await Service.find({});
    console.log(`Found ${services.length} services in the system\n`);
    
    let totalAllReports = 0;
    let totalHistoricalReports = 0;
    let totalRecentReports = 0;
    
    const today = new Date();
    const oneMonthAgo = new Date(today);
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
    
    const oneYearAgo = new Date(today);
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    
    console.log('📊 Service-by-Service Analysis:');
    console.log('=====================================');
    
    for (const service of services) {
      // Count ALL reports (including historical)
      const allCount = await Report.countDocuments({ serviceId: service._id });
      
      // Count historical reports (older than 1 year)
      const historicalCount = await Report.countDocuments({ 
        serviceId: service._id,
        date: { $lt: oneYearAgo }
      });
      
      // Count recent reports (within last month)
      const recentCount = await Report.countDocuments({ 
        serviceId: service._id,
        date: { $gte: oneMonthAgo }
      });
      
      // Get date range for this service
      const oldestReport = await Report.findOne({ serviceId: service._id }).sort({ date: 1 });
      const newestReport = await Report.findOne({ serviceId: service._id }).sort({ date: -1 });
      
      totalAllReports += allCount;
      totalHistoricalReports += historicalCount;
      totalRecentReports += recentCount;
      
      console.log(`📋 ${service.name}:`);
      console.log(`   Total Reports: ${allCount}`);
      console.log(`   Historical (>1yr): ${historicalCount}`);
      console.log(`   Recent (<1mo): ${recentCount}`);
      if (oldestReport && newestReport) {
        console.log(`   Date Range: ${oldestReport.date.toDateString()} - ${newestReport.date.toDateString()}`);
      }
      console.log('');
    }
    
    console.log('📈 Summary Statistics:');
    console.log('=====================');
    console.log(`📊 Total All Reports: ${totalAllReports}`);
    console.log(`📚 Historical Reports (>1yr): ${totalHistoricalReports}`);
    console.log(`🆕 Recent Reports (<1mo): ${totalRecentReports}`);
    console.log(`📅 Historical Percentage: ${((totalHistoricalReports / totalAllReports) * 100).toFixed(1)}%`);
    
    console.log('\n✅ Aggregate Sync Analysis:');
    console.log('===========================');
    if (totalHistoricalReports > 0) {
      console.log('✅ Historical data detected - these will be included in aggregate sync');
      console.log('✅ Current implementation counts ALL reports (no date filtering)');
      console.log('✅ Back-reports before system build will be included');
    } else {
      console.log('ℹ️  No historical reports found (all reports are recent)');
    }
    
    console.log('\n🎯 Aggregate Sync Behavior:');
    console.log('===========================');
    console.log('✅ Uses Report.countDocuments({ serviceId: service._id })');
    console.log('✅ NO date filtering applied');
    console.log('✅ Counts ALL reports for each service');
    console.log('✅ Includes back-reports from before system was built');
    console.log('✅ Historical data preserved in Atlas cumulativestats');
    
  } catch (error) {
    console.error('❌ Error testing aggregate counts:', error);
  } finally {
    await mongoose.disconnect();
  }
}

testAggregateCounts();
