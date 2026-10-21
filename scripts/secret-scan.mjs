import { readdir, readFile } from "node:fs/promises";
import { extname, join, relative } from "node:path";

const roots = [".env.example", "render.yaml", "package.json", "server", "scripts", "src", ".github"];
const textExtensions = new Set([".js", ".mjs", ".cjs", ".ts", ".tsx", ".json", ".yaml", ".yml", ".toml", ".md", ".sql", ".sh", ".example"]);
const findings = [];
async function walk(path) {
  let entries;
  try { entries = await readdir(path, { withFileTypes: true }); } catch { return; }
  for (const entry of entries) {
    if (entry.name === "node_modules" || entry.name === ".git" || entry.name === "dist" || entry.name === "coverage") continue;
    const file = join(path, entry.name);
    if (entry.isDirectory()) await walk(file);
    else if (textExtensions.has(extname(entry.name)) || [".env.example", "render.yaml"].includes(entry.name)) await inspect(file);
  }
}
async function inspect(file) {
  const content = await readFile(file, "utf8");
  const lines = content.split(/\r?\n/);
  lines.forEach((line, index) => {
    const dsn = line.match(/postgres(?:ql)?:\/\/[^\s'"`]+/i)?.[0];
    if (dsn) {
      try {
        const parsed = new URL(dsn.replace(/[),;]+$/, ""));
        const user = decodeURIComponent(parsed.username).toLowerCase();
        const password = decodeURIComponent(parsed.password).toLowerCase();
        const placeholder = ["fixture", "unused", "example", "placeholder", "test"].includes(user) && ["fixture", "never-log-this", "unused", "example", "placeholder", "test"].includes(password);
        if (parsed.password && !placeholder) findings.push(`${relative(process.cwd(), file)}:${index + 1} embedded_postgres_credential`);
      } catch {
        if (/postgres(?:ql)?:\/\/[^'"`]*\+\s*encodeURIComponent\s*\(\s*['"`][^'"`]+['"`]/i.test(line)) findings.push(`${relative(process.cwd(), file)}:${index + 1} constructed_postgres_credential`);
      }
    }
    if (/postgres(?:ql)?:\/\/[^'"`]*\+\s*encodeURIComponent\s*\(\s*['"`][^'"`]+['"`]/i.test(line)) findings.push(`${relative(process.cwd(), file)}:${index + 1} constructed_postgres_credential`);
    if (/sb_secret_[A-Za-z0-9_-]{20,}/.test(line)) findings.push(`${relative(process.cwd(), file)}:${index + 1} supabase_secret_key`);
    if (/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/.test(line)) findings.push(`${relative(process.cwd(), file)}:${index + 1} private_key`);
  });
}
for (const path of roots) await walk(path);
if (findings.length) {
  console.error("Secret scan failed. Review the listed file locations; secret values are withheld.");
  for (const finding of [...new Set(findings)]) console.error(finding);
  process.exitCode = 1;
} else console.log("Secret scan passed: no embedded database credentials, Supabase secret keys, or private keys found in current source files.");
