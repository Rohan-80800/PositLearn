import permissions from "../backend/permissions.js";

export const requirePermission = (action) => {
  return (req, res, next) => {
    let userRole = null;

    if (req.user?.o?.rol) {
      userRole = req.user.o.rol.toUpperCase();
    }
    if (!userRole || !permissions.hasPermission(userRole, action)) {
      return res.status(403).json({
        status: "error",
        data: null,
        message: "Access Denied: You don’t have permission",
      });
    }
    next();
  };
};
