/**
 * Reads and validates environment variables.
 * Throws with a clear message when a required one is missing.
 */
export interface SftpConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  /** Files or directories to import; a directory contributes every .csv inside it. */
  remotePaths: string[];
}

export interface SupabaseConfig {
  url: string;
  serviceRoleKey: string;
}

function requireEnv(name: string): string {
  const val = process.env[name];
  if (!val) {
    throw new Error(
      `Missing required environment variable: ${name}\n` +
        `See .env.example for the full list of required variables.`,
    );
  }
  return val;
}

export function loadSftpConfig(): SftpConfig {
  // `||`, not `??`: a GitHub secret that isn't set arrives as an empty string.
  const rawPort = process.env["SFTP_PORT"] || "22";
  const port = Number(rawPort);
  if (!Number.isInteger(port) || port <= 0) {
    throw new Error(`Invalid SFTP_PORT: "${rawPort}"`);
  }

  return {
    host: requireEnv("SFTP_HOST"),
    port,
    user: requireEnv("SFTP_USER"),
    password: requireEnv("SFTP_PASSWORD"),
    // One path or several separated by commas; each can be a CSV file or a directory.
    remotePaths: requireEnv("SFTP_REMOTE_PATH")
      .split(",")
      .map((p) => p.trim())
      .filter(Boolean),
  };
}

/**
 * Supabase credentials. When they're missing, returns null if `required` is
 * false (allowed for dry runs) and throws otherwise.
 */
export function loadSupabaseConfig(required: boolean): SupabaseConfig | null {
  const url = process.env["SUPABASE_URL"];
  const serviceRoleKey = process.env["SUPABASE_SERVICE_ROLE_KEY"];
  if (url && serviceRoleKey) return { url, serviceRoleKey };
  if (!required) return null;
  return { url: requireEnv("SUPABASE_URL"), serviceRoleKey: requireEnv("SUPABASE_SERVICE_ROLE_KEY") };
}
