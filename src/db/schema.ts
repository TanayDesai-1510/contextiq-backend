import {
  pgTable,
  uuid,
  text,
  timestamp,
  integer,
  jsonb,
  pgEnum,
  vector,
} from "drizzle-orm/pg-core";

export const roleEnum = pgEnum("role", ["admin", "editor", "viewer"]);
export const sourceStatusEnum = pgEnum("source_status", ["idle", "running", "done", "error"]);

export const workspaces = pgTable("workspaces", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id")
    .notNull()
    .references(() => workspaces.id, { onDelete: "cascade" }),
  email: text("email").notNull(),
  hashedPassword: text("hashed_password").notNull(),
  role: roleEnum("role").notNull().default("editor"),
  lastActive: timestamp("last_active"),
  createdAt: timestamp("created_at").defaultNow(),
});


export const sources = pgTable('sources', {
    id: uuid('id').primaryKey().defaultRandom(),
    workspaceId: uuid('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
    type: text('type').notNull(),
    config: jsonb('config').notNull(),
    status: sourceStatusEnum('status').notNull().default('idle'),
    lastSyncedAt: timestamp('last_synced_at'),
    createdAt: timestamp('created_at').defaultNow(),
})

export const documents = pgTable('documents', {
    id: uuid('id').primaryKey().defaultRandom(),
    sourceId: uuid('source_id').notNull().references(() => sources.id, { onDelete: 'cascade' }),
    workspaceId: uuid('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    url: text('url'),
    chunkCount: integer('chunk_count').default(0),
    indexedAt: timestamp('indexed_at'),
})

export const chunks = pgTable('chunks', {
    id: uuid('id').primaryKey().defaultRandom(),
    documentId: uuid('document_id').notNull().references(() => documents.id, { onDelete: 'cascade' }),
    workspaceId: uuid('workspace_id').notNull(),
    content: text('content').notNull(),
    headingPath: text('heading_path'),
    tokenCount: integer('token_count'),
    embedding: vector('embedding', { dimensions: 1536 }), 
})

export const queries = pgTable('queries', {
    id: uuid('id').primaryKey().defaultRandom(),
    workspaceId: uuid('workspace_id').notNull(),
    userId: uuid('user_id'),
    queryText: text('query_text').notNull(),
    answer: text('answer'),
    latencyMs: integer('latency_ms'),
    cacheHit: text('cache_hit').default('miss'),
    createdAt: timestamp('created_at').defaultNow(), 
})

export const citations = pgTable('citations', {
    id: uuid('id').primaryKey().defaultRandom(),
    relevanceScore: integer('relevance_score'),
    queryId: uuid('query_id').notNull().references(() => queries.id, { onDelete: 'cascade' }),
    chunkId: uuid('chunk_id').notNull().references(() => chunks.id, { onDelete: 'cascade' }),  
})