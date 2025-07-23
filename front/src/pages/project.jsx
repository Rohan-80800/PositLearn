import React from "react";
import Project_cards from "../components/project_cards";
import ManageProjects from "../components/manage_projects";
import { usePermissions } from "../permissions";

function Project() {
  const { hasAccess } = usePermissions();
  return (
    <>
      {hasAccess("org:learning:manage") ? (
        <ManageProjects />
      ) : (
        <Project_cards />
      )}
    </>
  );
}

export default Project;
