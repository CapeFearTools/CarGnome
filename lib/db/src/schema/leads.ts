import { pgTable, text, uuid, timestamp, index } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { listingsTable } from "./listings.js";

export const leadsTable = pgTable(
  "leads",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    vin: text("vin"),
    // Optional link to the listing; set to null (not deleted) if the listing row is removed
    listing_id: uuid("listing_id").references(() => listingsTable.id, { onDelete: "set null" }),
    // 'inquiry' | 'click_for_price'
    lead_type: text("lead_type").notNull(),
    name: text("name"),
    email: text("email"),
    phone: text("phone"),
    message: text("message"),
    vehicle_detail_link: text("vehicle_detail_link"),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("idx_leads_vin").on(table.vin),
    index("idx_leads_listing_id").on(table.listing_id),
  ],
);

export const insertLeadSchema = createInsertSchema(leadsTable).omit({
  id: true,
  created_at: true,
});
export const selectLeadSchema = createSelectSchema(leadsTable);

export type InsertLead = z.infer<typeof insertLeadSchema>;
export type Lead = typeof leadsTable.$inferSelect;
