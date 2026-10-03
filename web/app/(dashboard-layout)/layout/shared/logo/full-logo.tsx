import Image from "next/image";
import Link from "next/link";
import { routes } from "@/lib/routes";

const FullLogo = ({ compact = false }: { compact?: boolean }) => {
  return (
    <Link
      href={routes.app.dashboard}
      aria-label="PM4"
      className="flex min-w-0 items-center gap-2"
    >
      <Image
        src="/images/logos/logoicon.svg"
        alt=""
        width={32}
        height={32}
        className="size-8 shrink-0"
      />
      {!compact && (
        <span className="flex min-w-0 flex-col leading-tight group-data-[state=collapsed]:hidden">
          <span className="truncate text-base font-semibold text-foreground">
            PM4
          </span>
          <span className="truncate text-xs text-muted-foreground">
            Project management
          </span>
        </span>
      )}
    </Link>
  );
};

export default FullLogo;
