const requirePermission = (permission) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required.' });
    }

    // Admins bypass granular permission checks
    if (req.user.role === 'admin') {
      return next();
    }

    const userPermissions = req.user.permissions || [];
    if (!userPermissions.includes(permission)) {
      return res.status(403).json({
        message: `Forbidden: You do not have the required permission '${permission}' to perform this action.`
      });
    }

    next();
  };
};

module.exports = { requirePermission };
