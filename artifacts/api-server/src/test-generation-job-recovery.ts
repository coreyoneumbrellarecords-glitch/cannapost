import { randomBytes, randomUUID } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { and, count, eq } from "drizzle-orm";

const { Pool } = pg;

function requireDatabaseUrl(): string {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL must be set to run the generation job recovery test");
  return databaseUrl;
}

function withSearchPath(databaseUrl: string, schemaName: string): string {
  const url = new URL(databaseUrl);
  url.searchParams.set("options", `-c search_path=${schemaName},public`);
  return url.toString();
}

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function main(): Promise<void> {
  const originalDatabaseUrl = requireDatabaseUrl();
  const originalPort = process.env.PORT;
  const schemaName = `generation_job_recovery_${process.pid}_${randomBytes(4).toString("hex")}`;
  const migrationSchemaName = `${schemaName}_migrations`;
  const bootstrapPool = new Pool({ connectionString: originalDatabaseUrl });
  let migratedPool: typeof bootstrapPool | undefined;
  let server: ReturnType<(typeof import("node:http"))["createServer"]> | undefined;

  try {
    await bootstrapPool.query(`CREATE SCHEMA "${schemaName}"`);
    process.env.NODE_ENV = "test";
    process.env.DATABASE_URL = withSearchPath(originalDatabaseUrl, schemaName);

    const {
      db,
      pool,
      imageGenerationJobsTable,
      postsTable,
    } = await import("@workspace/db");
    migratedPool = pool;
    await migrate(db, {
      migrationsFolder: path.resolve(
        path.dirname(fileURLToPath(import.meta.url)),
        "../../../lib/db/drizzle",
      ),
      migrationsSchema: migrationSchemaName,
    });

    const { default: app } = await import("./app");
    server = app.listen(0);
    await new Promise<void>((resolve, reject) => {
      server?.once("listening", () => resolve());
      server?.once("error", reject);
    });
    const address = server.address();
    assert(address !== null && typeof address !== "string", "Test server did not expose a TCP address");
    process.env.PORT = String(address.port);

    const jobId = randomUUID();
    const userId = `generation-recovery-${randomUUID()}`;
    const [existingPost] = await db
      .insert(postsTable)
      .values({
        userId,
        generationJobId: jobId,
        caption: "Persisted before restart",
        platform: "instagram",
        postType: "post",
        status: "draft",
        agcoCompliant: true,
      })
      .returning();
    await db.insert(imageGenerationJobsTable).values({
      id: jobId,
      userId,
      workerId: randomUUID(),
      status: "pending",
      payload: { prompt: "restart recovery verification", postType: "post" },
      updatedAt: new Date(Date.now() - 60_000),
    });

    let recoveredJob: typeof imageGenerationJobsTable.$inferSelect | undefined;
    const deadline = Date.now() + 20_000;
    while (Date.now() < deadline) {
      [recoveredJob] = await db
        .select()
        .from(imageGenerationJobsTable)
        .where(eq(imageGenerationJobsTable.id, jobId))
        .limit(1);
      if (recoveredJob?.status === "complete") break;
      await new Promise((resolve) => setTimeout(resolve, 250));
    }

    assert(recoveredJob?.status === "complete", "Replacement worker did not complete the stale job");
    const result = recoveredJob.result as { id?: string } | null;
    assert(result?.id === existingPost.id, "Recovered job did not return the original persisted post");

    const [postCount] = await db
      .select({ count: count() })
      .from(postsTable)
      .where(and(
        eq(postsTable.userId, userId),
        eq(postsTable.generationJobId, jobId),
      ));
    assert(postCount?.count === 1, "Recovery created a duplicate post");

    console.log("Generation job restart recovery test passed");
  } finally {
    if (server) {
      await new Promise<void>((resolve, reject) => {
        server?.close((error) => (error ? reject(error) : resolve()));
      });
    }
    if (migratedPool) await migratedPool.end();
    await bootstrapPool.end();

    const cleanupPool = new Pool({ connectionString: originalDatabaseUrl });
    try {
      await cleanupPool.query(`DROP SCHEMA IF EXISTS "${migrationSchemaName}" CASCADE`);
      await cleanupPool.query(`DROP SCHEMA IF EXISTS "${schemaName}" CASCADE`);
    } finally {
      await cleanupPool.end();
    }

    process.env.DATABASE_URL = originalDatabaseUrl;
    if (originalPort === undefined) delete process.env.PORT;
    else process.env.PORT = originalPort;
  }
}

main().catch((error: unknown) => {
  console.error("Generation job restart recovery test failed:", error);
  process.exitCode = 1;
});