import { db } from "../../db/client";
import { queries } from "../../db/schema";
import { eq, sql, desc, and } from "drizzle-orm";

export async function getQueryStats(workspaceId: string) {
  const totalQueries = await db
    .select({ count: sql<number>`count(*)` })
    .from(queries)
    .where(eq(queries.workspaceId, workspaceId));
  const topQueries = await db
    .select({ queryText: queries.queryText, count: sql<number>`count(*)` })
    .from(queries)
    .where(eq(queries.workspaceId, workspaceId))
    .groupBy(queries.queryText)
    .orderBy(desc(sql`count(*)`))
    .limit(10);

  return { totalQueries: totalQueries[0].count, topQueries };
}

export async function getCacheStats(workspaceId: string) {
  const stats = await db
    .select({
      cacheHit: queries.cacheHit,
      count: sql<number>`count(*)`,
    })
    .from(queries)
    .where(eq(queries.workspaceId, workspaceId))
    .groupBy(queries.cacheHit);

  return stats;
}

export async function getKnowledgeGaps(workspaceId: string) {
  const gaps = await db
    .select({ queryText: queries.queryText, createdAt: queries.createdAt })
    .from(queries)
    .where(
      and(
        eq(queries.workspaceId, workspaceId),
        sql`${queries.answer} ILIKE '%not in the context%'`,
      ),
    )
    .orderBy(desc(queries.createdAt))
    .limit(20);
  return gaps;
}
