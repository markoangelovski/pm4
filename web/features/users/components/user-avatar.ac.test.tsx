import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { act, render, screen } from "@testing-library/react";
import { UserAvatar, userInitials } from "./user-avatar";

// Base UI preloads the photo with `new window.Image()` and renders the <img> only once it has
// loaded. jsdom never loads images, so the test keeps each preloader and fires `load` itself.
const preloaders: HTMLImageElement[] = [];
const RealImage = window.Image;

beforeEach(() => {
  preloaders.length = 0;
  window.Image = class extends RealImage {
    constructor(width?: number, height?: number) {
      super(width, height);
      preloaders.push(this);
    }
  } as typeof window.Image;
});

afterEach(() => {
  window.Image = RealImage;
});

describe("userInitials (feat-shell-user-menu)", () => {
  it.each([
    ["Marko Angelovski", "MA"],
    ["ana maria lopez", "AM"],
    ["cher", "C"],
    ["  ", ""]
  ])("AC-3 SCR-005: %j → %j", (name, initials) => {
    expect(userInitials(name)).toBe(initials);
  });
});

describe("UserAvatar (feat-shell-user-menu)", () => {
  it("AC-4 SCR-005: with a photo → an img with that src and referrerpolicy no-referrer", () => {
    const src = "https://lh3.googleusercontent.com/a/photo";
    const { container } = render(
      <UserAvatar user={{ displayName: "Marko Angelovski", avatarUrl: src }} />
    );

    act(() => {
      for (const image of preloaders) image.dispatchEvent(new Event("load"));
    });

    const img = container.querySelector("img");
    expect(img).not.toBeNull();
    expect(img).toHaveAttribute("src", src);
    expect(img).toHaveAttribute("referrerpolicy", "no-referrer");
  });

  it("AC-4 SCR-005: no photo → the initials, no img", () => {
    const { container } = render(
      <UserAvatar user={{ displayName: "Marko Angelovski", avatarUrl: null }} />
    );

    expect(screen.getByText("MA")).toBeInTheDocument();
    expect(container.querySelector("img")).toBeNull();
  });

  it("AC-4 SCR-005: user still loading → no text", () => {
    const { container } = render(<UserAvatar user={undefined} />);

    expect(container).toHaveTextContent(/^$/);
  });
});
