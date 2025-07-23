import React from "react";
import { useUser, RedirectToSignIn } from "@clerk/clerk-react";
import { Navigate } from "react-router-dom";
import { usePermissions } from "../permissions";

const ProtectedRoute = ({
  children,
  requiredPermission,
  allowedRoles = [],
}) => {
  const { isSignedIn } = useUser();
  const { hasAccess, role } = usePermissions();

  if (!isSignedIn) {
    return <RedirectToSignIn />;
  }

  const hasPermission = requiredPermission
    ? hasAccess(requiredPermission)
    : true;
  const hasRoleAccess =
    allowedRoles.length > 0 ? allowedRoles.includes(role) : true;

  if (!hasPermission || !hasRoleAccess) {
    return <Navigate to="/access-denied" replace />;
  }

  return children;
};

export default ProtectedRoute;
