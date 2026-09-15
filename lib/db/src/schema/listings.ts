import {
  pgTable,
  text,
  uuid,
  integer,
  numeric,
  boolean,
  date,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { dealersTable } from "./dealers.js";

export const listingsTable = pgTable(
  "listings",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    vin: text("vin").unique().notNull(),
    dealer_id: text("dealer_id")
      .notNull()
      .references(() => dealersTable.dealer_id, { onDelete: "restrict" }),
    stock_number: text("stock_number"),
    year: integer("year"),
    make: text("make"),
    model: text("model"),
    model_number: text("model_number"),
    body: text("body"),
    transmission: text("transmission"),
    series: text("series"),
    series_detail: text("series_detail"),
    door_count: integer("door_count"),
    odometer: integer("odometer"),
    engine_cylinders: integer("engine_cylinders"),
    engine_displacement: text("engine_displacement"),
    engine: text("engine"),
    drivetrain: text("drivetrain"),
    exterior_color: text("exterior_color"),
    interior_color: text("interior_color"),
    msrp: numeric("msrp", { precision: 12, scale: 2 }),
    // null = "Call for Price"
    price: numeric("price", { precision: 12, scale: 2 }),
    certified: boolean("certified").default(false).notNull(),
    description: text("description"),
    features: text("features"),
    // Array of photo URLs hot-linked from the feed
    photo_urls: text("photo_urls").array().default([]).notNull(),
    city_mpg: integer("city_mpg"),
    highway_mpg: integer("highway_mpg"),
    vehicle_detail_link: text("vehicle_detail_link"),
    inventory_date: date("inventory_date"),
    photos_last_modified: date("photos_last_modified"),
    age: integer("age"),
    // 'active' | 'inactive' — VINs absent from daily feed become 'inactive'
    status: text("status").default("active").notNull(),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("idx_listings_vin").on(table.vin),
    index("idx_listings_status").on(table.status),
    index("idx_listings_make").on(table.make),
    index("idx_listings_model").on(table.model),
    index("idx_listings_dealer_id").on(table.dealer_id),
    index("idx_listings_year").on(table.year),
    index("idx_listings_price").on(table.price),
    index("idx_listings_odometer").on(table.odometer),
  ],
);

export const insertListingSchema = createInsertSchema(listingsTable).omit({
  id: true,
  created_at: true,
  updated_at: true,
});
export const selectListingSchema = createSelectSchema(listingsTable);

export type InsertListing = z.infer<typeof insertListingSchema>;
export type Listing = typeof listingsTable.$inferSelect;
