import React, { useContext } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import 'bootstrap/dist/css/bootstrap.min.css';

function Navbar() {
  const { user, setToken } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleLogout = () => {
    setToken('');
    localStorage.removeItem('token');
    navigate('/login');
  };

  return (
    <nav className="navbar navbar-expand-lg navbar-dark" style={{ backgroundColor: '#05395e' }}>
      <div className="container-fluid">
        <NavLink className="navbar-brand" to="/">
          <img 
            src="./logwhite.JPG" 
            alt="Logo" 
            style={{ 
              height: '40px',
              width: 'auto'
            }}
          />
        </NavLink>
        <button
          className="navbar-toggler"
          type="button"
          data-bs-toggle="collapse"
          data-bs-target="#navbarNav"
        >
          <span className="navbar-toggler-icon"></span>
        </button>
        <div className="collapse navbar-collapse" id="navbarNav">
          <ul className="navbar-nav ms-auto">
            {user && user.role === 'User' && (
              <>
                <li className="nav-item">
                  <NavLink className="nav-link" to="/reports">Reports</NavLink>
                </li>
              </>
            )}
          
            <li className="nav-item">
              <NavLink className="nav-link" to="/daily-report">ዕለታዊ ሪፖርት</NavLink>
            </li>
            <li className="nav-item">
  <NavLink className="nav-link" to="/plan-table">ዕቅድ</NavLink>
</li>
  
            {user && (user.role === 'Admin' || user.role === 'Staff') && (
              <>
                <li className="nav-item">
                  <NavLink className="nav-link" to="/all-reports">ሁሉም ሪፖርቶች</NavLink>
                </li>
                <li className="nav-item">
                  <NavLink className="nav-link" to="/generate-report">ሪፖርት አውጣ</NavLink>
                </li>
                { <li className="nav-item">
                  <NavLink className="nav-link" to="/data-analysis">የመረጃ ትንተና</NavLink>
                </li> }
                    <li className="nav-item">
                  <NavLink className="nav-link" to="/display">አሁናዊ ሪፖርት</NavLink>
                </li>
                 <li className="nav-item">
  <NavLink className="nav-link" to="/analysis">ዕቅድ-ሪፖርት ትንተና</NavLink>
</li>
 <li className="nav-item">
                  <NavLink className="nav-link" to="/reports">Reports</NavLink>
                </li>
              </>
            )}

            {user && user.role === 'Admin' && (
              <>
                <li className="nav-item">
                  <NavLink className="nav-link" to="/services">Manage Services</NavLink>
                </li>
                <li className="nav-item">
                  <NavLink className="nav-link" to="/users/register">Register User</NavLink>
                </li>
                <li className="nav-item">
                  <NavLink className="nav-link" to="/users">Manage Users</NavLink>
                </li>
              </>
            )}

            <li className="nav-item">
              {user ? (
                <button className="nav-link btn" onClick={handleLogout}>Logout</button>
              ) : (
                <NavLink className="nav-link" to="/login">Login</NavLink>
              )}
            </li>
          </ul>
        </div>
      </div>
    </nav>
  );
}

export default Navbar;