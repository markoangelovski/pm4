import Link from "next/link";
import { routes } from "@/lib/routes";

type FooterLink = {
  title: string;
  href: string;
};

const footerLinks: FooterLink[] = [
  { title: "Terms and Conditions", href: routes.termsAndConditions },
  { title: "Privacy", href: routes.privacy }
];

export default function Footer() {
  return (
    <div className="flex md:flex-row flex-col items-center justify-between gap-3 text-center">
      <p className="text-sm text-muted-foreground">
        © 2026 by{" "}
        <Link
          href={routes.landing}
          className="hover:text-primary text-muted-foreground"
        >
          PM4
        </Link>
        , better project management for you.
      </p>

      <div className="flex gap-4">
        {footerLinks.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="text-sm hover:text-primary text-muted-foreground"
          >
            {item.title}
          </Link>
        ))}
      </div>
    </div>
  );
}
