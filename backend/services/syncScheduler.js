const aggregateSyncService = require('./aggregateSyncService');

class SyncScheduler {
  constructor() {
    this.isSchedulerRunning = false;
    this.syncInterval = null;
    this.officeHours = {
      start: 8, // 8:00 AM
      end: 18   // 6:00 PM
    };
  }

  /**
   * Check if current time is outside office hours
   */
  isOutsideOfficeHours() {
    const now = new Date();
    const currentHour = now.getHours();
    
    // Check if it's before office start or after office end
    return currentHour < this.officeHours.start || currentHour >= this.officeHours.end;
  }

  /**
   * Start the automatic sync scheduler
   */
  startScheduler() {
    if (this.isSchedulerRunning) {
      console.log('Sync scheduler is already running');
      return;
    }

    console.log('Starting aggregate sync scheduler...');
    this.isSchedulerRunning = true;

    // Check every hour if it's time to sync
    this.syncInterval = setInterval(async () => {
      if (this.isOutsideOfficeHours()) {
        console.log('Outside office hours, checking if daily sync needed...');
        
        try {
          // Check if we've already synced today
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const tomorrow = new Date(today);
          tomorrow.setDate(tomorrow.getDate() + 1);

          // Get current sync status
          const status = aggregateSyncService.getSyncStatus();
          
          // If no sync today or last sync was before today, trigger sync
          if (!status.lastSyncTime || status.lastSyncTime < today) {
            console.log('Triggering automatic daily sync...');
            const result = await aggregateSyncService.performSync();
            
            if (result.success) {
              console.log(`✅ Automatic sync completed: ${result.stats.length} services synced`);
            } else {
              console.error(`❌ Automatic sync failed: ${result.message}`);
            }
          } else {
            console.log('Daily sync already completed today');
          }
        } catch (error) {
          console.error('Error in automatic sync scheduler:', error);
        }
      }
    }, 60 * 60 * 1000); // Check every hour

    console.log('Sync scheduler started - will auto-sync daily after office hours');
  }

  /**
   * Stop the automatic sync scheduler
   */
  stopScheduler() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
      this.isSchedulerRunning = false;
      console.log('Sync scheduler stopped');
    }
  }

  /**
   * Get scheduler status
   */
  getSchedulerStatus() {
    return {
      isRunning: this.isSchedulerRunning,
      officeHours: this.officeHours,
      isOutsideOfficeHours: this.isOutsideOfficeHours(),
      nextCheckTime: this.syncInterval ? 'Every hour' : 'Not scheduled'
    };
  }

  /**
   * Force a sync regardless of time
   */
  async forceSync() {
    console.log('Force sync triggered...');
    return await aggregateSyncService.performSync();
  }
}

// Create singleton instance
const syncScheduler = new SyncScheduler();

// Auto-start scheduler when module is loaded
syncScheduler.startScheduler();

module.exports = syncScheduler;
