import { db } from "./server/db";
import { users } from "./shared/schema";
import { sql } from "drizzle-orm/sql";

async function migrateWithSQL() {
  try {
    console.log("Starting SQL-based migration to multi-user system...");
    
    // 1. Create a default user if none exists
    console.log("Creating default user...");
    const defaultUserName = "default";
    const defaultPassword = "$2b$10$EpRnTzVlqHNP0.fUbXUwSOyuiXe/QLSUG6xNekdHgTGmrpHEfIoxm"; // "password" - in production use proper hashing
    
    const existingUsers = await db.select().from(users);
    let defaultUser;
    
    if (existingUsers.length === 0) {
      const [user] = await db.insert(users).values({
        username: defaultUserName,
        password: defaultPassword
      }).returning();
      defaultUser = user;
      console.log("Created default user with ID:", defaultUser.id);
    } else {
      defaultUser = existingUsers[0];
      console.log("Using existing user with ID:", defaultUser.id);
    }
    
    const userId = defaultUser.id;

    // 2. Add user_id columns to all tables with appropriate defaults
    console.log("Adding user_id columns to all tables...");

    // Add user_id to locations table
    try {
      await db.execute(sql`
        ALTER TABLE locations 
        ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id);
      `);
      console.log("Added user_id column to locations table");
      
      // Fill with default user id
      await db.execute(sql`
        UPDATE locations 
        SET user_id = ${userId} 
        WHERE user_id IS NULL;
      `);
      console.log("Updated locations with default user ID");
      
      // Make it not null
      await db.execute(sql`
        ALTER TABLE locations 
        ALTER COLUMN user_id SET NOT NULL;
      `);
      
      // Add unique constraint
      await db.execute(sql`
        DROP INDEX IF EXISTS location_user_name_idx;
        CREATE UNIQUE INDEX location_user_name_idx ON locations(name, user_id);
      `);
      console.log("Added unique constraint on locations");
    } catch (error) {
      console.error("Error migrating locations:", error);
    }

    // Add user_id to plants table
    try {
      await db.execute(sql`
        ALTER TABLE plants 
        ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id);
      `);
      console.log("Added user_id column to plants table");
      
      // Fill with default user id
      await db.execute(sql`
        UPDATE plants 
        SET user_id = ${userId} 
        WHERE user_id IS NULL;
      `);
      console.log("Updated plants with default user ID");
      
      // Make it not null
      await db.execute(sql`
        ALTER TABLE plants 
        ALTER COLUMN user_id SET NOT NULL;
      `);
    } catch (error) {
      console.error("Error migrating plants:", error);
    }

    // Add user_id to watering_history table
    try {
      await db.execute(sql`
        ALTER TABLE watering_history 
        ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id);
      `);
      console.log("Added user_id column to watering_history table");
      
      // Fill with default user id
      await db.execute(sql`
        UPDATE watering_history 
        SET user_id = ${userId} 
        WHERE user_id IS NULL;
      `);
      console.log("Updated watering_history with default user ID");
      
      // Make it not null
      await db.execute(sql`
        ALTER TABLE watering_history 
        ALTER COLUMN user_id SET NOT NULL;
      `);
    } catch (error) {
      console.error("Error migrating watering_history:", error);
    }

    // Add user_id to notification_settings table
    try {
      await db.execute(sql`
        ALTER TABLE notification_settings 
        ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id);
      `);
      console.log("Added user_id column to notification_settings table");
      
      // Fill with default user id
      await db.execute(sql`
        UPDATE notification_settings 
        SET user_id = ${userId} 
        WHERE user_id IS NULL;
      `);
      console.log("Updated notification_settings with default user ID");
      
      // Make it not null
      await db.execute(sql`
        ALTER TABLE notification_settings 
        ALTER COLUMN user_id SET NOT NULL;
      `);
      
      // Add unique constraint
      await db.execute(sql`
        DROP INDEX IF EXISTS notification_settings_user_id_unique;
        CREATE UNIQUE INDEX notification_settings_user_id_unique ON notification_settings(user_id);
      `);
      console.log("Added unique constraint on notification_settings");
    } catch (error) {
      console.error("Error migrating notification_settings:", error);
    }
    
    console.log("SQL migration completed successfully!");
  } catch (error) {
    console.error("Migration failed:", error);
  } finally {
    // Close the database connection
    await db.end?.();
  }
}

// Run the migration
migrateWithSQL().catch(console.error);