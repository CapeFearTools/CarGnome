import { pgTable, text, uuid, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const dealersTable = pgTable("dealers", {
  id: uuid("id").defaultRandom().primaryKey(),
  dealer_id: text("dealer_id").unique().notNull(),
  name: text("name"),
  address: text("address"),
  city: text("city"),
  postal_code: text("postal_code"),
  email: text("email"),
  phone: text("phone"),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const insertDealerSchema = createInsertSchema(dealersTable).omit({
  id: true,
  created_at: true,
});
export const selectDealerSchema = createSelectSchema(dealersTable);

export type InsertDealer = z.infer<typeof insertDealerSchema>;
export type Dealer = typeof dealersTable.$inferSelect;
