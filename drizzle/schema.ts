import { int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Papers table: stores uploaded paper metadata and analysis status.
 */
export const papers = mysqlTable("papers", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  title: text("title"),
  abstract: text("abstract"),
  keywords: text("keywords"), // JSON array of strings
  directions: text("directions"), // JSON array of identified directions
  fileKey: varchar("fileKey", { length: 512 }).notNull(),
  fileUrl: varchar("fileUrl", { length: 512 }).notNull(),
  fileName: varchar("fileName", { length: 255 }).notNull(),
  fileSize: int("fileSize"),
  extractedText: text("extractedText"), // full extracted text from the paper (mediumtext)
  status: mysqlEnum("status", ["uploading", "extracting", "analyzing", "completed", "failed"])
    .default("uploading")
    .notNull(),
  errorMessage: text("errorMessage"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Paper = typeof papers.$inferSelect;
export type InsertPaper = typeof papers.$inferInsert;

/**
 * Analyses table: stores per-direction deep analysis results.
 */
export const analyses = mysqlTable("analyses", {
  id: int("id").autoincrement().primaryKey(),
  paperId: int("paperId").notNull(),
  direction: varchar("direction", { length: 255 }).notNull(), // e.g. "DFT", "Molecular Dynamics"
  directionCn: varchar("directionCn", { length: 255 }), // Chinese name of the direction
  summary: text("summary"), // brief summary of this direction in the paper
  content: text("content"), // full deep analysis markdown content
  status: mysqlEnum("status", ["pending", "analyzing", "completed", "failed"])
    .default("pending")
    .notNull(),
  orderIndex: int("orderIndex").default(0).notNull(), // display order
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Analysis = typeof analyses.$inferSelect;
export type InsertAnalysis = typeof analyses.$inferInsert;
