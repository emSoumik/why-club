function readOptional(name: string) {
  const value = process.env[name]?.trim();
  return value ? value : undefined;
}

export function readRequiredEnv(name: string) {
  const value = readOptional(name);
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export function readOptionalEnv(name: string) {
  return readOptional(name);
}

export function getSuperAdminEmails() {
  return new Set<string>(
    (readOptional("SUPER_ADMIN_EMAILS") ?? "")
      .split(",")
      .map((entry: string) => entry.trim().toLowerCase())
      .filter(Boolean),
  );
}

export function isProdDeployment() {
  return (readOptional("CONVEX_DEPLOYMENT") ?? "").toLowerCase().includes("prod");
}
