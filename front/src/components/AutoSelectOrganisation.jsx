import { useEffect } from "react";
import { useOrganizationList, useOrganization } from "@clerk/clerk-react";

const AutoSelectOrganization = () => {
  const { organizationList, setActive, isLoaded } = useOrganizationList();
  const { membership } = useOrganization();

  useEffect(() => {
    if (isLoaded && !membership && organizationList?.length > 0) {
      const defaultOrg = organizationList[0];
      setActive({ organization: defaultOrg.organization.id });
    }
  }, [organizationList, membership, isLoaded, setActive]);

  useEffect(() => {}, [membership]);

  return null;
};

export default AutoSelectOrganization;
