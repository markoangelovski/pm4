---
id: req-legal
title: Privacy policy and terms
status: review
owner: Marko Angelovski
last_updated: 2026-11-13
related: [req-auth, req-landing, sec, api-data-model, web-screens, web-routing, OQ-275, OQ-276, OQ-277, OQ-278, OQ-279, OQ-280, OQ-281, OQ-282]
---

# Privacy policy and terms

## Purpose
Google's OAuth consent screen needs a public **privacy policy** and **terms of service** before the app can be
published, and the GDPR requires telling users what PM4 does with their personal data (Art. 13). This spec holds
both pages' requirements and their **approved text**: the pages render this text as written (OQ-275).

## Scope
**In:** two public static pages, `/privacy` (SCR-080) and `/terms` (SCR-081); links to them from the landing page
footer and from sign-in (OQ-276). English only.
**Out:** a cookie banner (PM4 keeps only what it needs to work in the browser, see the policy's *Browser storage*), a
self-serve data export (on request by email, OQ-279), translations, a legal notice (imprint) page.

## Requirements

### FR-LEGAL-001: Privacy policy page
**Priority:** Must
**Statement:** `/privacy` is a public static page with the text of *Privacy policy text* below: the title, the
"Last updated" date, then the sections in order. Every email address is a `mailto:` link and every URL a link.
**Rules:** As FR-LAND-001: static, no API call, no user data, renders when the API is down, follows the theme.
Like every page, it carries `noindex` (FR-LAND-003); Google's reviewers open it from the consent screen's link.
**Acceptance criteria:**
- Given I'm signed out, when I open `/privacy`, then I see the privacy policy, not a redirect.
- Given the API is down, when I open `/privacy`, then the page content still renders.
- The page names the controller, the contact email, every service provider in *Who processes your data*, and the
  Croatian supervisory authority.

### FR-LEGAL-002: Terms page
**Priority:** Must
**Statement:** `/terms` is a public static page with the text of *Terms text* below, under the same rules as FR-LEGAL-001.
**Acceptance criteria:**
- Given I'm signed out, when I open `/terms`, then I see the terms, not a redirect.

### FR-LEGAL-003: Links to the pages
**Priority:** Must
**Statement:** The landing page footer links **Privacy** (`/privacy`) and **Terms** (`/terms`). The sign-in screen
(SCR-001) shows, under "Continue with Google": "By continuing, you agree to the [Terms] and acknowledge the
[Privacy policy]." Each page links to the other and back to the home page `/`.
**Acceptance criteria:**
- Given I'm on `/`, then the footer links to `/privacy` and `/terms`.
- Given I'm on `/auth/sign-in`, then I see the line with links to `/terms` and `/privacy`.

## Privacy policy text

> **Privacy policy**
>
> Last updated: 13 November 2026
>
> PM4 is a personal, non-commercial project management and time tracking app. This policy explains what personal
> data PM4 processes, why, and what your rights are under the EU General Data Protection Regulation (GDPR).
>
> **Who is responsible**
>
> The controller of your personal data is Marko Angelovski, a private individual based in Croatia. PM4 is not
> operated by a company. For anything about your data, write to pm4@angelovski.top.
>
> **What data PM4 processes**
>
> - **Your Google account details:** when you sign in with Google, PM4 receives your Google account ID, your email
>   address, your name and the address of your profile picture. PM4 asks Google only for these basic details
>   (`openid`, `email` and `profile`). It has no access to your Gmail, Drive, Calendar or any other Google data.
> - **What you enter in PM4:** projects, tasks, services, workdays and their start times, time logs with their notes,
>   bookings, notes, to-dos, and your settings (time zone and daily target).
> - **Integration details:** if you connect a PMSPA account, PM4 stores its URL, your PMSPA email and your PMSPA
>   password (encrypted), plus the links between PM4 and PMSPA records.
> - **Technical data:** your IP address while you use PM4. It is used to limit repeated sign-in attempts, and is
>   kept for that purpose for at most one minute. The PM4 server also keeps logs for troubleshooting and security,
>   which may include your IP address and the requests your browser sends; they are kept for at most 10 days. Your
>   session is kept with sign-in tokens (see *Browser storage*).
>
> PM4 has no analytics, advertising or tracking, and doesn't sell or share your data with anyone for their own purposes.
>
> **Why, and on what legal basis**
>
> - To give you your account and the features you use: GDPR Art. 6(1)(b), performance of the agreement in the Terms.
> - To keep PM4 secure and working (sessions, limiting repeated requests, preventing abuse, server logs for
>   troubleshooting): GDPR Art. 6(1)(f), the legitimate interest in running a secure, reliable service.
>
> PM4 makes no automated decisions about you that have legal or similarly significant effects.
>
> **What other PM4 users can see**
>
> Everything you enter is private to your account. The one exception: other PM4 users can find you by your name when
> they choose a project lead, and then see your name and profile picture. They never see your email address, and
> naming you as a lead gives them no access to your data and you no access to theirs.
>
> **Who processes your data**
>
> PM4 runs on the following services. They process data only to provide their service to PM4:
>
> - **Google** (Google Ireland Ltd. / Google LLC): sign-in with Google. Your profile picture is loaded from Google's servers.
> - **Microsoft** (Azure App Service, West Europe region, the Netherlands): runs the PM4 server.
> - **Neon** (Neon Inc., on AWS in Frankfurt, Germany): the database that stores your account and your PM4 data.
> - **Redis** (Redis Ltd., Redis Cloud on AWS in Frankfurt, Germany): short-lived session and security data, and the
>   cached PMSPA sign-in if you connected one.
> - **GitHub** (GitHub Inc.): hosts the PM4 website, the pages your browser loads. Like any web host, it receives
>   your IP address when your browser loads them.
>
> Your PM4 data is stored in the EU. Some of these providers are based in the United States and may access data from
> there; such transfers are covered by the EU–US Data Privacy Framework or the European Commission's Standard
> Contractual Clauses.
>
> If you connect PMSPA, PM4 sends the data you choose to sync to the PMSPA server you entered, when you ask it to.
> That server is operated by its own provider, under its own terms.
>
> **Google user data**
>
> PM4's use and transfer of information received from Google APIs adheres to the
> [Google API Services User Data Policy](https://developers.google.com/terms/api-services-user-data-policy),
> including the Limited Use requirements. Your Google details are used only to sign you in and to show your name and
> picture in PM4.
>
> **How long data is kept**
>
> - Your account and everything in it: until you delete it, or delete your account. Deleting is permanent: there is
>   no recycle bin.
> - Sessions: they end when you sign out, or after 30 days without use.
> - IP addresses for limiting sign-in attempts: at most one minute.
> - Server logs: at most 10 days.
> - Backups: the database provider keeps a short restore history. Deleted data disappears from it within 7 days.
>
> **Browser storage**
>
> PM4 uses no cookies. It keeps your sign-in token and a few display preferences (such as the theme) in your
> browser's local storage, because PM4 can't work without them. They aren't used to track you, so no consent banner
> is needed.
>
> **Deleting your account**
>
> You can delete your account at any time from your profile in PM4 (Profile → Delete account). This permanently
> deletes your account and all of its data, signs you out everywhere, and removes your name from projects of other
> users that named you as their lead. Data in an external app such as PMSPA isn't affected.
>
> **Your rights**
>
> Under the GDPR you have the right to access your data, to correct it, to have it deleted, to restrict or object to
> its processing, and to receive a copy of it in a machine-readable format (data portability). To use any of these
> rights, write to pm4@angelovski.top. You'll get an answer within one month.
>
> You also have the right to lodge a complaint with a data protection authority. In Croatia, that is the Croatian
> Personal Data Protection Agency (Agencija za zaštitu osobnih podataka, AZOP, [azop.hr](https://azop.hr)). You can
> also contact the authority in the EU country where you live.
>
> **Children**
>
> PM4 is not meant for anyone under 16.
>
> **Changes to this policy**
>
> If this policy changes, the date at the top changes. If a change affects how your data is used, users will be told
> by email or in the app before it takes effect.

## Terms text

> **Terms of service**
>
> Last updated: 12 November 2026
>
> These terms apply to your use of PM4, a personal, non-commercial project management and time tracking app run by
> Marko Angelovski, a private individual based in Croatia ("I", "me"). By signing in, you agree to them.
>
> **The service**
>
> PM4 is free. It is a personal project, offered as it is and as available, without any guarantee that it will be
> available at all times, free of errors, or suitable for a particular purpose. Features can change. Access is by
> invitation: only invited Google accounts can sign in.
>
> **Your account**
>
> You sign in with your Google account and must be at least 16 years old. Keep your Google account secure: whoever
> can sign in to it can use your PM4 account.
>
> **Your content**
>
> What you enter in PM4 stays yours. You give me only the permission needed to store and process it so that PM4 works
> for you, as described in the [Privacy policy](/privacy). You are responsible for what you enter, and for having the
> right to enter it.
>
> Other PM4 users can find you by name when they choose a project lead and then see your name and profile picture,
> as described in the Privacy policy.
>
> **Acceptable use**
>
> Don't use PM4 for anything unlawful, don't try to access other users' data, and don't disrupt or overload the
> service (for example by automated requests).
>
> **Integrations**
>
> If you connect an external app such as PMSPA, you need the right to use that account, and that app's own terms
> apply to it. PM4 sends data to it only when you ask it to.
>
> **Ending**
>
> You can stop using PM4 and delete your account at any time from your profile. I may suspend or close an account
> that breaks these terms. I may stop running PM4; if I do, I'll tell users by email at least 30 days ahead, so you
> can copy what you need.
>
> **Liability**
>
> Since PM4 is free, I'm liable only for damage caused intentionally or by gross negligence, and for any liability
> that can't be limited by law (such as injury to life, body or health). Keep your own copies of anything important.
>
> **Changes to these terms**
>
> If these terms change, the date at the top changes. Significant changes will be announced by email or in the app
> before they take effect. If you don't agree with them, you can delete your account.
>
> **Law**
>
> These terms are governed by the law of the Republic of Croatia. If you are a consumer living in another EU country,
> you also keep the protection of the mandatory rules of that country. Questions: pm4@angelovski.top.

## Open questions
— (OQ-275…OQ-282 resolved)

## Changelog
- 2026-11-12: Initial draft: FR-LEGAL-001…003 and both texts (OQ-275, OQ-276, OQ-279). Ready for the owner's review.
- 2026-11-13: The privacy policy names the server logs (IP addresses possible, kept at most 10 days) under *Technical
  data*, the Art. 6(1)(f) basis and *How long data is kept* (OQ-282).
- 2026-11-13: The contact address is `pm4@angelovski.top`, a PM4-only address, so the owner's personal address isn't
  published on the pages or in the repo (owner).
