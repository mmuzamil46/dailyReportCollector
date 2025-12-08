import { createContext, useState, useEffect } from 'react';
import axios from 'axios';
import { jwtDecode } from 'jwt-decode';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token') || '');

  useEffect(() => {
    if (token) {
      try {
        const decoded = jwtDecode(token);
        setUser({ id: decoded.user.id, role: decoded.user.role, woreda: decoded.user.woreda });
      } catch (error) {
        console.error('Invalid token:', error);
        localStorage.removeItem('token');
        setToken('');
        setUser(null);
      }
    } else {
      setUser(null);
    }
  }, [token]);

  const login = async (credentials) => {
    try {
      const response = await axios.post('http://10.23.76.202:1000/api/users/login', credentials);
      const { token } = response.data;
      const decoded = jwtDecode(token);
      localStorage.setItem('token', token);
      setToken(token);
      setUser({ id: decoded.user.id, role: decoded.user.role, woreda: decoded.user.woreda });
    } catch (error) {
      console.error('Login failed:', error.response?.data?.message);
      throw error;
    }
  };

  const register = async (userData) => {
    try {
      const response = await axios.post('http://10.23.76.202:1000/api/users/register', userData);
      const { token } = response.data;
      const decoded = jwtDecode(token);
      localStorage.setItem('token', token);
      setToken(token);
      setUser({ id: decoded.user.id, role: decoded.user.role, woreda: decoded.user.woreda });
    } catch (error) {
      console.error('Registration failed:', error.response?.data?.message);
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken('');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, setToken, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};