const express = require('express');
const {
  registerUser,
  loginUser,
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
} = require('../controller/userController');
const authMiddleware = require('../middleware/auth');
const authorizedRoles = require('../middleware/authorizedRoles');

const router = express.Router();

// Protected routes
router.post('/register', authMiddleware, authorizedRoles('Admin'), registerUser);
router.post('/login', loginUser);
router.get('/', authMiddleware, authorizedRoles('Admin'), getAllUsers);
router.get('/:id', authMiddleware, getUserById);
router.put('/:id', authMiddleware, updateUser);
router.delete('/:id', authMiddleware, authorizedRoles('Admin'), deleteUser);

module.exports = router;