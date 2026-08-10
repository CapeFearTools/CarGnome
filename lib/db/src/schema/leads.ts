import { pgTable, text, uuid, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const leadsTable = pgTable("leads", {
  id: uuid("id").defaultRandom().primaryKey(),
  vin: text("vin"),
  // Nullable FK to listings.id — kept loose so leads survive listing deactivation
  listing_id: uuid("listing_id"),
  // 'inquiry' | 'click_for_price'
  lead_type: text("lead_type").notNull(),
  name: text("name"),
  email: text("email"),
  phone: text("phone"),
  message: text("message"),
  vehicle_detail_link: text("vehicle_detail_link"),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const insertLeadSchema = createInsertSchema(leadsTable).omit({
  id: true,
  created_at: true,
});
export const selectLeadSchema = createSelectSchema(leadsTable);

export type InsertLead = z.infer<typeof insertLeadSchema>;
export type Lead = typeof leadsTable.$inferSelect;
