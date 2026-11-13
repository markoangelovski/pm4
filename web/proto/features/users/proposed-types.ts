/**
 * API shapes the Profile's Delete account and the lead picker need that `schema.d.ts` doesn't have yet
 * (feat-acct-api). `npm run api:types` replaces them once the API ships.
 */

/** API-USR-003's item: a user as shown in the lead picker; never the email (OQ-277). */
export type UserSummaryDto = {
  id: string;
  displayName: string;
  avatarUrl: string | null;
};

/** API-USR-004: `DELETE /api/v1/me` → 204, the account and all of its data are gone (FR-AUTH-008). */
export type DeleteMeOperation = {
  parameters: {
    query?: never;
    header?: never;
    path?: never;
    cookie?: never;
  };
  requestBody?: never;
  responses: {
    204: { headers: { [name: string]: unknown }; content?: never };
    401: {
      headers: { [name: string]: unknown };
      content: { "application/problem+json": unknown };
    };
  };
};
