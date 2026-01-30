const mongoose = require('mongoose');
const Report = require('../models/Report');
const Service = require('../models/Service');
require('dotenv').config();

// Schema for the remote collection: Cumulative totals per service
const remoteStatsSchema = new mongoose.Schema({
  serviceName: { type: String, required: true, unique: true },
  totalCount: { type: Number, required: true },
  lastUpdated: { type: Date, default: Date.now }
});

// We'll use a function to get or create the remote model on a specific connection
const getRemoteModel = (conn) => {
  return conn.model('CumulativeStats', remoteStatsSchema);
};

const syncCumulativeTotals = async () => {
  let remoteConn = null;
  try {
    console.log('Starting cumulative totals sync...');
    const remoteUri = process.env.REMOTE_MONGO_URI;
    if (!remoteUri) {
      console.error('REMOTE_MONGO_URI is missing!');
      throw new Error('REMOTE_MONGO_URI not defined in environment');
    }
    console.log('Remote URI found (masked):', remoteUri.substring(0, 20) + '...');

    // 1. Aggregate ALL reports locally
    console.log('Aggregating local reports...');
    // We group by serviceId to get the name and then sum up the 'count' field
    const aggregation = await Report.aggregate([
      {
        $group: {
          _id: '$serviceId',
          cumulativeCount: { $sum: { $ifNull: ['$count', 1] } }
        }
      },
      {
        $lookup: {
          from: 'services',
          localField: '_id',
          foreignField: '_id',
          as: 'serviceInfo'
        }
      },
      {
        $unwind: '$serviceInfo'
      },
      {
        $project: {
          serviceName: '$serviceInfo.name',
          cumulativeCount: 1
        }
      }
    ]);

    console.log('Aggregation result length:', aggregation.length);
    if (aggregation.length > 0) {
      console.log('First aggregated item:', JSON.stringify(aggregation[0]));
    }

    if (aggregation.length === 0) {
      console.log('No reports found to sync.');
      return { success: true, message: 'No reports found to sync.' };
    }

    // 2. Connect to remote DB
    console.log('Connecting to remote MongoDB Atlas...');
    remoteConn = await mongoose.createConnection(remoteUri).asPromise();
    console.log('Remote connection established.');
    const RemoteStats = getRemoteModel(remoteConn);

    // 3. Upsert totals on the remote side
    console.log('Upserting to remote database...');
    const syncPromises = aggregation.map(async (item) => {
      console.log(`Syncing service: ${item.serviceName} -> Count: ${item.cumulativeCount}`);
      return RemoteStats.findOneAndUpdate(
        { serviceName: item.serviceName },
        { totalCount: item.cumulativeCount, lastUpdated: new Date() },
        { upsert: true, new: true }
      );
    });

    const results = await Promise.all(syncPromises);
    console.log(`Sync completed successfully. ${results.length} items processed.`);
    return { success: true, message: `Synced ${aggregation.length} services successfully.` };

  } catch (error) {
    console.error('Detailed Sync error:', error);
    return { success: false, message: error.message };
  } finally {
    if (remoteConn) {
      console.log('Closing remote connection.');
      await remoteConn.close();
    }
  }
};

const triggerSync = async (req, res) => {
  const result = await syncCumulativeTotals();
  if (result.success) {
    res.status(200).json(result);
  } else {
    res.status(500).json(result);
  }
};

module.exports = {
  syncCumulativeTotals,
  triggerSync
};
