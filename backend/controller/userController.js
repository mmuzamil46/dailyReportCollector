const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// @desc    Register a new user
// @route   POST /api/users/register
// @access  Private/Admin
const registerUser = async (req, res) => {
  const { fullName, username, phone, password, woreda, role, isActive } = req.body;

  // Basic validation
  if (!fullName || !username || !phone || !password) {
    return res.status(400).json({ message: 'Full name, username, phone, and password are required' });
  }

  try {
    let user = await User.findOne({ username });
    if (user) {
      return res.status(400).json({ message: 'Username already exists' });
    }

    user = await User.findOne({ phone });
    if (user) {
      return res.status(400).json({ message: 'Phone number already exists' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = new User({
      fullName,
      username,
      phone,
      password: hashedPassword,
      woreda,
      role: role || 'User',
      isActive: isActive !== undefined ? isActive : true,
      createdBy: req.user.id, // Set createdBy to admin's ID
    });

    const createdUser = await newUser.save();

    // Emit WebSocket event
    const io = req.app.get('io');
    io.emit('userRegistered', { message: 'New user registered', userId: createdUser._id });

    res.status(201).json(createdUser);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error while registering user' });
  }
};

// @desc    Login user and get token
// @route   POST /api/users/login
// @access  Public
const loginUser = async (req, res) => {
  const { username, password } = req.body;

  try {
    const user = await User.findOne({ username });
    if (!user || !user.isActive) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const payload = { user: { id: user._id, role: user.role, woreda: user.woreda } };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1w' });

    res.status(200).json({ token });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error while logging in' });
  }
};

// @desc    Get all users
// @route   GET /api/users
// @access  Private/Admin
const getAllUsers = async (req, res) => {
  try {
    const users = await User.find({ isActive: true }).select('-password').sort({ createdAt: -1 });
    res.status(200).json(users);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error while fetching users' });
  }
};

// @desc    Get user by ID
// @route   GET /api/users/:id
// @access  Private
const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user || !user.isActive) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.status(200).json(user);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error while fetching user' });
  }
};

// @desc    Update user
// @route   PUT /api/users/:id
// @access  Private (self or admin)
const updateUser = async (req, res) => {
  const { fullName, phone, woreda, role, isActive } = req.body;

  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Authorization: Self or admin
    if (req.user._id.toString() !== user._id.toString() && req.user.role !== 'Admin') {
      return res.status(403).json({ message: 'Not authorized to update this user' });
    }

    // Role can only be updated by admin
    if (role && req.user.role !== 'Admin') {
      return res.status(403).json({ message: 'Not authorized to update role' });
    }

    user.fullName = fullName || user.fullName;
    user.phone = phone || user.phone;
    user.woreda = woreda || user.woreda;
    user.role = role || user.role;
    user.isActive = isActive !== undefined ? isActive : user.isActive;

    // If password is provided, hash it
    if (req.body.password) {
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(req.body.password, salt);
    }

    const updatedUser = await user.save();
    res.status(200).json(updatedUser);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error while updating user' });
  }
};

// @desc    Soft delete user (set isActive to false)
// @route   DELETE /api/users/:id
// @access  Private/Admin
const deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (req.user.role !== 'Admin') {
      return res.status(403).json({ message: 'Not authorized to delete users' });
    }

    user.isActive = false;
    await user.save();
    res.status(200).json({ message: 'User deactivated' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error while deleting user' });
  }
};

module.exports = { registerUser, loginUser, getAllUsers, getUserById, updateUser, deleteUser };