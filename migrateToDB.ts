import { db } from "./server/db";
import { 
  users, 
  plants, 
  wateringHistory, 
  locations, 
  plantSpecies, 
  notificationSettings 
} from "./shared/schema";
import { storage as memStorage } from "./server/storage";
import { DatabaseStorage } from "./server/dbStorage";

// Migrate memory data to database
async function migrate() {
  try {
    console.log("Starting migration from memory storage to database...");
    
    // Create tables based on schema
    console.log("Creating tables...");
    const createTable = async () => {
      const statements = [
        `CREATE TABLE IF NOT EXISTS "users" (
          "id" SERIAL PRIMARY KEY,
          "username" TEXT NOT NULL UNIQUE,
          "password" TEXT NOT NULL
        )`,
        `CREATE TABLE IF NOT EXISTS "locations" (
          "id" SERIAL PRIMARY KEY,
          "name" TEXT NOT NULL UNIQUE,
          "is_default" BOOLEAN DEFAULT false
        )`,
        `CREATE TABLE IF NOT EXISTS "plants" (
          "id" SERIAL PRIMARY KEY,
          "name" TEXT NOT NULL,
          "species" TEXT,
          "location" TEXT NOT NULL,
          "watering_frequency" INTEGER NOT NULL,
          "last_watered" TIMESTAMP NOT NULL,
          "notes" TEXT,
          "image_url" TEXT
        )`,
        `CREATE TABLE IF NOT EXISTS "watering_history" (
          "id" SERIAL PRIMARY KEY,
          "plant_id" INTEGER NOT NULL,
          "watered_at" TIMESTAMP NOT NULL
        )`,
        `CREATE TABLE IF NOT EXISTS "plant_species" (
          "id" SERIAL PRIMARY KEY,
          "name" TEXT NOT NULL UNIQUE,
          "scientific_name" TEXT NOT NULL,
          "description" TEXT,
          "care_instructions" TEXT,
          "watering_frequency" INTEGER NOT NULL,
          "light_requirements" TEXT,
          "humidity_level" TEXT,
          "temperature_range" TEXT,
          "care_level" TEXT,
          "family" TEXT,
          "image_url" TEXT
        )`,
        `CREATE TABLE IF NOT EXISTS "notification_settings" (
          "id" SERIAL PRIMARY KEY,
          "enabled" BOOLEAN DEFAULT true,
          "pushover_app_token" TEXT,
          "pushover_user_key" TEXT,
          "last_updated" TIMESTAMP
        )`
      ];

      for (const statement of statements) {
        try {
          await db.execute(statement);
          console.log("Table created successfully");
        } catch (error) {
          console.error("Error creating table:", error);
        }
      }
    };

    await createTable();
    
    // Migrate data
    const dbStorage = new DatabaseStorage();
    
    // Migrate locations
    console.log("Migrating locations...");
    const locations = await memStorage.getAllLocations();
    for (const location of locations) {
      try {
        await dbStorage.createLocation({
          name: location.name,
          isDefault: location.isDefault
        });
        console.log(`Migrated location: ${location.name}`);
      } catch (error) {
        console.log(`Location already exists: ${location.name}`);
      }
    }
    
    // Migrate plant species
    console.log("Migrating plant species...");
    const species = await memStorage.getAllPlantSpecies();
    for (const spec of species) {
      try {
        await dbStorage.createPlantSpecies({
          name: spec.name,
          scientificName: spec.scientificName,
          description: spec.description,
          careInstructions: spec.careInstructions,
          wateringFrequency: spec.wateringFrequency,
          lightRequirements: spec.lightRequirements,
          humidityLevel: spec.humidityLevel,
          temperatureRange: spec.temperatureRange,
          careLevel: spec.careLevel,
          family: spec.family,
          imageUrl: spec.imageUrl
        });
        console.log(`Migrated plant species: ${spec.name}`);
      } catch (error) {
        console.log(`Plant species already exists: ${spec.name}`);
      }
    }
    
    // Migrate plants
    console.log("Migrating plants...");
    const plants = await memStorage.getAllPlants();
    for (const plant of plants) {
      try {
        await dbStorage.createPlant({
          name: plant.name,
          species: plant.species,
          location: plant.location,
          wateringFrequency: plant.wateringFrequency,
          lastWatered: plant.lastWatered,
          notes: plant.notes,
          imageUrl: plant.imageUrl
        });
        console.log(`Migrated plant: ${plant.name}`);
      } catch (error) {
        console.log(`Error migrating plant: ${plant.name}`, error);
      }
    }
    
    // Migrate notification settings
    console.log("Migrating notification settings...");
    const notifSettings = await memStorage.getNotificationSettings();
    if (notifSettings) {
      await dbStorage.updateNotificationSettings({
        enabled: notifSettings.enabled,
        pushoverAppToken: notifSettings.pushoverAppToken,
        pushoverUserKey: notifSettings.pushoverUserKey
      });
      console.log("Migrated notification settings");
    }
    
    console.log("Migration completed successfully!");
  } catch (error) {
    console.error("Migration failed:", error);
  } finally {
    process.exit(0);
  }
}

migrate();