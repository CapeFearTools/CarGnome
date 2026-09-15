import { readFileSync, readdirSync } from "node:fs";
import { posix, resolve } from "node:path";
import SftpClient from "ssh2-sftp-client";
import type { SftpConfig } from "./config.js";

export interface SourceFile {
  /** File name or remote path, for logs and the run summary. */
  name: string;
  buffer: Buffer;
  /** Last modified time on the SFTP server; not set for local fixtures. */
  modifiedAt?: Date;
}

/**
 * Downloads the inventory CSVs from the SFTP server. Each configured path can
 * be a single file or a directory; a directory contributes every .csv inside it.
 */
export async function fetchFromSftp(config: SftpConfig): Promise<SourceFile[]> {
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

    const files: SourceFile[] = [];
    for (const remotePath of config.remotePaths) {
      const stats = await sftp.stat(remotePath);

      if (!stats.isDirectory) {
        files.push(await download(sftp, remotePath, stats.modifyTime));
        continue;
      }

      const entries = (await sftp.list(remotePath))
        .filter((entry) => entry.type !== "d" && entry.name.toLowerCase().endsWith(".csv"))
        .sort((a, b) => a.name.localeCompare(b.name));

      if (entries.length === 0) {
        throw new Error(`No .csv files found in SFTP directory: ${remotePath}`);
      }

      console.log(`[sftp] ${remotePath}: ${entries.length} CSV file(s)`);
      for (const entry of entries) {
        files.push(await download(sftp, posix.join(remotePath, entry.name), entry.modifyTime));
      }
    }

    return files;
  } finally {
    await sftp.end().catch(() => {
      /* ignore disconnect errors */
    });
  }
}

async function download(sftp: SftpClient, remotePath: string, modifyTime: number): Promise<SourceFile> {
  console.log(`[sftp] Fetching: ${remotePath}`);

  // Without a destination, get() resolves with Buffer | string | NodeJS.ReadableStream
  const result = await sftp.get(remotePath);
  const buffer = Buffer.isBuffer(result) ? result : Buffer.from(result as string);

  console.log(`[sftp] Downloaded ${buffer.length.toLocaleString()} bytes`);
  return { name: remotePath, buffer, modifiedAt: new Date(modifyTime) };
}

/**
 * Reads every *.csv file in the local fixtures directory — a snapshot of the
 * dealers' SFTP feeds for offline runs. Pass --local on the command line.
 */
export function readLocalFixtureDir(relativeDir = "fixtures"): SourceFile[] {
  const fullDir = resolve(process.cwd(), relativeDir);
  const names = readdirSync(fullDir)
    .filter((f) => f.toLowerCase().endsWith(".csv"))
    .sort((a, b) => a.localeCompare(b));

  if (names.length === 0) {
    throw new Error(`No .csv files found in fixtures directory: ${fullDir}`);
  }

  console.log(`[local] Found ${names.length} fixture file(s) in ${fullDir}`);

  return names.map((name) => {
    const fullPath = resolve(fullDir, name);
    console.log(`[local] Reading fixture: ${fullPath}`);
    return { name, buffer: readFileSync(fullPath) };
  });
}
