import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import path from "node:path";

const dbPath = process.env.DATABASE_URL || path.resolve(process.cwd(), "data/journal.db");
const sqlite = new Database(dbPath);
const db = drizzle(sqlite);
migrate(db, { migrationsFolder: path.resolve(process.cwd(), "drizzle") });
console.log("Migrations applied");
sqlite.close();
