import Link from "next/link";

const FullLogo = () => {
  return (
    <Link
      href="/"
      className="flex items-center gap-2 max-w-[40px] lg:max-w-[120px] overflow-hidden"
    >
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary text-sm font-bold text-primary-foreground">
        P4
      </span>
      <span className="hidden lg:inline text-lg font-semibold text-foreground">
        PM4
      </span>
    </Link>
  );
};

export default FullLogo;
