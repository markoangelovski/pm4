/** Every internal route (routing.md). No trailing slashes (`trailingSlash: false`, OQ-050). */
export const routes = {
  landing: "/",
  signIn: "/auth/sign-in",
  authCallback: "/auth/callback",
  // Legal pages: linked from the app footer, no page yet (OQ-055).
  termsAndConditions: "/terms-and-conditions",
  privacy: "/privacy",
  app: {
    dashboard: "/app",
    time: "/app/time",
    projects: "/app/projects",
    project: "/app/project",
    tasks: "/app/tasks",
    task: "/app/task",
    trash: "/app/trash",
    settings: "/app/settings"
  }
} as const;

/** Prefix of every private route below the dashboard (`routes.app.dashboard` itself is private too). */
export const APP_PREFIX = "/app/";
