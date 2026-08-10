/**
 * Reads and validates required environment variables.
 * Throws with a clear message if any are missing.
 */
export interface SftpConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  remotePath: string;
}

export interface Config {
  sftp: SftpConfig;
  supabaseUrl: string;
  supabaseServiceRoleKey: string;
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

export function loadConfig(): Config {
  return {
    sftp: {
      host: requireEnv("SFTP_HOST"),
      port: parseInt(process.env["SFTP_PORT"] ?? "22", 10),
      user: requireEnv("SFTP_USER"),
      password: requireEnv("SFTP_PASSWORD"),
      remotePath: requireEnv("SFTP_REMOTE_PATH"),
    },
    supabaseUrl: requireEnv("SUPABASE_URL"),
    supabaseServiceRoleKey: requireEnv("SUPABASE_SERVICE_ROLE_KEY"),
  };
}

/** Config subset needed when running in --local mode (no SFTP required). */
export interface LocalConfig {
  supabaseUrl: string;
  supabaseServiceRoleKey: string;
}

export function loadLocalConfig(): LocalConfig {
  return {
    supabaseUrl: requireEnv("SUPABASE_URL"),
    supabaseServiceRoleKey: requireEnv("SUPABASE_SERVICE_ROLE_KEY"),
  };
}
