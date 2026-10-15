/**
 * Twin of `lib/routes.ts` for the UI prototype (specs/04-web/prototype.md): same names, app screens under
 * `/proto/app`. Screens without a prototype twin yet (Settings, User profile) point at the real app.
 * Never promoted: promoted components import `routes` from `@/lib/routes` unchanged.
 */
export const routes = {
  landing: "/",
  signIn: "/auth/sign-in",
  authCallback: "/auth/callback",
  app: {
    dashboard: "/proto/app",
    time: "/proto/app/time",
    bookings: "/proto/app/bookings",
    projects: "/proto/app/projects",
    project: "/proto/app/project",
    tasks: "/proto/app/tasks",
    task: "/proto/app/task",
    settings: "/app/settings",
    userProfile: "/app/user-profile"
  }
} as const;
