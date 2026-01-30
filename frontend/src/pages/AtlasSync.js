import React, { useState, useEffect } from 'react';
import { triggerAtlasSync, repairAtlasSync, cleanupDuplicates, pushToAtlas, repairRevenue, 
         getAggregateSyncStatus, getSchedulerStatus, getAtlasStats, manualAggregateSync, forceAggregateSync } from '../services/api';

const AtlasSync = () => {
    const [status, setStatus] = useState('');
    const [loading, setLoading] = useState(false);
    const [aggregateStatus, setAggregateStatus] = useState(null);
    const [schedulerStatus, setSchedulerStatus] = useState(null);
    const [atlasStats, setAtlasStats] = useState(null);
    const [aggregateLoading, setAggregateLoading] = useState(false);

    const handleSync = async (type) => {
        setLoading(true);
        setStatus('Syncing...');
        try {
            let res;
            if (type === 'manual') res = await triggerAtlasSync();
            else if (type === 'push') res = await pushToAtlas();
            else if (type === 'repair') res = await repairAtlasSync();
            else if (type === 'revenue') res = await repairRevenue();
            else res = await cleanupDuplicates();
            
            setStatus(`Success: ${res.data.message}`);
        } catch (err) {
            setStatus(`Error: ${err.response?.data?.message || err.message}`);
        } finally {
            setLoading(false);
        }
    };

    // Load aggregate sync status on component mount
    useEffect(() => {
        loadAggregateStatus();
    }, []);

    const loadAggregateStatus = async () => {
        try {
            setAggregateLoading(true);
            const [aggStatus, schedStatus, atlasData] = await Promise.all([
                getAggregateSyncStatus(),
                getSchedulerStatus(),
                getAtlasStats()
            ]);
            
            setAggregateStatus(aggStatus.data);
            setSchedulerStatus(schedStatus.data);
            setAtlasStats(atlasData.data);
        } catch (err) {
            console.error('Error loading aggregate status:', err);
        } finally {
            setAggregateLoading(false);
        }
    };

    const handleAggregateSync = async (type) => {
        setAggregateLoading(true);
        setStatus('Syncing aggregate data...');
        try {
            let res;
            if (type === 'manual') {
                res = await manualAggregateSync();
            } else {
                res = await forceAggregateSync();
            }
            
            if (res.data.success) {
                const summary = res.data.summary;
                let message = `✅ Aggregate sync successful: ${res.data.stats?.length || 0} services synced`;
                message += `\n📅 Year: ${summary.year}`;
                message += `\n� Total reports: ${summary.totalReports}`;
                
                if (summary.backReports > 0) {
                    message += `\n🔄 Back-reports: ${summary.backReports}`;
                }
                if (summary.currentReports > 0) {
                    message += `\n🆕 Current reports: ${summary.currentReports}`;
                }
                
                setStatus(message);
                // Refresh status after successful sync
                setTimeout(loadAggregateStatus, 2000);
            } else {
                setStatus(`❌ Aggregate sync failed: ${res.data.message}`);
            }
        } catch (err) {
            setStatus(`❌ Error: ${err.response?.data?.message || err.message}`);
        } finally {
            setAggregateLoading(false);
        }
    };

    const formatDateTime = (dateString) => {
        if (!dateString) return 'Never';
        return new Date(dateString).toLocaleString();
    };

    return (
        <div className="container mt-5">
            <div className="card shadow-lg border-0" style={{background: 'linear-gradient(135deg, #05395e, #0a4a75)', color: 'white'}}>
                <div className="card-body p-5">
                    <h2 className="mb-4 d-flex align-items-center">
                        <i className="fas fa-sync-alt me-3"></i> MongoDB Atlas Sync Manager
                    </h2>
                    <p className="lead mb-5 opacity-75">
                        Manage synchronization between the local database and remote officer registrations on Atlas.
                    </p>

                    <div className="row g-4">
                        <div className="col-md-3">
                            <button 
                                className="btn btn-light btn-lg w-100 py-4 shadow-sm"
                                onClick={() => handleSync('manual')}
                                disabled={loading}
                            >
                                <i className="fas fa-play d-block mb-3 fs-3 text-primary"></i>
                                Run Pull Sync
                            </button>
                        </div>
                        <div className="col-md-3">
                            <button 
                                className="btn btn-outline-light btn-lg w-100 py-4 shadow-sm"
                                onClick={() => handleSync('push')}
                                disabled={loading}
                            >
                                <i className="fas fa-cloud-upload-alt d-block mb-3 fs-3 text-info"></i>
                                Push to Atlas
                            </button>
                        </div>
                        <div className="col-md-3">
                            <button 
                                className="btn btn-outline-light btn-lg w-100 py-4 shadow-sm"
                                onClick={() => handleSync('repair')}
                                disabled={loading}
                            >
                                <i className="fas fa-tools d-block mb-3 fs-3"></i>
                                Repair Data
                            </button>
                        </div>
                        <div className="col-md-3">
                            <button 
                                className="btn btn-outline-warning btn-lg w-100 py-4 shadow-sm"
                                onClick={() => handleSync('revenue')}
                                disabled={loading}
                            >
                                <i className="fas fa-coins d-block mb-3 fs-3"></i>
                                Repair Revenue
                            </button>
                        </div>
                        <div className="col-md-3">
                            <button 
                                className="btn btn-outline-danger btn-lg w-100 py-4 shadow-sm"
                                onClick={() => handleSync('cleanup')}
                                disabled={loading}
                            >
                                <i className="fas fa-broom d-block mb-3 fs-3"></i>
                                Clean Dups
                            </button>
                        </div>
                    </div>

                    {/* Aggregate Sync Section */}
                    <div className="mt-5">
                        <h4 className="mb-4">
                            <i className="fas fa-chart-bar me-2"></i>
                            Aggregate Service Count Sync
                        </h4>
                        
                        {/* Status Cards */}
                        <div className="row g-3 mb-4">
                            <div className="col-md-4">
                                <div className="card bg-white text-dark">
                                    <div className="card-body">
                                        <h6 className="card-title">
                                            <i className="fas fa-database me-2 text-primary"></i>
                                            Local Stats
                                        </h6>
                                        {aggregateStatus ? (
                                            <>
                                                <p className="mb-1"><strong>Services:</strong> {aggregateStatus.totalServices}</p>
                                                <p className="mb-1"><strong>Reports:</strong> {aggregateStatus.totalReports}</p>
                                                <p className="mb-0"><small><strong>Last Sync:</strong> {formatDateTime(aggregateStatus.syncStatus?.lastSyncTime)}</small></p>
                                            </>
                                        ) : (
                                            <p className="mb-0 text-muted">Loading...</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <div className="col-md-4">
                                <div className="card bg-white text-dark">
                                    <div className="card-body">
                                        <h6 className="card-title">
                                            <i className="fas fa-clock me-2 text-info"></i>
                                            Scheduler
                                        </h6>
                                        {schedulerStatus ? (
                                            <>
                                                <p className="mb-1"><strong>Status:</strong> {schedulerStatus.scheduler?.isRunning ? 'Running' : 'Stopped'}</p>
                                                <p className="mb-1"><strong>Office Hours:</strong> {schedulerStatus.scheduler?.officeHours?.start}:00 - {schedulerStatus.scheduler?.officeHours?.end}:00</p>
                                                <p className="mb-0"><small><strong>Outside Hours:</strong> {schedulerStatus.scheduler?.isOutsideOfficeHours ? 'Yes' : 'No'}</small></p>
                                            </>
                                        ) : (
                                            <p className="mb-0 text-muted">Loading...</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <div className="col-md-4">
                                <div className="card bg-white text-dark">
                                    <div className="card-body">
                                        <h6 className="card-title">
                                            <i className="fas fa-cloud me-2 text-success"></i>
                                            Atlas Stats
                                        </h6>
                                        {atlasStats ? (
                                            <>
                                                <p className="mb-1"><strong>Services:</strong> {atlasStats.totalServices}</p>
                                                <p className="mb-1"><strong>Reports:</strong> {atlasStats.totalReports}</p>
                                                <p className="mb-0"><small><strong>Last Updated:</strong> {formatDateTime(atlasStats.lastUpdated)}</small></p>
                                            </>
                                        ) : (
                                            <p className="mb-0 text-muted">Loading...</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Aggregate Sync Buttons */}
                        <div className="row g-3">
                            <div className="col-md-6">
                                <button 
                                    className="btn btn-success btn-lg w-100 py-3"
                                    onClick={() => handleAggregateSync('manual')}
                                    disabled={aggregateLoading}
                                >
                                    <i className="fas fa-sync me-2"></i>
                                    {aggregateLoading ? 'Syncing...' : 'Manual Aggregate Sync'}
                                </button>
                            </div>
                            <div className="col-md-6">
                                <button 
                                    className="btn btn-warning btn-lg w-100 py-3"
                                    onClick={() => handleAggregateSync('force')}
                                    disabled={aggregateLoading}
                                >
                                    <i className="fas fa-bolt me-2"></i>
                                    {aggregateLoading ? 'Forcing...' : 'Force Sync Now'}
                                </button>
                            </div>
                        </div>
                    </div>

                    {status && (
                        <div className={`mt-5 p-4 rounded-3 ${status.includes('Error') ? 'bg-danger' : 'bg-success'} bg-opacity-25 border border-${status.includes('Error') ? 'danger' : 'success'}`}>
                            <h5 className="mb-0">
                                <i className={`fas ${status.includes('Error') ? 'fa-exclamation-circle' : 'fa-check-circle'} me-2`}></i>
                                {status}
                            </h5>
                        </div>
                    )}
                </div>
            </div>
            
            <div className="mt-4 card border-0 shadow-sm bg-light">
                <div className="card-body">
                    <h5 className="text-muted mb-3"><i className="fas fa-info-circle me-2"></i>Sync Information</h5>
                    <div className="row">
                        <div className="col-md-6">
                            <h6 className="text-muted mb-2"><i className="fas fa-exchange-alt me-2"></i>Regular Sync Operations</h6>
                            <ul className="mb-0 text-muted small">
                                <li><strong>Pull Sync:</strong> Fetches registrations from remote hospital/court officers on Atlas.</li>
                                <li><strong>Push Sync:</strong> Uploads all local reports and historical data to Atlas for the public website.</li>
                                <li><strong>Repair Sync:</strong> Verifies all Atlas IDs exist locally and restores any missing links.</li>
                                <li><strong>Cleanup Sync:</strong> Removes duplicate registration numbers from the local mirror.</li>
                                <li><strong>Repair Revenue:</strong> Scans all local reports and backfills missing price/payment data from service definitions.</li>
                            </ul>
                        </div>
                        <div className="col-md-6">
                            <h6 className="text-muted mb-2"><i className="fas fa-chart-bar me-2"></i>Aggregate Service Count Sync</h6>
                            <ul className="mb-0 text-muted small">
                                <li><strong>Manual Sync:</strong> Calculates aggregate service counts and syncs to Atlas cumulativestats collection.</li>
                                <li><strong>Force Sync:</strong> Bypasses scheduler and forces immediate sync to Atlas.</li>
                                <li><strong>Auto Sync:</strong> Runs automatically daily after office hours (6:00 PM).</li>
                                <li><strong>Smart Logic:</strong> Prevents duplicate syncs on the same day.</li>
                                <li><strong>Real-time Status:</strong> Shows local, scheduler, and Atlas sync status.</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AtlasSync;
