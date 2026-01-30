const mongoose = require('mongoose');
const cron = require('node-cron');
const OnTimeReg = require('../models/OnTimeReg');
const Report = require('../models/Report');
const Service = require('../models/Service');
const User = require('../models/User');
const RemoteOfficer = require('../models/RemoteOfficer');
const { connectToAtlas } = require('./atlasConnection');

let RemoteOnTimeReg = null;

const getSyncUser = async () => {
    // Find or create a user to attribute synced reports to
    let user = await User.findOne({ username: 'remote_sync_agent' });
    if (!user) {
        user = await User.create({
            fullName: 'Remote Sync Agent',
            username: 'remote_sync_agent',
            password: 'remote_sync_secure_password_hash', // In reality, hash this
            role: 'Staff',
            woreda: 'Remote',
            phone: '0000000000'
        });
    }
    return user;
};

const syncReports = async () => {
    console.log('Starting Sync Job...');
    
    // Ensure Atlas connection
    const connection = await connectToAtlas();
    if (!connection) {
        console.log('Skipping sync: No connection to Atlas.');
        return;
    }

    // Initialize model if needed
    if (!RemoteOnTimeReg) {
        RemoteOnTimeReg = connection.model('OnTimeReg', OnTimeReg.schema);
    }

    try {
        // 1. Fetch unsynced documents from Atlas
        const unsyncedDocs = await RemoteOnTimeReg.find({ synced: false }).limit(100);
        
        if (unsyncedDocs.length === 0) {
            console.log('No new remote reports to sync.');
            return;
        }

        console.log(`Found ${unsyncedDocs.length} remote reports to sync.`);

        // 2. Identify Target Service
        const targetService = await Service.findOne({ name: 'ወቅታዊ ምዝገባ' });
        if (!targetService) {
            console.error('Target Service "ወቅታዊ ምዝገባ" not found locally! Run seeder.');
            return;
        }

        const syncUser = await getSyncUser();

        let syncedCount = 0;

        for (const remoteDoc of unsyncedDocs) {
            // Transaction-like safety (manual)
            try {
                // A. Mirror to Local OnTimeReg
                // Check if already exists locally to be safe (by _id if we preserve it, or logic)
                // We'll trust _id preservation or just create new
                // For simplicity, we create a new local OnTimeReg (mirror)
                const localMirror = new OnTimeReg({
                    ...remoteDoc.toObject(),
                    _id: remoteDoc._id, // Preserve ID for tracking
                    synced: true 
                });
                
                // If ID collision (already synced but flag missed?), update it
                const existingMirror = await OnTimeReg.findById(remoteDoc._id);
                if (!existingMirror) {
                    await localMirror.save();
                }

                // B. Create Standard Report
                // Map Category
                // remoteDoc.serviceName is 'ልደት', 'ሞት', or 'ፍቺ'
                // Matches our categories exactly.
                
                // Check if Report already exists (avoid duplicates based on source ID or logic)
                // We'll use a unique identifier approach if possible, but Report doesn't have "sourceId".
                // We can use referenceNo + service + date to check dups, OR just trust the flow.
                // NOTE: To make it robust, we should ideally store "remoteSourceId" on Report, but we can't change schema easily right now without user approval.
                // We will check by (registrationNumber/referenceNo + serviceId) if those are unique enough.
                
                const reportData = {
                    serviceId: targetService._id,
                    woreda: remoteDoc.woreda, // Must match local woreda logic? Assuming string is fine.
                    serviceCategory: remoteDoc.serviceName,
                    payment: 0, // remote are free/prepaid
                    date: remoteDoc.date,
                    reportedBy: syncUser._id,
                    // Map fields
                    referenceNo: remoteDoc.referenceNumber,
                    remoteId: remoteDoc._id
                };

                const existingReport = await Report.findOne({ 
                    $or: [
                        { remoteId: remoteDoc._id },
                        { 
                            referenceNo: remoteDoc.referenceNumber, 
                            serviceId: targetService._id,
                            woreda: remoteDoc.woreda 
                        }
                    ]
                });
                
                if (!existingReport) {
                    await Report.create(reportData);
                } else if (!existingReport.remoteId) {
                    // Link existing report to this remote source
                    existingReport.remoteId = remoteDoc._id;
                    await existingReport.save();
                }

                // C. Update Atlas Doc
                if (!remoteDoc.synced) {
                    remoteDoc.synced = true;
                    await remoteDoc.save();
                }
                
                syncedCount++;

            } catch (err) {
                console.error(`Failed to sync doc ${remoteDoc._id}:`, err);
            }
        }

        console.log(`Sync completed. Processed: ${syncedCount}/${unsyncedDocs.length}`);

    } catch (error) {
        console.error('Error during sync execution:', error);
    }
};

const repairSync = async () => {
    console.log('Starting Sync Repair...');
    const connection = await connectToAtlas();
    if (!connection) return { success: false, message: 'Atlas connection failed' };

    if (!RemoteOnTimeReg) RemoteOnTimeReg = connection.model('OnTimeReg', OnTimeReg.schema);

    const targetService = await Service.findOne({ name: 'ወቅታዊ ምዝገባ' });
    const syncUser = await getSyncUser();
    
    // Fetch ALL remote docs (or large recent batch)
    // We want to verify preservation of local data
    const allRemoteDocs = await RemoteOnTimeReg.find({});
    let repairedCount = 0;

    for (const remoteDoc of allRemoteDocs) {
        try {
            // 1. Check/Mirror Local OnTimeReg
            const existingMirror = await OnTimeReg.findById(remoteDoc._id);
            if (!existingMirror) {
                await new OnTimeReg({
                    ...remoteDoc.toObject(),
                    _id: remoteDoc._id,
                    synced: true
                }).save();
            }

            // 2. Check/Create Report
            const existingReport = await Report.findOne({ 
                $or: [
                    { remoteId: remoteDoc._id },
                    { 
                        referenceNo: remoteDoc.referenceNumber, 
                        serviceId: targetService._id,
                        woreda: remoteDoc.woreda
                    }
                ]
            });

            if (!existingReport) {
                const reportData = {
                    serviceId: targetService._id,
                    woreda: remoteDoc.woreda,
                    serviceCategory: remoteDoc.serviceName,
                    payment: 0,
                    date: remoteDoc.date,
                    reportedBy: syncUser._id,
                    referenceNo: remoteDoc.referenceNumber,
                    remoteId: remoteDoc._id
                };
                await Report.create(reportData);
                repairedCount++;
            } else if (!existingReport.remoteId) {
                existingReport.remoteId = remoteDoc._id;
                await existingReport.save();
            }
            
            // Fix sync flag if needed
            if (!remoteDoc.synced) {
                remoteDoc.synced = true;
                await remoteDoc.save();
            }

        } catch (e) {
            console.error('Repair error for doc', remoteDoc._id, e);
        }
    }
    console.log(`Repair completed. Restored ${repairedCount} missing reports.`);
    return { success: true, repairedCount };
};

const cleanupDuplicates = async () => {
    console.log('Starting duplicate cleanup...');
    try {
        // Find duplicates based on referenceNumber
        const duplicates = await OnTimeReg.aggregate([
            {
                $group: {
                    _id: { referenceNumber: "$referenceNumber" },
                    uniqueIds: { $addToSet: "$_id" },
                    count: { $sum: 1 }
                }
            },
            {
                $match: {
                    count: { $gt: 1 }
                }
            }
        ]);

        if (duplicates.length === 0) {
            return { success: true, message: 'No duplicates found.' };
        }

        let deletedCount = 0;
        for (const doc of duplicates) {
            // Keep the first one, delete the rest
            const idsToDelete = doc.uniqueIds.slice(1);
            await OnTimeReg.deleteMany({ _id: { $in: idsToDelete } });
            deletedCount += idsToDelete.length;
        }

        return { success: true, message: `Cleaned up ${deletedCount} duplicate records.` };
    } catch (error) {
        console.error('Cleanup error:', error);
        throw error;
    }
};

const syncOfficers = async () => {
    console.log('Starting Officer Sync Job...');
    const connection = await connectToAtlas();
    if (!connection) {
        console.log('Skipping officer sync: No connection to Atlas.');
        return;
    }

    try {
        const RemoteOfficerAtlasModel = RemoteOfficer.getRemoteOfficerModel(connection);
        const atlasOfficers = await RemoteOfficerAtlasModel.find({ isActive: true });

        console.log(`Found ${atlasOfficers.length} active officers on Atlas.`);

        let syncedCount = 0;
        for (const atlasOfficer of atlasOfficers) {
            try {
                // Upsert locally
                await RemoteOfficer.findOneAndUpdate(
                    { atlasId: atlasOfficer._id },
                    {
                        fullName: atlasOfficer.fullName,
                        username: atlasOfficer.username,
                        phone: atlasOfficer.phone,
                        password: atlasOfficer.password, // Keep hashed password
                        woreda: atlasOfficer.woreda,
                        hospitalName: atlasOfficer.hospitalName,
                        isActive: atlasOfficer.isActive,
                        role: atlasOfficer.role || 'User',
                        atlasId: atlasOfficer._id
                    },
                    { upsert: true, new: true }
                );
                syncedCount++;
            } catch (err) {
                console.error(`Failed to sync officer ${atlasOfficer._id}:`, err);
            }
        }
        console.log(`Officer Sync completed. Processed: ${syncedCount}/${atlasOfficers.length}`);
    } catch (error) {
        console.error('Error during officer sync:', error);
    }
};

const pushLocalReportsToAtlas = async () => {
    console.log('Starting Push Sync to Atlas...');
    const connection = await connectToAtlas();
    if (!connection) {
        console.log('Skipping push sync: No connection to Atlas.');
        return { success: false, message: 'No connection to Atlas' };
    }

    // Initialize remote model for Reports on Atlas
    const RemoteReport = connection.model('PublicReport', Report.schema);

    try {
        const localReports = await Report.find({}).lean();
        console.log(`Found ${localReports.length} local reports to push.`);

        let pushedCount = 0;
        let batchSize = 100;

        for (let i = 0; i < localReports.length; i += batchSize) {
            const batch = localReports.slice(i, i + batchSize);
            
            // Prepare operations for bulkWrite
            const ops = batch.map(report => ({
                updateOne: {
                    filter: { _id: report._id },
                    update: { $set: report },
                    upsert: true
                }
            }));

            await RemoteReport.bulkWrite(ops);
            pushedCount += batch.length;
            console.log(`Pushed ${pushedCount}/${localReports.length} reports...`);
        }

        console.log('Push sync to Atlas completed successfully.');
        return { success: true, pushedCount };
    } catch (error) {
        console.error('Error during push sync to Atlas:', error);
        throw error;
    }
};

const initSyncService = () => {
    // Run report sync every 30 minutes
    cron.schedule('*/30 * * * *', () => {
        syncReports();
    });

    // Run officer sync every hour
    cron.schedule('0 * * * *', () => {
        syncOfficers();
    });
    
    // Also run once on startup
    setTimeout(async () => {
        await syncOfficers();
        await syncReports();
    }, 5000);
};

const repairRevenue = async () => {
    console.log('Starting Revenue Repair...');
    try {
        const reports = await Report.find({ payment: 0 }).populate('serviceId');
        console.log(`Found ${reports.length} reports with 0 payment to repair.`);

        let updatedCount = 0;
        for (const report of reports) {
            const service = report.serviceId;
            if (!service) continue;

            let price = 0;
            if (service.categories && service.categories.length > 0 && report.serviceCategory !== 'N/A') {
                const category = service.categories.find(c => c.name === report.serviceCategory);
                if (category) {
                    if (category.hasPriceVariants && report.priceVariant) {
                        const variant = category.priceVariants.find(v => v.label === report.priceVariant);
                        if (variant) price = variant.price;
                    } else {
                        price = category.price || 0;
                    }
                }
            } else {
                // Use top-level price if no categories or category is 'N/A'
                price = service.price || 0;
            }

            if (price > 0) {
                await Report.updateOne({ _id: report._id }, { $set: { price, payment: price } });
                updatedCount++;
            }
        }

        console.log(`Revenue repair completed. Updated ${updatedCount} reports.`);
        return { success: true, updatedCount };
    } catch (error) {
        console.error('Error during revenue repair:', error);
        throw error;
    }
};

module.exports = { initSyncService, syncReports, syncOfficers, repairSync, cleanupDuplicates, pushLocalReportsToAtlas, repairRevenue };
