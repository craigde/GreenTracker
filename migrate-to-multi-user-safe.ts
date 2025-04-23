import { db } from "./server/db";
import { users, locations, plants, wateringHistory, notificationSettings } from "./shared/schema";
import { eq } from "drizzle-orm";
import { sql } from "drizzle-orm/sql";

async function migrateToMultiUser() {
  try {
    console.log("Starting migration to multi-user system...");
    
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

    // 2. First check if we need to alter tables
    console.log("Checking database schema...");
    
    // Check for user_id in locations
    try {
      await db.execute(sql`SELECT user_id FROM locations LIMIT 1`);
      console.log("The user_id column exists in locations table");
    } catch (err) {
      console.log("The user_id column does not exist in locations table, need to push schema changes first.");
      console.log("Please run: npm run db:push");
      console.log("Then run this migration script again.");
      return;
    }

    // 3. Migrate locations
    console.log("Migrating locations...");
    // Using drizzle SQL template literals for safety
    await db.execute(sql`UPDATE locations SET user_id = ${defaultUser.id} WHERE user_id IS NULL`);
    console.log("Locations migration complete");
    
    // 4. Migrate plants
    console.log("Migrating plants...");
    await db.execute(sql`UPDATE plants SET user_id = ${defaultUser.id} WHERE user_id IS NULL`);
    console.log("Plants migration complete");
    
    // 5. Migrate watering history
    console.log("Migrating watering history...");
    await db.execute(sql`UPDATE watering_history SET user_id = ${defaultUser.id} WHERE user_id IS NULL`);
    console.log("Watering history migration complete");
    
    // 6. Set up notification settings
    console.log("Migrating notification settings...");
    const existingSettings = await db.select().from(notificationSettings);
    
    if (existingSettings.length > 0) {
      // Check if notification_settings has user_id
      try {
        await db.execute(sql`SELECT user_id FROM notification_settings LIMIT 1`);
        // Update first record to belong to default user
        await db.execute(sql`UPDATE notification_settings SET user_id = ${defaultUser.id} WHERE user_id IS NULL AND id = ${existingSettings[0].id}`);
      } catch (err) {
        console.log("The user_id column does not exist in notification_settings table, need to push schema changes first.");
      }
    } else {
      try {
        // Create default notification settings
        await db.insert(notificationSettings).values({
          userId: defaultUser.id,
          enabled: true,
          pushoverAppToken: process.env.PUSHOVER_APP_TOKEN || null,
          pushoverUserKey: process.env.PUSHOVER_USER_KEY || null
        });
        console.log("Created notification settings for default user");
      } catch (err) {
        console.error("Failed to create notification settings:", err);
      }
    }
    
    console.log("Multi-user migration completed successfully!");
  } catch (error) {
    console.error("Migration failed:", error);
  }
}

// Run the migration
migrateToMultiUser();