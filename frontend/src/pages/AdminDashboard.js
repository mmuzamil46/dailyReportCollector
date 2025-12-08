import { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { getUsers, deleteUser } from '../services/api';

function AdminDashboard() {
  const [users, setUsers] = useState([]);
  const { user } = useContext(AuthContext);

  useEffect(() => {
    if (user?.role !== 'Admin') return;
    const fetchUsers = async () => {
      try {
        const response = await getUsers();
        setUsers(response.data);
      } catch (error) {
        console.error('Failed to fetch users:', error);
      }
    };
    fetchUsers();
  }, [user]);

  const handleDelete = async (id) => {
    try {
      await deleteUser(id);
      setUsers(users.filter((user) => user._id !== id));
    } catch (error) {
      alert('Failed to delete user');
    }
  };

  if (user?.role !== 'Admin') {
    return <div>Access Denied</div>;
  }

  return (
    <div style={{ padding: '2rem' }}>
      <h2>Admin Dashboard</h2>
      <h3>Manage Users</h3>
      <ul>
        {users.map((user) => (
          <li key={user._id}>
            {user.email} - {user.role}
            <button onClick={() => handleDelete(user._id)}>Delete</button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default AdminDashboard;