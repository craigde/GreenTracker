import { db } from "./server/db";
import { users, locations, plants, wateringHistory, notificationSettings } from "./shared/schema";
import { eq } from "drizzle-orm";

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

    // 2. Add userId to locations, safely
    console.log("Migrating locations...");
    await db.execute(`
      -- Add userId to existing locations
      UPDATE locations 
      SET user_id = ${defaultUser.id} 
      WHERE user_id IS NULL;
    `);
    
    // 3. Add userId to plants, safely
    console.log("Migrating plants...");
    await db.execute(`
      -- Add userId to existing plants  
      UPDATE plants 
      SET user_id = ${defaultUser.id} 
      WHERE user_id IS NULL;
    `);
    
    // 4. Add userId to watering history, safely
    console.log("Migrating watering history...");
    await db.execute(`
      -- Add userId to existing watering records
      UPDATE watering_history 
      SET user_id = ${defaultUser.id} 
      WHERE user_id IS NULL;
    `);
    
    // 5. Create notification settings for user
    console.log("Migrating notification settings...");
    const existingSettings = await db.select().from(notificationSettings);
    
    if (existingSettings.length > 0) {
      // Update first record to belong to default user
      await db.execute(`
        UPDATE notification_settings
        SET user_id = ${defaultUser.id}
        WHERE id = ${existingSettings[0].id}
      `);
    } else {
      // Create default notification settings
      await db.insert(notificationSettings).values({
        userId: defaultUser.id,
        enabled: true,
        pushoverAppToken: process.env.PUSHOVER_APP_TOKEN || null,
        pushoverUserKey: process.env.PUSHOVER_USER_KEY || null
      });
    }
    
    console.log("Multi-user migration completed successfully!");
  } catch (error) {
    console.error("Migration failed:", error);
  }
}

// Run the migration
migrateToMultiUser();