const Report = require('../models/Report');
const Service = require('../models/Service');
const { connectToAtlas } = require('../utils/atlasConnection');
const { toEthiopian } = require('ethiopian-date');

class AggregateSyncService {
  constructor() {
    this.isSyncing = false;
    this.lastSyncTime = null;
  }

  /**
   * Get current Ethiopian year
   */
  getCurrentEthiopianYear() {
    const today = new Date();
    const ethiopianDate = toEthiopian(today.getFullYear(), today.getMonth() + 1, today.getDate());
    return ethiopianDate[0]; // Returns year
  }

  /**
   * Calculate aggregate service counts from local database (THIS YEAR ONLY)
   */
  async calculateAggregateStats() {
    try {
      console.log('Calculating THIS YEAR aggregate service stats...');
      
      // Get current Ethiopian year
      const currentEthiopianYear = this.getCurrentEthiopianYear();
      console.log(`📅 Current Ethiopian Year: ${currentEthiopianYear}`);
      
      // Calculate Ethiopian New Year dates in Gregorian
      // Sept 11 (or 12 in leap years) is usually the start
      // For simplicity, we use Sept 1 to Oct 1 window for year boundaries
      const startYear = currentEthiopianYear;
      const startDate = new Date(startYear + 7, 8, 1); // rough Sept 1 start
      const endDate = new Date(startYear + 8, 8, 30);  // rough Sept 30 end of next year
      
      console.log(`🔍 Date Range: ${startDate.toDateString()} to ${endDate.toDateString()}`);

      // Get all services
      const services = await Service.find({});
      
      // Calculate counts for each service for THIS YEAR only
      const aggregateStats = [];
      let totalAllReports = 0;
      
      for (const service of services) {
        // Get all reports for this service from THIS YEAR
        const reports = await Report.find({ 
          serviceId: service._id,
          date: {
            $gte: startDate,
            $lte: endDate
          }
        });
        
        // Sum the count field values (summing back-reports)
        let serviceTotalCount = 0;
        let backReportCount = 0;
        let currentReportCount = 0;
        
        reports.forEach(report => {
          const count = report.count || 1;
          serviceTotalCount += count;
          
          if (count > 1) {
            backReportCount += count;
          } else {
            currentReportCount += count;
          }
        });
        
        totalAllReports += serviceTotalCount;
        
        aggregateStats.push({
          serviceName: service.name,
          totalCount: serviceTotalCount,
          backReportCount: backReportCount,
          currentReportCount: currentReportCount,
          totalReports: reports.length,
          date: new Date(),
          lastUpdated: new Date()
        });
      }
      
      // Calculate totals for back-reports vs current reports
      const totalBackReportCount = aggregateStats.reduce((sum, stat) => sum + (stat.backReportCount || 0), 0);
      const totalCurrentReportCount = aggregateStats.reduce((sum, stat) => sum + (stat.currentReportCount || 0), 0);
      
      console.log(`✅ Calculated stats for ${aggregateStats.length} services (THIS YEAR ONLY)`);
      console.log(` Total reports this year: ${totalAllReports}`);
      console.log(`🔄 Back-reports (count > 1): ${totalBackReportCount}`);
      console.log(`🆕 Current reports (count = 1): ${totalCurrentReportCount}`);
      
      // Show service breakdown
      console.log('\n📋 Service Breakdown:');
      console.log('====================');
      aggregateStats.forEach(service => {
        console.log(`🏢 ${service.serviceName}: ${service.totalCount} reports`);
      });
      
      return aggregateStats;
    } catch (error) {
      console.error('Error calculating aggregate stats:', error);
      throw error;
    }
  }

  /**
   * Sync aggregate stats to MongoDB Atlas
   */
  async syncToAtlas(stats) {
    try {
      console.log('Connecting to MongoDB Atlas...');
      const atlasConnection = await connectToAtlas();
      
      if (!atlasConnection) {
        throw new Error('Failed to connect to MongoDB Atlas');
      }

      // Get CumulativeStats model for Atlas
      const CumulativeStats = atlasConnection.model('CumulativeStats', require('../models/CumulativeStats').schema);
      
      console.log(`Syncing ${stats.length} service stats to Atlas...`);
      
      // Update or create each stat with simple structure
      for (const stat of stats) {
        await CumulativeStats.findOneAndUpdate(
          { serviceName: stat.serviceName },
          {
            $set: {
              totalCount: stat.totalCount,
              lastUpdated: stat.lastUpdated,
              date: stat.date
            }
          },
          { upsert: true, new: true }
        );
      }
      
      console.log('Successfully synced stats to Atlas');
      return true;
    } catch (error) {
      console.error('Error syncing to Atlas:', error);
      throw error;
    }
  }

  /**
   * Perform complete sync process
   */
  async performSync() {
    if (this.isSyncing) {
      console.log('Sync already in progress...');
      return { success: false, message: 'Sync already in progress' };
    }

    this.isSyncing = true;
    this.lastSyncTime = new Date();

    try {
      console.log('Starting aggregate service count sync...');
      
      // Calculate stats from local DB
      const stats = await this.calculateAggregateStats();
      
      // Sync to Atlas
      await this.syncToAtlas(stats);
      
      this.isSyncing = false;
      
      // Calculate simple summary
      const totalReports = stats.reduce((sum, stat) => sum + stat.totalCount, 0);
      const totalBackReports = stats.reduce((sum, stat) => sum + (stat.backReportCount || 0), 0);
      const totalCurrentReports = stats.reduce((sum, stat) => sum + (stat.currentReportCount || 0), 0);

      return {
        success: true,
        message: 'Sync completed successfully',
        stats: stats,
        syncTime: this.lastSyncTime,
        summary: {
          totalServices: stats.length,
          totalReports: totalReports,
          backReports: totalBackReports,
          currentReports: totalCurrentReports,
          year: this.getCurrentEthiopianYear()
        }
      };
    } catch (error) {
      this.isSyncing = false;
      console.error('Sync failed:', error);
      return {
        success: false,
        message: error.message,
        syncTime: this.lastSyncTime
      };
    }
  }

  /**
   * Get current sync status
   */
  getSyncStatus() {
    return {
      isSyncing: this.isSyncing,
      lastSyncTime: this.lastSyncTime
    };
  }

  /**
   * Get current local stats (without syncing)
   */
  async getCurrentLocalStats() {
    try {
      return await this.calculateAggregateStats();
    } catch (error) {
      console.error('Error getting local stats:', error);
      throw error;
    }
  }
}

// Create singleton instance
const aggregateSyncService = new AggregateSyncService();

module.exports = aggregateSyncService;
