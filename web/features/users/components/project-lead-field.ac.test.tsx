import { beforeEach, describe, expect, it, vi } from "vitest";
import { useState, type ReactNode } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor
} from "@testing-library/react";
import { createQueryClient } from "@/lib/query-client";
import type { Me } from "@/features/users/api";
import type { components } from "@/lib/api/schema";
import type { LeadValue } from "@/features/users/lead";
import { ProjectLeadField } from "./project-lead-field";

const GET = vi.hoisted(() => vi.fn());

vi.mock("@/lib/api/client", () => ({
  apiClient: { GET }
}));

const me: Me = {
  id: "0b6c7d2e-1f3a-4c5b-9d8e-7f6a5b4c3d2e",
  email: "marko@example.com",
  displayName: "Marko Angelovski",
  avatarUrl: null,
  timeZone: "Europe/Zagreb",
  createdAt: "2026-10-02T22:30:00.000Z"
};

const found: components["schemas"]["UserSummaryDto"][] = [
  {
    id: "1d0c7d2e-1f3a-4c5b-9d8e-7f6a5b4c3d2e",
    displayName: "Ana Horvat",
    email: "ana@example.com",
    avatarUrl: null
  },
  {
    id: "2d0c7d2e-1f3a-4c5b-9d8e-7f6a5b4c3d2e",
    displayName: "Ivana Novak",
    email: "ivana@example.com",
    avatarUrl: null
  }
];

const ok = () => new Response(null, { status: 200 });

/** GET router: /me → me; /users → the search results. */
function routeGet() {
  GET.mockImplementation(async (path: string) => {
    if (path === "/api/v1/me") return { data: me, response: ok() };
    if (path === "/api/v1/users") return { data: { items: found }, response: ok() };
    throw new Error(`unexpected GET ${path}`);
  });
}

const searchCalls = () =>
  GET.mock.calls.filter(([path]) => path === "/api/v1/users");

function renderField(initial: LeadValue = null) {
  const onChange = vi.fn();
  function Harness() {
    const [value, setValue] = useState<LeadValue>(initial);
    return (
      <>
        <ProjectLeadField
          id="lead"
          value={value}
          onChange={(next) => {
            onChange(next);
            setValue(next);
          }}
        />
        <button type="button">elsewhere</button>
      </>
    );
  }
  const queryClient = createQueryClient();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  render(<Harness />, { wrapper });
  return { onChange, input: screen.getByRole("combobox") as HTMLInputElement };
}

/** Types into the box, then opens the list (jsdom doesn't open it on input). */
function type(input: HTMLInputElement, text: string) {
  fireEvent.focus(input);
  fireEvent.change(input, { target: { value: text } });
  fireEvent.keyDown(input, { key: "ArrowDown" });
}

/** Option texts; a user option's text also holds its avatar initials and email. */
const options = () =>
  screen.queryAllByRole("option").map((o) => o.textContent ?? "");

describe("ProjectLeadField (feat-prj-web)", () => {
  beforeEach(() => {
    GET.mockReset();
    routeGet();
  });

  it("AC-7 FR-PRJ-006: empty → me (me); 1 char → only Use; 2 chars → one debounced search, users then Use", async () => {
    const { input } = renderField();
    await waitFor(() =>
      expect(GET).toHaveBeenCalledWith("/api/v1/me", expect.anything())
    );

    fireEvent.keyDown(input, { key: "ArrowDown" });
    await waitFor(() => expect(options()).toHaveLength(1));
    expect(options()[0]).toMatch(/Marko Angelovski\s*\(me\)/);

    type(input, "a");
    await waitFor(() => expect(options()).toEqual(['Use "a"']));

    type(input, "an");
    await waitFor(() => expect(options()).toHaveLength(3), { timeout: 2000 });
    expect(options()[0]).toMatch(/Ana Horvat.*ana@example\.com/);
    expect(options()[1]).toMatch(/Ivana Novak.*ivana@example\.com/);
    expect(options()[2]).toBe('Use "an"');
    expect(searchCalls()).toHaveLength(1);
    expect(searchCalls()[0][1]).toEqual(
      expect.objectContaining({ params: { query: { q: "an" } } })
    );
  });

  it("AC-8 FR-PRJ-006: pick a user, pick Use, blur keeps typed text, clearing the box or the clear button → null", async () => {
    const { input, onChange } = renderField();

    type(input, "an");
    const ana = await screen.findByRole(
      "option",
      { name: /Ana Horvat/ },
      { timeout: 2000 }
    );
    fireEvent.click(ana);
    await waitFor(() =>
      expect(onChange).toHaveBeenLastCalledWith({
        kind: "user",
        user: expect.objectContaining({
          id: found[0].id,
          displayName: "Ana Horvat"
        })
      })
    );
    expect(input.value).toBe("Ana Horvat");

    type(input, "an");
    fireEvent.click(await screen.findByRole("option", { name: 'Use "an"' }));
    await waitFor(() =>
      expect(onChange).toHaveBeenLastCalledWith({ kind: "text", name: "an" })
    );

    type(input, "Bob");
    fireEvent.blur(input);
    await waitFor(() =>
      expect(onChange).toHaveBeenLastCalledWith({ kind: "text", name: "Bob" })
    );

    type(input, "");
    fireEvent.blur(input);
    await waitFor(() => expect(onChange).toHaveBeenLastCalledWith(null));

    type(input, "Carol");
    fireEvent.blur(input);
    await waitFor(() =>
      expect(onChange).toHaveBeenLastCalledWith({ kind: "text", name: "Carol" })
    );
    onChange.mockClear();
    act(() => {
      fireEvent.click(
        screen.getByRole("button", { name: "Clear project lead" })
      );
    });
    await waitFor(() => expect(onChange).toHaveBeenLastCalledWith(null));
    expect(input.value).toBe("");
  });
});
