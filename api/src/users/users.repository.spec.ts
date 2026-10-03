import { Test, TestingModule } from "@nestjs/testing";
import { DRIZZLE } from "../database/drizzle.js";
import type { GoogleProfile } from "../auth/google-oidc.js";
import {
  avatarUrlFrom,
  displayNameFrom,
  UsersRepository
} from "./users.repository.js";

describe("UsersRepository", () => {
  let repository: UsersRepository;
  let rows: unknown[];

  beforeEach(async () => {
    rows = [];
    const query = {
      select: () => query,
      from: () => query,
      where: () => query,
      orderBy: () => query,
      limit: () => Promise.resolve(rows)
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [UsersRepository, { provide: DRIZZLE, useValue: query }]
    }).compile();

    repository = module.get<UsersRepository>(UsersRepository);
  });

  it("findById returns the row", async () => {
    rows = [{ id: "user-1" }];
    await expect(repository.findById("user-1")).resolves.toEqual({
      id: "user-1"
    });
  });

  it("findById returns null when there is no row", async () => {
    await expect(repository.findById("missing")).resolves.toBeNull();
  });

  it("findLeadUser returns the id and display name", async () => {
    rows = [{ id: "user-1", displayName: "Ada" }];
    await expect(repository.findLeadUser("user-1")).resolves.toEqual({
      id: "user-1",
      displayName: "Ada"
    });
  });

  it("findLeadUser returns null when there is no row", async () => {
    await expect(repository.findLeadUser("missing")).resolves.toBeNull();
  });

  it("search returns the matching summaries", async () => {
    rows = [{ id: "user-1", displayName: "Ana" }];
    await expect(repository.search("an", "caller", 10)).resolves.toEqual(rows);
  });
});

describe("Google profile mapping (D12)", () => {
  const base: GoogleProfile = {
    subject: "sub",
    email: "ada.lovelace@example.com",
    emailVerified: true,
    name: "  Ada Lovelace  ",
    picture: "https://lh3.googleusercontent.com/a/ada"
  };

  it("trims the name and cuts it to 100 chars", () => {
    expect(displayNameFrom(base)).toBe("Ada Lovelace");
    expect(displayNameFrom({ ...base, name: "x".repeat(150) })).toHaveLength(
      100
    );
  });

  it("falls back to the email's local part for an empty or missing name", () => {
    expect(displayNameFrom({ ...base, name: "   " })).toBe("ada.lovelace");
    expect(displayNameFrom({ ...base, name: null })).toBe("ada.lovelace");
  });

  it("keeps only https:// pictures of ≤ 500 chars", () => {
    expect(avatarUrlFrom(base)).toBe(base.picture);
    expect(
      avatarUrlFrom({ ...base, picture: "http://x.test/a.png" })
    ).toBeNull();
    expect(avatarUrlFrom({ ...base, picture: null })).toBeNull();
    expect(
      avatarUrlFrom({ ...base, picture: `https://x.test/${"a".repeat(500)}` })
    ).toBeNull();
  });
});
