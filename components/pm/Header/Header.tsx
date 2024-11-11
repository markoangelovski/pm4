import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Fragment } from "react";

const Header = ({ breadcrumbs }: { breadcrumbs: string[] }) => {
  return (
    <header className="sticky top-0 flex h-14 shrink-0 items-center gap-2 bg-background">
      <div className="flex flex-1 items-center gap-2 px-3">
        <SidebarTrigger />
        <Separator orientation="vertical" className="mr-2 h-4" />
        <Breadcrumb>
          <BreadcrumbList>
            {breadcrumbs.map((breadcrumb, i) => (
              <Fragment key={i}>
                <BreadcrumbItem key={i}>
                  <BreadcrumbPage className="line-clamp-1">
                    {breadcrumb}
                  </BreadcrumbPage>
                </BreadcrumbItem>
                {/* Add a separator if it's not the last item */}
                {i !== breadcrumbs.length - 1 && (
                  <Separator orientation="vertical" className="mr-2 h-4" />
                )}
              </Fragment>
            ))}
          </BreadcrumbList>
        </Breadcrumb>
      </div>
    </header>
  );
};

export default Header;
