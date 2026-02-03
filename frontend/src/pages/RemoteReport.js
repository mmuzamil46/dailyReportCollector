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
                            <div className="card-header bg-dark text-white fw-bold">Detailed Facility Breakdown by Woreda</div>
                            <div className="table-responsive">
                                <table className="table table-bordered table-striped table-hover mb-0 align-middle bg-white">
                                    <thead className="table-secondary text-center align-middle">
                                        <tr>
                                            <th rowSpan="2" className="bg-light">Woreda</th>
                                            <th rowSpan="2" className="bg-light">Facility Name</th>
                                            <th colSpan="2" className="bg-info bg-opacity-10">Birth (ልደት)</th>
                                            <th colSpan="2" className="bg-warning bg-opacity-10">Death (ሞት)</th>
                                            <th colSpan="2" className="bg-danger bg-opacity-10">Divorce (ፍቺ)</th>
                                            <th rowSpan="2" className="bg-primary text-white">Woreda Total</th>
                                        </tr>
                                        <tr>
                                            <th className="small text-muted bg-info bg-opacity-10">ወንድ</th>
                                            <th className="small text-muted bg-info bg-opacity-10">ሴት</th>
                                            <th className="small text-muted bg-warning bg-opacity-10">ወንድ</th>
                                            <th className="small text-muted bg-warning bg-opacity-10">ሴት</th>
                                            <th className="small text-muted bg-danger bg-opacity-10">ወንድ</th>
                                            <th className="small text-muted bg-danger bg-opacity-10">ሴት</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {(() => {
                                            // 1. Group facilities by Woreda
                                            const groupedByWoreda = {};
                                            
                                            Object.entries(stats.byFacility).forEach(([facilityName, data]) => {
                                                const woreda = data.woreda || 'Unknown';
                                                
                                                if (!groupedByWoreda[woreda]) {
                                                    groupedByWoreda[woreda] = {
                                                        facilities: [],
                                                        totals: {
                                                            birth: 0, death: 0, divorce: 0,
                                                            grandTotal: 0
                                                        }
                                                    };
                                                }
                                                
                                                groupedByWoreda[woreda].facilities.push({
                                                    name: facilityName,
                                                    stats: data.stats
                                                });

                                                // Aggregate Woreda Totals
                                                groupedByWoreda[woreda].totals.grandTotal += data.stats.grandTotal;
                                            });

                                            // 2. Sort Woredas numerically
                                            const sortedWoredas = Object.keys(groupedByWoreda).sort((a, b) => {
                                                const numA = parseInt(a);
                                                const numB = parseInt(b);
                                                if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
                                                return a.localeCompare(b);
                                            });

                                            // 3. Render Rows
                                            return sortedWoredas.map(woredaKey => {
                                                const woredaData = groupedByWoreda[woredaKey];
                                                const rowSpan = woredaData.facilities.length;

                                                return woredaData.facilities.map((facility, index) => (
                                                    <tr key={`${woredaKey}-${facility.name}`}>
                                                        {index === 0 && (
                                                            <td rowSpan={rowSpan} className="fw-bold text-center bg-light">
                                                                {woredaKey}
                                                            </td>
                                                        )}
                                                        <td>{facility.name}</td>
                                                        
                                                        {/* Birth */}
                                                        <td className="text-center">{facility.stats['ልደት'].male}</td>
                                                        <td className="text-center">{facility.stats['ልደት'].female}</td>
                                                        
                                                        {/* Death */}
                                                        <td className="text-center">{facility.stats['ሞት'].male}</td>
                                                        <td className="text-center">{facility.stats['ሞት'].female}</td>
                                                        
                                                        {/* Divorce */}
                                                        <td className="text-center">{facility.stats['ፍቺ'].male}</td>
                                                        <td className="text-center">{facility.stats['ፍቺ'].female}</td>

                                                        {index === 0 && (
                                                            <td rowSpan={rowSpan} className="text-center fw-bold fs-5 text-primary bg-primary bg-opacity-10">
                                                                {woredaData.totals.grandTotal}
                                                            </td>
                                                        )}
                                                    </tr>
                                                ));
                                            });
                                        })()}
                                        
                                        {/* Grand Total Row */}
                                        <tr className="table-dark fw-bold">
                                            <td colSpan="2" className="text-end">ጠቅላላ ድምር</td>
                                            {/* Calculations for Grand Totals Columns */}
                                            {(() => {
                                                const grandTotals = {
                                                    birthM: 0, birthF: 0,
                                                    deathM: 0, deathF: 0,
                                                    divorceM: 0, divorceF: 0,
                                                    all: 0
                                                };

                                                Object.values(stats.byFacility).forEach(data => {
                                                    grandTotals.birthM += data.stats['ልደት'].male;
                                                    grandTotals.birthF += data.stats['ልደት'].female;
                                                    grandTotals.deathM += data.stats['ሞት'].male;
                                                    grandTotals.deathF += data.stats['ሞት'].female;
                                                    grandTotals.divorceM += data.stats['ፍቺ'].male;
                                                    grandTotals.divorceF += data.stats['ፍቺ'].female;
                                                    grandTotals.all += data.stats.grandTotal;
                                                });

                                                return (
                                                    <>
                                                        <td className="text-center">{grandTotals.birthM}</td>
                                                        <td className="text-center">{grandTotals.birthF}</td>
                                                        <td className="text-center">{grandTotals.deathM}</td>
                                                        <td className="text-center">{grandTotals.deathF}</td>
                                                        <td className="text-center">{grandTotals.divorceM}</td>
                                                        <td className="text-center">{grandTotals.divorceF}</td>
                                                        <td className="text-center fs-4 text-warning">{grandTotals.all}</td>
                                                    </>
                                                );
                                            })()}
                                        </tr>
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
