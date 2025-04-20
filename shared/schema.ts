import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Locations table
export const locations = pgTable("locations", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  isDefault: boolean("is_default").default(false),
});

export const locationSchema = createInsertSchema(locations);
export const insertLocationSchema = locationSchema.omit({ id: true });

export type Location = typeof locations.$inferSelect;
export type InsertLocation = z.infer<typeof insertLocationSchema>;

// Plants table
export const plants = pgTable("plants", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  species: text("species"),
  location: text("location").notNull(),
  wateringFrequency: integer("watering_frequency").notNull(), // in days
  lastWatered: timestamp("last_watered").notNull(),
  notes: text("notes"),
  imageUrl: text("image_url"),
});

export const plantSchema = createInsertSchema(plants);
export const insertPlantSchema = plantSchema.omit({ id: true });

export type Plant = typeof plants.$inferSelect;
export type InsertPlant = z.infer<typeof insertPlantSchema>;

// Watering history table
export const wateringHistory = pgTable("watering_history", {
  id: serial("id").primaryKey(),
  plantId: integer("plant_id").notNull(),
  wateredAt: timestamp("watered_at").notNull(),
});

export const wateringHistorySchema = createInsertSchema(wateringHistory);
export const insertWateringHistorySchema = wateringHistorySchema.omit({ id: true });

export type WateringHistory = typeof wateringHistory.$inferSelect;
export type InsertWateringHistory = z.infer<typeof insertWateringHistorySchema>;

// Plant species catalog
export const plantSpecies = pgTable("plant_species", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  scientificName: text("scientific_name").notNull(),
  family: text("family"),
  origin: text("origin"),
  description: text("description").notNull(),
  careLevel: text("care_level").notNull(), // "easy", "moderate", "difficult"
  lightRequirements: text("light_requirements").notNull(),
  wateringFrequency: integer("watering_frequency").notNull(), // recommended watering in days
  humidity: text("humidity"), // "low", "medium", "high"
  soilType: text("soil_type"),
  propagation: text("propagation"),
  toxicity: text("toxicity"), // "non-toxic", "toxic to pets", "toxic to humans"
  commonIssues: text("common_issues"),
  imageUrl: text("image_url"),
});

export const plantSpeciesSchema = createInsertSchema(plantSpecies);
export const insertPlantSpeciesSchema = plantSpeciesSchema.omit({ id: true });

export type PlantSpecies = typeof plantSpecies.$inferSelect;
export type InsertPlantSpecies = z.infer<typeof insertPlantSpeciesSchema>;

// Notification settings
export const notificationSettings = pgTable("notification_settings", {
  id: serial("id").primaryKey(),
  enabled: boolean("enabled").notNull().default(true),
  pushoverAppToken: text("pushover_app_token"),
  pushoverUserKey: text("pushover_user_key"),
  lastUpdated: timestamp("last_updated").defaultNow(),
});

export const notificationSettingsSchema = createInsertSchema(notificationSettings);
export const insertNotificationSettingsSchema = notificationSettingsSchema.omit({ id: true });

export type NotificationSettings = typeof notificationSettings.$inferSelect;
export type InsertNotificationSettings = z.infer<typeof insertNotificationSettingsSchema>;
