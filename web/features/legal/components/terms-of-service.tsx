import { routes } from "@/lib/routes";
import { LegalEmail, LegalLink, LegalPage, LegalSection } from "./legal-page";

/** SCR-081: req-legal's *Terms text*, as written (FR-LEGAL-002). */
export function TermsOfService() {
  return (
    <LegalPage
      title="Terms of service"
      lastUpdated="12 November 2026"
      other={{ href: routes.privacy, label: "Privacy policy" }}
    >
      <p>
        These terms apply to your use of PM4, a personal, non-commercial project
        management and time tracking app run by Marko Angelovski, a private
        individual based in Croatia (&ldquo;I&rdquo;, &ldquo;me&rdquo;). By
        signing in, you agree to them.
      </p>

      <LegalSection title="The service">
        <p>
          PM4 is free. It is a personal project, offered as it is and as
          available, without any guarantee that it will be available at all
          times, free of errors, or suitable for a particular purpose. Features
          can change. Access is by invitation: only invited Google accounts can
          sign in.
        </p>
      </LegalSection>

      <LegalSection title="Your account">
        <p>
          You sign in with your Google account and must be at least 16 years
          old. Keep your Google account secure: whoever can sign in to it can
          use your PM4 account.
        </p>
      </LegalSection>

      <LegalSection title="Your content">
        <p>
          What you enter in PM4 stays yours. You give me only the permission
          needed to store and process it so that PM4 works for you, as described
          in the <LegalLink href={routes.privacy}>Privacy policy</LegalLink>.
          You are responsible for what you enter, and for having the right to
          enter it.
        </p>
        <p>
          Other PM4 users can find you by name when they choose a project lead
          and then see your name and profile picture, as described in the
          Privacy policy.
        </p>
      </LegalSection>

      <LegalSection title="Acceptable use">
        <p>
          Don&apos;t use PM4 for anything unlawful, don&apos;t try to access
          other users&apos; data, and don&apos;t disrupt or overload the service
          (for example by automated requests).
        </p>
      </LegalSection>

      <LegalSection title="Integrations">
        <p>
          If you connect an external app such as PMSPA, you need the right to
          use that account, and that app&apos;s own terms apply to it. PM4 sends
          data to it only when you ask it to.
        </p>
      </LegalSection>

      <LegalSection title="Ending">
        <p>
          You can stop using PM4 and delete your account at any time from your
          profile. I may suspend or close an account that breaks these terms. I
          may stop running PM4; if I do, I&apos;ll tell users by email at least
          30 days ahead, so you can copy what you need.
        </p>
      </LegalSection>

      <LegalSection title="Liability">
        <p>
          Since PM4 is free, I&apos;m liable only for damage caused
          intentionally or by gross negligence, and for any liability that
          can&apos;t be limited by law (such as injury to life, body or health).
          Keep your own copies of anything important.
        </p>
      </LegalSection>

      <LegalSection title="Changes to these terms">
        <p>
          If these terms change, the date at the top changes. Significant
          changes will be announced by email or in the app before they take
          effect. If you don&apos;t agree with them, you can delete your
          account.
        </p>
      </LegalSection>

      <LegalSection title="Law">
        <p>
          These terms are governed by the law of the Republic of Croatia. If you
          are a consumer living in another EU country, you also keep the
          protection of the mandatory rules of that country. Questions:{" "}
          <LegalEmail />.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
