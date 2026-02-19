import { readdir } from "node:fs/promises";
import { join } from "node:path";
import { readConfig } from "./config";
import { createPool } from "./db";

const MIGRATIONS_DIR = join(process.cwd(), "migrations");

async function run(): Promise<void> {
  const config = readConfig();

  const pool = createPool({
    host: config.dbHost,
    port: config.dbPort,
    user: config.dbUser,
    password: config.dbPassword,
    database: config.dbName,
    ssl: config.dbSsl,
    sslRejectUnauthorized: config.dbSslRejectUnauthorized
  });

  try {
    const files = (await readdir(MIGRATIONS_DIR))
      .filter((file) => file.endsWith(".sql"))
      .sort();

    for (const file of files) {
      const path = join(MIGRATIONS_DIR, file);
      const sql = await Bun.file(path).text();
      await pool.query(sql);
      console.log(`Applied migration: ${file}`);
    }
  } finally {
    await pool.end();
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
