import { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

function Register() {
  const [userData, setUserData] = useState({ email: '', password: '', role: 'User' });
  const { register } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await register(userData);
      navigate('/');
    } catch (error) {
      alert('Registration failed');
    }
  };

  return (
    <div style={{ padding: '2rem' }}>
      <h2>Register</h2>
      <form onSubmit={handleSubmit}>
        <div>
          <label>Email:</label>
          <input
            type="email"
            value={userData.email}
            onChange={(e) => setUserData({ ...userData, email: e.target.value })}
          />
        </div>
        <div>
          <label>Password:</label>
          <input
            type="password"
            value={userData.password}
            onChange={(e) => setUserData({ ...userData, password: e.target.value })}
          />
        </div>
        <div>
          <label>Role:</label>
          <select
            value={userData.role}
            onChange={(e) => setUserData({ ...userData, role: e.target.value })}
          >
            <option value="User">User</option>
            <option value="Admin">Admin</option>
          </select>
        </div>
        <button type="submit">Register</button>
      </form>
    </div>
  );
}

export default Register;