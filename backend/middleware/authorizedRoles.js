// middleware/authorizedRoles.js
const authorizedRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: `Access denied: Requires one of the following roles: ${roles.join(', ')}` });
    }

    next();
  };
};

module.exports = authorizedRoles;