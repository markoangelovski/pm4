import { lookup as dnsLookup } from "node:dns";
import { request as httpRequest } from "node:http";
import { request as httpsRequest } from "node:https";
import { BlockList, isIP } from "node:net";
import { Injectable } from "@nestjs/common";
import { AppConfigService } from "../config/app-config.service.js";

const blocked = new BlockList();
for (const [net, prefix] of [
  ["0.0.0.0", 8],
  ["10.0.0.0", 8],
  ["100.64.0.0", 10],
  ["127.0.0.0", 8],
  ["169.254.0.0", 16],
  ["172.16.0.0", 12],
  ["192.0.0.0", 24],
  ["192.168.0.0", 16],
  ["224.0.0.0", 4],
  ["240.0.0.0", 4]
] as const) {
  blocked.addSubnet(net, prefix, "ipv4");
}
for (const [net, prefix] of [
  ["::", 128],
  ["::1", 128],
  ["fc00::", 7],
  ["fe80::", 10],
  ["ff00::", 8]
] as const) {
  blocked.addSubnet(net, prefix, "ipv6");
}

/** The IPv4 address inside an IPv4-mapped IPv6 one (`::ffff:a.b.c.d` or `::ffff:xxxx:xxxx`), else null. */
function unmap(ip: string): string | null {
  let host: string;
  try {
    host = new URL(`http://[${ip}]`).hostname.slice(1, -1);
  } catch {
    return null;
  }
  const match = /^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/.exec(host);
  if (!match) return null;
  const high = parseInt(match[1], 16);
  const low = parseInt(match[2], 16);
  return `${high >> 8}.${high & 255}.${low >> 8}.${low & 255}`;
}

/** false for loopback, private, link-local, CGNAT, multicast, unspecified and their IPv4-mapped forms. */
export function isPublicAddress(ip: string): boolean {
  const family = isIP(ip);
  if (family === 0) return false;
  if (family === 6) {
    const mapped = unmap(ip);
    if (mapped) return isPublicAddress(mapped);
    return !blocked.check(ip, "ipv6");
  }
  return !blocked.check(ip, "ipv4");
}

const TIMEOUT_MS = 5000;
const MAX_BYTES = 10 * 1024;
const DEV_HOSTS = new Set(["localhost", "127.0.0.1"]);

/** Fetches Client ID Metadata Documents safely (security.md *Agent access*). */
@Injectable()
export class CimdFetcher {
  constructor(private readonly config: AppConfigService) {}

  /** http://localhost and http://127.0.0.1 skip the address check outside production. */
  isDevUrl(url: URL): boolean {
    return (
      url.protocol === "http:" &&
      !this.config.isProduction &&
      DEV_HOSTS.has(url.hostname)
    );
  }

  fetchJson(url: URL): Promise<unknown> {
    const dev = this.isDevUrl(url);
    if (!dev && url.protocol !== "https:") {
      return Promise.reject(new Error("unsupported protocol"));
    }
    const literal = url.hostname.replace(/^\[|\]$/g, "");
    if (!dev && isIP(literal) !== 0 && !isPublicAddress(literal)) {
      return Promise.reject(new Error("address not public"));
    }

    return new Promise<unknown>((resolve, reject) => {
      const options = {
        method: "GET",
        headers: { Accept: "application/json" },
        timeout: TIMEOUT_MS,
        // Connect to the address that was checked.
        lookup: dev
          ? undefined
          : (
              hostname: string,
              lookupOptions: { all?: boolean },
              callback: (...args: any[]) => void
            ) => {
              dnsLookup(hostname, { all: true }, (error, addresses) => {
                if (error) return callback(error);
                if (
                  addresses.length === 0 ||
                  !addresses.every((entry) => isPublicAddress(entry.address))
                ) {
                  return callback(new Error("address not public"));
                }
                if (lookupOptions.all) return callback(null, addresses);
                callback(null, addresses[0].address, addresses[0].family);
              });
            }
      };
      const send = dev ? httpRequest : httpsRequest;
      // Overall limit: the socket timeout resets on every chunk, so a slow drip would outlast it.
      const overall = setTimeout(
        () => req.destroy(new Error("timeout")),
        TIMEOUT_MS
      );
      const req = send(url, options, (res) => {
        if (res.statusCode !== 200) {
          res.resume();
          req.destroy();
          reject(new Error(`status ${res.statusCode}`));
          return;
        }
        const mediaType = (res.headers["content-type"] ?? "")
          .split(";")[0]
          .trim()
          .toLowerCase();
        if (mediaType !== "application/json") {
          res.resume();
          req.destroy();
          reject(new Error("not application/json"));
          return;
        }
        const chunks: Buffer[] = [];
        let size = 0;
        res.on("data", (chunk: Buffer) => {
          size += chunk.length;
          if (size > MAX_BYTES) {
            req.destroy();
            reject(new Error("document too large"));
            return;
          }
          chunks.push(chunk);
        });
        res.on("end", () => {
          clearTimeout(overall);
          try {
            resolve(JSON.parse(Buffer.concat(chunks).toString("utf8")));
          } catch {
            reject(new Error("not JSON"));
          }
        });
        res.on("error", reject);
      });
      req.on("timeout", () => req.destroy(new Error("timeout")));
      req.on("error", (error) => {
        clearTimeout(overall);
        reject(error);
      });
      req.on("close", () => clearTimeout(overall));
      req.end();
    });
  }
}
