import { randomBytes } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import { migrate } from "drizzle-orm/node-postgres/migrator";

const { Pool } = pg;

const EXPECTED_RESPONSE = {
  connected: false,
  igUserId: null,
  instagramHandle: null,
};

const EXPECTED_COLUMNS = [
  "id",
  "user_id",
  "access_token",
  "ig_user_id",
  "instagram_handle",
  "created_at",
  "updated_at",
];

function requireDatabaseUrl(): string {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error(
      "DATABASE_URL must be set to run the Instagram database regression test",
    );
  }
  return databaseUrl;
}

function withSearchPath(databaseUrl: string, schemaName: string): string {
  const url = new URL(databaseUrl);
  url.searchParams.set("options", `-c search_path=${schemaName},public`);
  return url.toString();
}

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

async function main(): Promise<void> {
  const originalDatabaseUrl = requireDatabaseUrl();
  const schemaName = `instagram_regression_${process.pid}_${randomBytes(4).toString("hex")}`;
  const migrationSchemaName = `${schemaName}_migrations`;
  const bootstrapPool = new Pool({ connectionString: originalDatabaseUrl });
  let migratedPool: typeof bootstrapPool | undefined;
  let server:
    ReturnType<(typeof import("node:http"))["createServer"]> | undefined;

  try {
    await bootstrapPool.query(`CREATE SCHEMA "${schemaName}"`);

    process.env.NODE_ENV = "test";
    process.env.DATABASE_URL = withSearchPath(originalDatabaseUrl, schemaName);

    const { db, pool } = await import("@workspace/db");
    migratedPool = pool;

    await migrate(db, {
      migrationsFolder: path.resolve(
        path.dirname(fileURLToPath(import.meta.url)),
        "../../../lib/db/drizzle",
      ),
      migrationsSchema: migrationSchemaName,
    });

    const columns = await pool.query<{ column_name: string }>(
      `SELECT column_name
       FROM information_schema.columns
       WHERE table_schema = $1
         AND table_name = 'instagram_connections'
       ORDER BY ordinal_position`,
      [schemaName],
    );
    assert(
      columns.rows.map((row) => row.column_name).join(",") ===
        EXPECTED_COLUMNS.join(","),
      `instagram_connections columns drifted: ${columns.rows.map((row) => row.column_name).join(", ")}`,
    );

    const { default: app } = await import("./app");
    server = app.listen(0);
    await new Promise<void>((resolve, reject) => {
      server?.once("listening", () => resolve());
      server?.once("error", reject);
    });

    const address = server.address();
    assert(
      address !== null && typeof address !== "string",
      "Test server did not expose a TCP address",
    );

    const response = await fetch(
      `http://127.0.0.1:${address.port}/api/instagram/status`,
      {
        headers: { "x-dev-bypass": "true" },
      },
    );
    const body = await response.json();

    assert(
      response.status === 200,
      `Expected HTTP 200, received ${response.status}: ${JSON.stringify(body)}`,
    );
    assert(
      JSON.stringify(body) === JSON.stringify(EXPECTED_RESPONSE),
      `Unexpected Instagram status response: ${JSON.stringify(body)}`,
    );

    console.log("Instagram database regression test passed");
  } finally {
    await bootstrapPool.end();

    if (server) {
      await new Promise<void>((resolve, reject) => {
        server?.close((error) => (error ? reject(error) : resolve()));
      });
    }

    if (migratedPool) {
      await migratedPool.end();
    }

    const cleanupPool = new Pool({ connectionString: originalDatabaseUrl });
    try {
      await cleanupPool.query(
        `DROP SCHEMA IF EXISTS "${migrationSchemaName}" CASCADE`,
      );
      await cleanupPool.query(`DROP SCHEMA IF EXISTS "${schemaName}" CASCADE`);
    } finally {
      await cleanupPool.end();
    }

    process.env.DATABASE_URL = originalDatabaseUrl;
  }
}

main().catch((error: unknown) => {
  console.error("Instagram database regression test failed:", error);
  process.exitCode = 1;
});
