import React, { useState, useEffect } from 'react';
import { getRemoteReportData, getRemoteReportPDF } from '../services/api';

const RemoteReport = () => {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(false);
    const [dates, setDates] = useState({
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0]
    });

    const fetchData = async () => {
        setLoading(true);
        try {
            const res = await getRemoteReportData(dates);
            setStats(res.data);
        } catch (err) {
            console.error('Failed to fetch stats:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleDownloadPDF = async () => {
        try {
            const response = await getRemoteReportPDF(dates);
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `remote_report_${dates.startDate}_${dates.endDate}.pdf`);
            document.body.appendChild(link);
            link.click();
        } catch (err) {
            alert('Failed to download PDF');
        }
    };

    return (
        <div className="container mt-4">
            <div className="d-flex justify-content-between align-items-center mb-4 pb-2 border-bottom">
                <div>
                    <h2 className="text-primary mb-0">ወቅታዊ ምዝገባ (Remote Report)</h2>
                    <p className="text-muted">Analysis of registrated reports from Atlas Remote</p>
                </div>
                <button className="btn btn-success btn-lg shadow-sm" onClick={handleDownloadPDF}>
                    <i className="fas fa-file-pdf me-2"></i> Download Full PDF
                </button>
            </div>

            <div className="card shadow-sm mb-4 border-0 bg-light">
                <div className="card-body">
                    <div className="row g-3 align-items-end">
                        <div className="col-md-4">
                            <label className="small fw-bold text-muted mb-1">From Date</label>
                            <input type="date" className="form-control" value={dates.startDate} onChange={e => setDates({...dates, startDate: e.target.value})} />
                        </div>
                        <div className="col-md-4">
                            <label className="small fw-bold text-muted mb-1">To Date</label>
                            <input type="date" className="form-control" value={dates.endDate} onChange={e => setDates({...dates, endDate: e.target.value})} />
                        </div>
                        <div className="col-md-4">
                            <button className="btn btn-primary w-100" onClick={fetchData} disabled={loading}>
                                {loading ? 'Loading...' : 'Generate Analysis'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {stats && (
                <div className="row">
                    <div className="col-md-12">
                        <div className="card shadow-sm border-0">
                            <div className="card-header bg-dark text-white fw-bold">Detailed Facility Breakdown</div>
                            <div className="table-responsive">
                                <table className="table table-hover mb-0">
                                    <thead className="table-secondary">
                                        <tr>
                                            <th>Facility Name</th>
                                            <th>Woreda</th>
                                            <th className="text-center">Birth (ልደት)</th>
                                            <th className="text-center">Death (ሞት)</th>
                                            <th className="text-center">Divorce (ፍቺ)</th>
                                            <th className="text-center fw-bold">Total</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {Object.entries(stats.byFacility).map(([name, data]) => (
                                            <tr key={name}>
                                                <td className="fw-bold">{name}</td>
                                                <td>{data.woreda}</td>
                                                <td className="text-center">{data.stats['ልደት'].total}</td>
                                                <td className="text-center">{data.stats['ሞት'].total}</td>
                                                <td className="text-center">{data.stats['ፍቺ'].total}</td>
                                                <td className="text-center fw-bold text-primary">{data.stats.grandTotal}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default RemoteReport;
