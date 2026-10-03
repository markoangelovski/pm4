import { createHmac } from "node:crypto";
import { JwtModule } from "@nestjs/jwt";
import { Test, TestingModule } from "@nestjs/testing";
import { AccessTokenService } from "./access-token.service.js";

const SECRET = "unit-test-jwt-access-secret-0123456789abcdef";
const TTL = 900;

const b64 = (value: object) =>
  Buffer.from(JSON.stringify(value)).toString("base64url");

function hs256(payload: object, secret = SECRET): string {
  const unsigned = `${b64({ alg: "HS256", typ: "JWT" })}.${b64(payload)}`;
  const signature = createHmac("sha256", secret)
    .update(unsigned)
    .digest("base64url");
  return `${unsigned}.${signature}`;
}

describe("AccessTokenService", () => {
  let service: AccessTokenService;
  const now = () => Math.floor(Date.now() / 1000);

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        JwtModule.register({
          secret: SECRET,
          signOptions: { algorithm: "HS256", expiresIn: TTL },
          verifyOptions: { algorithms: ["HS256"] }
        })
      ],
      providers: [AccessTokenService]
    }).compile();

    service = module.get<AccessTokenService>(AccessTokenService);
  });

  it("signs an HS256 token with sub, iat and exp = iat + TTL", async () => {
    const before = now();
    const { token, expiresAt } = await service.sign("user-1");

    const [header, payload] = token
      .split(".")
      .slice(0, 2)
      .map(
        (part) =>
          JSON.parse(Buffer.from(part, "base64url").toString()) as Record<
            string,
            number | string
          >
      );
    const iat = payload.iat as number;
    const exp = payload.exp as number;
    expect(header.alg).toBe("HS256");
    expect(payload.sub).toBe("user-1");
    expect(exp - iat).toBe(TTL);
    expect(iat).toBeGreaterThanOrEqual(before);
    expect(expiresAt.getTime()).toBe(exp * 1000);
  });

  it("verifies its own token → the user id", async () => {
    const { token } = await service.sign("user-1");
    await expect(service.verify(token)).resolves.toBe("user-1");
  });

  it.each([
    ["malformed", () => "not-a-jwt"],
    [
      "signed with another secret",
      () =>
        hs256(
          { sub: "user-1", iat: now(), exp: now() + 60 },
          "another-secret-that-is-at-least-32-characters"
        )
    ],
    [
      "alg: none",
      () =>
        `${b64({ alg: "none", typ: "JWT" })}.${b64({ sub: "user-1", iat: now(), exp: now() + 60 })}.`
    ],
    [
      "expired",
      () => hs256({ sub: "user-1", iat: now() - 120, exp: now() - 60 })
    ],
    ["without sub", () => hs256({ iat: now(), exp: now() + 60 })]
  ])("returns null for a %s token", async (_, token) => {
    await expect(service.verify(token())).resolves.toBeNull();
  });
});
