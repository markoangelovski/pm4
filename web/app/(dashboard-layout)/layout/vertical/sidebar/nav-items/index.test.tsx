import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import NavItem from "./index";

describe("NavItem", () => {
  it("renders the hover highlight layer with correct classes", () => {
    const { container } = render(
      <NavItem
        item={{ name: "Projects", url: "/app/projects" }}
        hasChildren={false}
      />
    );

    const hoverBg = container.querySelector('[data-slot="nav-hover-bg"]');
    expect(hoverBg).toBeInTheDocument();
    expect(hoverBg).toHaveAttribute("aria-hidden", "true");

    // Check for required classes
    expect(hoverBg).toHaveClass("bg-primary/5");
    expect(hoverBg).toHaveClass("rounded-lg");
    expect(hoverBg).toHaveClass("opacity-0");
    expect(hoverBg).toHaveClass("group-hover/item:opacity-100");
    expect(hoverBg).toHaveClass("motion-reduce:transition-none");
  });

  it("renders the root element with group/item and without group or hover:bg-primary/5", () => {
    const { container } = render(
      <NavItem
        item={{ name: "Projects", url: "/app/projects" }}
        hasChildren={false}
      />
    );

    const root = container.querySelector("div");
    expect(root).toHaveClass("group/item");
    expect(root).not.toHaveClass("group");
    expect(root).not.toHaveClass("hover:bg-primary/5");
  });

  it("renders with isActive, root has bg-primary and contains the layer", () => {
    const { container } = render(
      <NavItem
        item={{ name: "Projects", url: "/app/projects" }}
        hasChildren={false}
        isActive={true}
      />
    );

    const root = container.querySelector("div");
    expect(root).toHaveClass("bg-primary");

    const hoverBg = container.querySelector('[data-slot="nav-hover-bg"]');
    expect(hoverBg).toBeInTheDocument();
  });
});
