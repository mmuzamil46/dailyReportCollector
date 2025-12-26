// frontend/src/pages/CardManagement.js
import React, { useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import AddStock from '../components/CardAdmin/AddStock';
import DistributeStock from '../components/CardAdmin/DistributeStock';
import VoidReporting from '../components/CardAdmin/VoidReporting';
import StockReport from '../components/CardAdmin/StockReport';

const CardManagement = () => {
  const { user } = useContext(AuthContext);
  const [activeTab, setActiveTab] = useState('report'); // Default view

  // Simple Tabs
  return (
    <div className="container mt-4">
      <h2 className="mb-4">Certificate Card Management</h2>
      <ul className="nav nav-tabs mb-4">
        <li className="nav-item">
          <button 
            className={`nav-link ${activeTab === 'report' ? 'active' : ''}`} 
            onClick={() => setActiveTab('report')}
          >
            Stock Report
          </button>
        </li>
        {(user.role === 'Admin' || user.role === 'Staff') && (
          <>
            <li className="nav-item">
              <button 
                className={`nav-link ${activeTab === 'add' ? 'active' : ''}`} 
                onClick={() => setActiveTab('add')}
              >
                Add Stock (Subcity)
              </button>
            </li>
            <li className="nav-item">
              <button 
                className={`nav-link ${activeTab === 'distribute' ? 'active' : ''}`} 
                onClick={() => setActiveTab('distribute')}
              >
                Distribute to Woreda
              </button>
            </li>
          </>
        )}
        {user.role === 'User' && (
             <li className="nav-item">
             <button 
               className={`nav-link ${activeTab === 'void' ? 'active' : ''}`} 
               onClick={() => setActiveTab('void')}
             >
               Report Void/Error
             </button>
           </li>
        )}
      </ul>

      <div className="tab-content">
        {activeTab === 'report' && <StockReport />}
        {activeTab === 'add' && <AddStock />}
        {activeTab === 'distribute' && <DistributeStock />}
        {activeTab === 'void' && <VoidReporting />}
      </div>
    </div>
  );
};

export default CardManagement;
