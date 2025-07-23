import Badges from "../components/badges";
import ManageBadges from "../components/manage_badges";
import { usePermissions } from "../permissions";

function BadgesPage() {
  const { hasAccess } = usePermissions();
  return (
    <>{hasAccess("org:learning:manage") ? <ManageBadges /> : <Badges />}</>
  );
}

export default BadgesPage;
