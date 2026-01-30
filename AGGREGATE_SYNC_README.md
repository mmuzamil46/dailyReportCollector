# Aggregate Service Count Sync Feature

## Overview
This feature provides automatic and manual synchronization of aggregate service counts from the local MongoDB database to MongoDB Atlas. The system maintains a `cumulativestats` collection in Atlas with service names and their total counts.

## Features

### 1. Automatic Daily Sync
- **Schedule**: Runs automatically every day after office hours (6:00 PM)
- **Check Interval**: Every hour to see if sync is needed
- **Smart Logic**: Only syncs once per day to prevent duplicates
- **Office Hours**: 8:00 AM - 6:00 PM (configurable)

### 2. Manual Sync
- **Manual Trigger**: Admin/Staff can trigger sync anytime
- **Force Sync**: Bypass scheduler and force immediate sync
- **Status Tracking**: Real-time sync status and progress

### 3. Data Model
```javascript
// CumulativeStats Schema (Atlas)
{
  serviceName: String (unique),
  totalCount: Number,
  lastUpdated: Date,
  date: Date,
  timestamps: true
}
```

## API Endpoints

### Authentication Required (Admin/Staff only)

#### Get Current Stats
```
GET /api/reports/sync/aggregate/status
```
Returns current local aggregate stats and sync status

#### Get Scheduler Status
```
GET /api/reports/sync/scheduler/status
```
Returns scheduler configuration and status

#### Get Atlas Stats
```
GET /api/reports/sync/atlas-stats
```
Returns current stats stored in Atlas

#### Manual Sync
```
POST /api/reports/sync/aggregate
```
Triggers manual aggregate sync

#### Force Sync
```
POST /api/reports/sync/force
```
Forces sync bypassing scheduler checks

## File Structure

```
backend/
├── models/
│   └── CumulativeStats.js          # Atlas data model
├── services/
│   ├── aggregateSyncService.js     # Core sync logic
│   └── syncScheduler.js            # Automatic scheduler
├── controller/
│   └── reportController.js         # Sync API endpoints
└── routes/
    └── reportRoutes.js             # Sync route definitions
```

## Configuration

### Environment Variables
```env
REMOTE_MONGO_URI=mongodb+srv://...  # Atlas connection string
```

### Scheduler Settings
```javascript
officeHours: {
  start: 8,    // 8:00 AM
  end: 18      // 6:00 PM
}
```

## Usage Examples

### Manual Sync (with curl)
```bash
# Get current status
curl -X GET http://localhost:8080/api/reports/sync/aggregate/status \
  -H "Authorization: Bearer YOUR_TOKEN"

# Trigger manual sync
curl -X POST http://localhost:8080/api/reports/sync/aggregate \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json"

# Force sync
curl -X POST http://localhost:8080/api/reports/sync/force \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json"
```

### Response Examples

#### Status Response
```json
{
  "syncStatus": {
    "isSyncing": false,
    "lastSyncTime": "2026-01-30T10:30:00.000Z"
  },
  "localStats": [
    {
      "serviceName": "መታወቂያ",
      "totalCount": 1250,
      "date": "2026-01-30T10:30:00.000Z",
      "lastUpdated": "2026-01-30T10:30:00.000Z"
    }
  ],
  "totalServices": 8,
  "totalReports": 2500
}
```

#### Sync Response
```json
{
  "success": true,
  "message": "Sync completed successfully",
  "stats": [...],
  "syncTime": "2026-01-30T10:30:00.000Z"
}
```

## Monitoring

### Logs
The system provides detailed logs for:
- Scheduler startup/shutdown
- Sync attempts and results
- Atlas connection status
- Error conditions

### Status Indicators
- `isSyncing`: True when sync is in progress
- `lastSyncTime`: Timestamp of last successful sync
- `isRunning`: Scheduler running status
- `isOutsideOfficeHours`: Current time status

## Error Handling

### Common Scenarios
1. **Atlas Connection Failed**: Graceful fallback with error logging
2. **Sync in Progress**: Prevents concurrent syncs
3. **No Remote URI**: Disables Atlas features gracefully
4. **Duplicate Sync**: Prevents multiple daily syncs

### Error Responses
```json
{
  "success": false,
  "message": "Atlas connection not available"
}
```

## Frontend Integration

### React Component Example
```javascript
// Sync status component
const SyncStatus = () => {
  const [status, setStatus] = useState(null);
  
  const fetchStatus = async () => {
    const response = await api.get('/sync/aggregate/status');
    setStatus(response.data);
  };
  
  const handleManualSync = async () => {
    const response = await api.post('/sync/aggregate');
    if (response.data.success) {
      fetchStatus(); // Refresh status
    }
  };
  
  return (
    <div>
      <h3>Aggregate Sync Status</h3>
      <p>Last Sync: {status?.syncStatus?.lastSyncTime}</p>
      <p>Total Reports: {status?.totalReports}</p>
      <button onClick={handleManualSync}>Manual Sync</button>
    </div>
  );
};
```

## Testing

### Test Script
Run the included test script to verify functionality:
```bash
node test_aggregate_sync.js
```

### Manual Testing
1. Start the application
2. Check scheduler status
3. Trigger manual sync
4. Verify Atlas data
5. Check logs for errors

## Deployment Notes

### Docker Integration
- Scheduler auto-starts with the application
- Atlas connection uses environment variables
- Logs are sent to container logs

### Production Considerations
- Ensure `REMOTE_MONGO_URI` is set in production
- Monitor Atlas connection status
- Set appropriate office hours for your timezone
- Consider adding retry logic for failed syncs

## Troubleshooting

### Common Issues
1. **Atlas Connection**: Check `REMOTE_MONGO_URI` environment variable
2. **Authentication**: Ensure user has Admin/Staff role
3. **Scheduler Not Running**: Check application startup logs
4. **No Data**: Verify local database has reports and services

### Debug Commands
```bash
# Check backend logs
docker-compose logs backend

# Test Atlas connection
curl -X GET http://localhost:8080/api/reports/sync/atlas-stats

# Check scheduler status
curl -X GET http://localhost:8080/api/reports/sync/scheduler/status
```

## Future Enhancements

### Potential Improvements
1. **Webhook Notifications**: Notify on sync completion/failure
2. **Retry Logic**: Automatic retry for failed syncs
3. **Scheduled Reports**: Email reports of sync results
4. **Historical Tracking**: Track sync history over time
5. **Multiple Collections**: Sync other aggregate data
6. **Real-time Updates**: WebSocket updates for sync status

### Performance Optimizations
1. **Batch Processing**: Process services in batches
2. **Incremental Sync**: Only sync changed data
3. **Compression**: Compress data during transfer
4. **Connection Pooling**: Optimize Atlas connections

---

## Support

For issues or questions:
1. Check application logs
2. Verify Atlas connection
3. Test with provided script
4. Review API responses
5. Check authentication permissions
