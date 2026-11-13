import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { LandingThemeToggle } from "@/features/landing/components/landing-theme-toggle";
import { routes } from "@/lib/routes";

/** The controller's contact address (OQ-275). */
export const LEGAL_EMAIL = "pm4@angelovski.top";

/** A `mailto:` link to the contact address (FR-LEGAL-001: every email address is a link). */
export function LegalEmail() {
  return <LegalLink href={`mailto:${LEGAL_EMAIL}`}>{LEGAL_EMAIL}</LegalLink>;
}

/** An inline link in the legal text: external URLs open in a new tab, internal ones are app links. */
export function LegalLink({
  href,
  children
}: {
  href: string;
  children: ReactNode;
}) {
  const className =
    "font-medium text-foreground underline underline-offset-4 hover:text-primary";
  if (href.startsWith("/")) {
    return (
      <Link href={href} className={className}>
        {children}
      </Link>
    );
  }
  const external = href.startsWith("http");
  return (
    <a
      href={href}
      className={className}
      {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
    >
      {children}
    </a>
  );
}

/** One titled section of the legal text. */
export function LegalSection({
  title,
  children
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-lg font-semibold tracking-tight text-foreground">
        {title}
      </h2>
      {children}
    </section>
  );
}

/** A bulleted list in the legal text. */
export function LegalList({ children }: { children: ReactNode }) {
  return <ul className="flex list-disc flex-col gap-2 pl-5">{children}</ul>;
}

/**
 * The frame of SCR-080 and SCR-081 (FR-LEGAL-001/002): a header with the logo (home) and the light/dark
 * switch, the title and "Last updated" date, the text, and a footer linking the other page and home
 * (FR-LEGAL-003). Static: no API call, no user data.
 */
export function LegalPage({
  title,
  lastUpdated,
  other,
  children
}: {
  title: string;
  /** As written in the text, e.g. "13 November 2026". */
  lastUpdated: string;
  /** The other legal page, linked in the footer. */
  other: { href: string; label: string };
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <header className="border-b border-border">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link
            href={routes.landing}
            className="flex items-center gap-2"
            aria-label="PM4 home"
          >
            <Image
              src="/images/logos/logoicon.svg"
              alt=""
              width={28}
              height={28}
              className="size-7"
            />
            <span className="text-base font-semibold tracking-tight">PM4</span>
          </Link>
          <LandingThemeToggle />
        </div>
      </header>

      <main className="flex-1">
        <article className="mx-auto flex max-w-3xl flex-col gap-8 px-4 py-10 text-sm leading-relaxed text-muted-foreground sm:px-6 sm:py-14 sm:text-base">
          <div className="flex flex-col gap-2">
            <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              {title}
            </h1>
            <p>Last updated: {lastUpdated}</p>
          </div>
          {children}
        </article>
      </main>

      <footer className="border-t border-border">
        <nav
          aria-label="Footer"
          className="mx-auto flex max-w-3xl flex-wrap gap-x-6 gap-y-2 px-4 py-8 text-sm text-muted-foreground sm:px-6"
        >
          <Link
            href={other.href}
            className="transition-colors hover:text-foreground"
          >
            {other.label}
          </Link>
          <Link
            href={routes.landing}
            className="transition-colors hover:text-foreground"
          >
            Home
          </Link>
        </nav>
      </footer>
    </div>
  );
}
