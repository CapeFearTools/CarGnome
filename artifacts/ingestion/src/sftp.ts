import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import SftpClient from "ssh2-sftp-client";
import type { SftpConfig } from "./config.js";

/**
 * Fetches the inventory CSV from the SFTP server and returns it as a Buffer.
 * When called without a destination argument, ssh2-sftp-client resolves the
 * Promise with the raw file contents as a Buffer.
 */
export async function fetchFromSftp(config: SftpConfig): Promise<Buffer> {
  const sftp = new SftpClient();
  try {
    await sftp.connect({
      host: config.host,
      port: config.port,
      username: config.user,
      password: config.password,
      // Give up after 30 seconds to avoid hanging the process
      readyTimeout: 30_000,
    });

    console.log(`[sftp] Connected to ${config.host}:${config.port}`);
    console.log(`[sftp] Fetching: ${config.remotePath}`);

    // Without a destination, get() resolves with Buffer | string | NodeJS.ReadableStream
    const result = await sftp.get(config.remotePath);
    const buf = Buffer.isBuffer(result) ? result : Buffer.from(result as string);

    console.log(`[sftp] Downloaded ${buf.length.toLocaleString()} bytes`);
    return buf;
  } finally {
    await sftp.end().catch(() => {
      /* ignore disconnect errors */
    });
  }
}

/**
 * Reads a local CSV fixture file (for offline development / CI testing).
 * Pass --local on the command line to activate this path.
 */
export function readLocalFixture(relativePath = "fixtures/sample.csv"): Buffer {
  const fullPath = resolve(process.cwd(), relativePath);
  console.log(`[local] Reading fixture: ${fullPath}`);
  return readFileSync(fullPath);
}

/**
 * Reads every *.csv file in a local fixtures directory (for offline
 * development / CI testing with multiple dealer feeds — mirrors the
 * real-world scenario where each store drops its own CSV on the SFTP server).
 * Pass --local on the command line to activate this path.
 */
export function readLocalFixtureDir(relativeDir = "fixtures"): { filename: string; buffer: Buffer }[] {
  const fullDir = resolve(process.cwd(), relativeDir);
  const files = readdirSync(fullDir).filter((f) => f.toLowerCase().endsWith(".csv"));

  if (files.length === 0) {
    throw new Error(`No .csv files found in fixtures directory: ${fullDir}`);
  }

  console.log(`[local] Found ${files.length} fixture file(s) in ${fullDir}`);

  return files.map((filename) => {
    const fullPath = resolve(fullDir, filename);
    console.log(`[local] Reading fixture: ${fullPath}`);
    return { filename, buffer: readFileSync(fullPath) };
  });
}
