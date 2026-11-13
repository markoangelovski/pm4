import { routes } from "@/lib/routes";
import {
  LegalEmail,
  LegalLink,
  LegalList,
  LegalPage,
  LegalSection
} from "./legal-page";

/** SCR-080: req-legal's *Privacy policy text*, as written (FR-LEGAL-001). */
export function PrivacyPolicy() {
  return (
    <LegalPage
      title="Privacy policy"
      lastUpdated="13 November 2026"
      other={{ href: routes.terms, label: "Terms of service" }}
    >
      <p>
        PM4 is a personal, non-commercial project management and time tracking
        app. This policy explains what personal data PM4 processes, why, and
        what your rights are under the EU General Data Protection Regulation
        (GDPR).
      </p>

      <LegalSection title="Who is responsible">
        <p>
          The controller of your personal data is Marko Angelovski, a private
          individual based in Croatia. PM4 is not operated by a company. For
          anything about your data, write to <LegalEmail />.
        </p>
      </LegalSection>

      <LegalSection title="What data PM4 processes">
        <LegalList>
          <li>
            <strong className="text-foreground">
              Your Google account details:
            </strong>{" "}
            when you sign in with Google, PM4 receives your Google account ID,
            your email address, your name and the address of your profile
            picture. PM4 asks Google only for these basic details (
            <code>openid</code>, <code>email</code> and <code>profile</code>).
            It has no access to your Gmail, Drive, Calendar or any other Google
            data.
          </li>
          <li>
            <strong className="text-foreground">What you enter in PM4:</strong>{" "}
            projects, tasks, services, workdays and their start times, time logs
            with their notes, bookings, notes, to-dos, and your settings (time
            zone and daily target).
          </li>
          <li>
            <strong className="text-foreground">Integration details:</strong> if
            you connect a PMSPA account, PM4 stores its URL, your PMSPA email
            and your PMSPA password (encrypted), plus the links between PM4 and
            PMSPA records.
          </li>
          <li>
            <strong className="text-foreground">Technical data:</strong> your IP
            address while you use PM4. It is used to limit repeated sign-in
            attempts, and is kept for that purpose for at most one minute. The
            PM4 server also keeps logs for troubleshooting and security, which
            may include your IP address and the requests your browser sends;
            they are kept for at most 10 days. Your session is kept with sign-in
            tokens (see <em>Browser storage</em>).
          </li>
        </LegalList>
        <p>
          PM4 has no analytics, advertising or tracking, and doesn&apos;t sell
          or share your data with anyone for their own purposes.
        </p>
      </LegalSection>

      <LegalSection title="Why, and on what legal basis">
        <LegalList>
          <li>
            To give you your account and the features you use: GDPR Art.
            6(1)(b), performance of the agreement in the Terms.
          </li>
          <li>
            To keep PM4 secure and working (sessions, limiting repeated
            requests, preventing abuse, server logs for troubleshooting): GDPR
            Art. 6(1)(f), the legitimate interest in running a secure, reliable
            service.
          </li>
        </LegalList>
        <p>
          PM4 makes no automated decisions about you that have legal or
          similarly significant effects.
        </p>
      </LegalSection>

      <LegalSection title="What other PM4 users can see">
        <p>
          Everything you enter is private to your account. The one exception:
          other PM4 users can find you by your name when they choose a project
          lead, and then see your name and profile picture. They never see your
          email address, and naming you as a lead gives them no access to your
          data and you no access to theirs.
        </p>
      </LegalSection>

      <LegalSection title="Who processes your data">
        <p>
          PM4 runs on the following services. They process data only to provide
          their service to PM4:
        </p>
        <LegalList>
          <li>
            <strong className="text-foreground">Google</strong> (Google Ireland
            Ltd. / Google LLC): sign-in with Google. Your profile picture is
            loaded from Google&apos;s servers.
          </li>
          <li>
            <strong className="text-foreground">Microsoft</strong> (Azure App
            Service, West Europe region, the Netherlands): runs the PM4 server.
          </li>
          <li>
            <strong className="text-foreground">Neon</strong> (Neon Inc., on AWS
            in Frankfurt, Germany): the database that stores your account and
            your PM4 data.
          </li>
          <li>
            <strong className="text-foreground">Redis</strong> (Redis Ltd.,
            Redis Cloud on AWS in Frankfurt, Germany): short-lived session and
            security data, and the cached PMSPA sign-in if you connected one.
          </li>
          <li>
            <strong className="text-foreground">GitHub</strong> (GitHub Inc.):
            hosts the PM4 website, the pages your browser loads. Like any web
            host, it receives your IP address when your browser loads them.
          </li>
        </LegalList>
        <p>
          Your PM4 data is stored in the EU. Some of these providers are based
          in the United States and may access data from there; such transfers
          are covered by the EU–US Data Privacy Framework or the European
          Commission&apos;s Standard Contractual Clauses.
        </p>
        <p>
          If you connect PMSPA, PM4 sends the data you choose to sync to the
          PMSPA server you entered, when you ask it to. That server is operated
          by its own provider, under its own terms.
        </p>
      </LegalSection>

      <LegalSection title="Google user data">
        <p>
          PM4&apos;s use and transfer of information received from Google APIs
          adheres to the{" "}
          <LegalLink href="https://developers.google.com/terms/api-services-user-data-policy">
            Google API Services User Data Policy
          </LegalLink>
          , including the Limited Use requirements. Your Google details are used
          only to sign you in and to show your name and picture in PM4.
        </p>
      </LegalSection>

      <LegalSection title="How long data is kept">
        <LegalList>
          <li>
            Your account and everything in it: until you delete it, or delete
            your account. Deleting is permanent: there is no recycle bin.
          </li>
          <li>
            Sessions: they end when you sign out, or after 30 days without use.
          </li>
          <li>
            IP addresses for limiting sign-in attempts: at most one minute.
          </li>
          <li>Server logs: at most 10 days.</li>
          <li>
            Backups: the database provider keeps a short restore history.
            Deleted data disappears from it within 7 days.
          </li>
        </LegalList>
      </LegalSection>

      <LegalSection title="Browser storage">
        <p>
          PM4 uses no cookies. It keeps your sign-in token and a few display
          preferences (such as the theme) in your browser&apos;s local storage,
          because PM4 can&apos;t work without them. They aren&apos;t used to
          track you, so no consent banner is needed.
        </p>
      </LegalSection>

      <LegalSection title="Deleting your account">
        <p>
          You can delete your account at any time from your profile in PM4
          (Profile → Delete account). This permanently deletes your account and
          all of its data, signs you out everywhere, and removes your name from
          projects of other users that named you as their lead. Data in an
          external app such as PMSPA isn&apos;t affected.
        </p>
      </LegalSection>

      <LegalSection title="Your rights">
        <p>
          Under the GDPR you have the right to access your data, to correct it,
          to have it deleted, to restrict or object to its processing, and to
          receive a copy of it in a machine-readable format (data portability).
          To use any of these rights, write to <LegalEmail />. You&apos;ll get
          an answer within one month.
        </p>
        <p>
          You also have the right to lodge a complaint with a data protection
          authority. In Croatia, that is the Croatian Personal Data Protection
          Agency (Agencija za zaštitu osobnih podataka, AZOP,{" "}
          <LegalLink href="https://azop.hr">azop.hr</LegalLink>). You can also
          contact the authority in the EU country where you live.
        </p>
      </LegalSection>

      <LegalSection title="Children">
        <p>
          PM4 is not meant for anyone under 16. An account found to belong to
          someone under 16 is deleted, together with all of its data.
        </p>
      </LegalSection>

      <LegalSection title="Changes to this policy">
        <p>
          If this policy changes, the date at the top changes. If a change
          affects how your data is used, users will be told by email or in the
          app before it takes effect.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
