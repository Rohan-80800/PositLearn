const permissions = {
    roles: {
      ADMIN: [
        "create_user",
        "delete_user",
        "view_users",
        "role_user",
        "view_user_performance",

      "create_team",
      "update_team",
      "delete_team",
      "view_teams",

      "create_project",
      "update_project",
      "delete_project",
      "view_projects",

      "create_module",
      "update_module",
      "delete_module",
      "view_modules",

      "update_progress",
      "complete_video",
      "upload_file",
      "view_stats",
      "submit_notebook",

      "view_validators",
      "create_validator",
      "update_validator",
      "delete_validator",

      "create_discussion",
      "view_discussions",
      "update_discussion",
      "delete_discussion",

      "create_comment",
      "update_comment",
      "delete_comment",

      "create_reply",
      "update_reply",
      "delete_reply",

      "create_badge",
      "view_badges",
      "delete_badges",
      "update_badges",
      "view_all_badges",

        "generate_quiz",
        "create_quiz",
        "update_quiz",
        "fetch_quiz",
        "delete_quiz",
        "fetch_project",
        "fetch_module",

        "view_cheet",
        "create_cheet",
        "update_cheet",
        "delete_cheet",

        "view_intent",
        "create_intent",
        "update_intent",
        "delete_intent",

        "get_user_dashboard",
        "team_wise_progress",
      ],
      EMPLOYEE: [
        "create_user",

      "create_team",
      "update_team",
      "delete_team",
      "view_teams",

      "create_project",
      "update_project",
      "delete_project",
      "view_projects",

      "create_module",
      "update_module",
      "delete_module",
      "view_modules",

      "update_progress",
      "complete_video",
      "upload_file",
      "view_stats",
      "submit_notebook",

      "view_validators",
      "create_validator",
      "update_validator",
      "delete_validator",

      "view_users",

      "create_discussion",
      "view_discussions",
      "update_discussion",
      "delete_discussion",

      "create_comment",
      "update_comment",
      "delete_comment",

      "create_reply",
      "update_reply",
      "delete_reply",

      "create_badge",
      "view_badges",
      "delete_badges",
      "update_badges",
      "view_all_badges",
      "mark_badge_notified",

        "fetch_quiz",

        "view_cheet",
        "create_cheet",
        "update_cheet",
        "delete_cheet",

      "send_certificate_email",

      "fetchdynamic_quiz",
      "fetch_quiz_id",
      "fetch_quiz_progress",
      "check_eligibility",
      "submit_quiz",
      "complete_quiz",
      "share_certificate",
    ],
    INTERN: [
      "create_user",
      "view_teams",
      "view_projects",
      "view_modules",
      "upload_file",
      "view_stats",
      "complete_video",
      "update_progress",
      "submit_notebook",
      "view_validators",
      "view_users",
      "create_discussion",
      "view_discussions",
      "update_discussion",
      "create_comment",
      "update_comment",
      "create_reply",
      "update_reply",
      "view_badges",
      "fetch_quiz",
      "view_cheet",
      "send_certificate_email",
      "mark_badge_notified",
      "fetchdynamic_quiz",
      "fetch_quiz_id",
      "fetch_quiz_progress",
      "check_eligibility",
      "submit_quiz",
      "complete_quiz",
      "share_certificate",
    ],
  },
  hasPermission(role, action) {
    return this.roles[role]?.includes(action) || false;
  },
};

export default permissions;
