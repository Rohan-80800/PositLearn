import { useAuth } from "@clerk/clerk-react";

const Role = {
  Admin: "org:admin",
  Employee: "org:employee",
  Intern: "org:intern",
};

export function usePermissions() {
  const { has, orgId, orgRole} = useAuth();

  if (!orgId) {
    return {
      hasAccess: () => false,
      role: null,
    };
  }

  return {
    hasAccess: (permission) => has({ permission }),
    role: orgRole,
  };
}

export { Role };
