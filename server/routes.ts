import express, { type Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage as dbStorage } from "./multi-user-storage";
import { z } from "zod";
import { insertPlantSchema, insertLocationSchema, insertPlantSpeciesSchema, insertNotificationSettingsSchema, insertUserSchema } from "@shared/schema";
import multer from "multer";
import path from "path";
import fs from "fs";
import { sendPlantWateringNotification, sendWelcomeNotification, checkPlantsAndSendNotifications, sendPushoverNotification } from "./notifications";
import { setupAuth, hashPassword } from "./auth";
import passport from "passport";
import { setUserContext, getCurrentUserId } from "./user-context";

// Middleware to check if user is authenticated
function isAuthenticated(req: Request, res: Response, next: NextFunction) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ error: "You must be logged in to access this resource" });
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Set up authentication
  setupAuth(app);
  
  // Configure multer for file uploads
  const fileStorage = multer.diskStorage({
    destination: function (req, file, cb) {
      // Ensure uploads directory exists
      const uploadDir = path.join(process.cwd(), 'uploads');
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
      // Create unique filename with timestamp and original extension
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const ext = path.extname(file.originalname);
      cb(null, 'plant-' + uniqueSuffix + ext);
    }
  });
  
  const upload = multer({ 
    storage: fileStorage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB file size limit
    fileFilter: function(req, file, cb) {
      // Accept only image files
      if (!file.mimetype.startsWith('image/')) {
        return cb(new Error('Only image files are allowed'));
      }
      cb(null, true);
    }
  });

  // Serve uploaded files statically
  app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));
  
  const apiRouter = express.Router();

  // Authentication routes
  apiRouter.post("/register", async (req: Request, res: Response) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      
      // Check if user already exists
      const existingUser = await dbStorage.getUserByUsername(userData.username);
      if (existingUser) {
        return res.status(400).json({ error: "Username already exists" });
      }
      
      // Hash password
      const hashedPassword = await hashPassword(userData.password);
      
      // Create new user
      const user = await dbStorage.createUser({
        ...userData,
        password: hashedPassword
      });
      
      // Log the user in
      req.login(user, (loginErr) => {
        if (loginErr) {
          console.error("Post-registration login error:", loginErr);
          return res.status(500).json({ 
            error: "Failed to log in after registration",
            details: loginErr.message
          });
        }
        
        // Return consistent user data format
        return res.status(201).json({
          id: user.id,
          username: user.username,
          // Add any other non-sensitive user data here
        });
      });
    } catch (error) {
      console.error("Registration error:", error);
      
      // Check for specific error types and provide more helpful messages
      const errorMessage = error instanceof Error ? error.message : "Invalid registration data";
      
      if (errorMessage.includes("already exists")) {
        return res.status(409).json({ error: "Username already exists" });
      }
      
      // Generic error case
      res.status(400).json({ 
        error: "Registration failed",
        details: errorMessage
      });
    }
  });
  
  apiRouter.post("/login", (req: Request, res: Response, next: NextFunction) => {
    passport.authenticate("local", (err, user, info) => {
      if (err) {
        console.error("Login error:", err);
        return res.status(500).json({ error: "Internal server error" });
      }
      
      if (!user) {
        return res.status(401).json({ 
          error: info?.message || "Invalid username or password" 
        });
      }
      
      req.login(user, (loginErr) => {
        if (loginErr) {
          console.error("Login session error:", loginErr);
          return res.status(500).json({ error: "Failed to create session" });
        }
        
        // Return consistent user data format
        return res.status(200).json({
          id: user.id,
          username: user.username,
          // Add any other non-sensitive user data here
        });
      });
    })(req, res, next);
  });
  
  apiRouter.post("/logout", (req: Request, res: Response) => {
    // First check if user is logged in
    if (!req.isAuthenticated()) {
      // Still return a success response, just with a different message
      return res.status(200).json({ 
        success: true,
        message: "Already logged out" 
      });
    }
    
    req.logout((err) => {
      if (err) {
        console.error("Logout error:", err);
        return res.status(500).json({ 
          error: "Failed to log out",
          details: err.message
        });
      }
      
      // Return consistent response format
      res.status(200).json({
        success: true,
        message: "Logged out successfully"
      });
    });
  });
  
  apiRouter.get("/user", (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    const user = req.user as Express.User;
    return res.json({
      id: user.id,
      username: user.username
    });
  });

  // Get all plants
  apiRouter.get("/plants", async (req: Request, res: Response) => {
    try {
      const plants = await dbStorage.getAllPlants();
      res.json(plants);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch plants" });
    }
  });

  // Get a specific plant
  apiRouter.get("/plants/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid plant ID" });
      }

      const plant = await dbStorage.getPlant(id);
      if (!plant) {
        return res.status(404).json({ message: "Plant not found" });
      }

      const wateringHistory = await dbStorage.getWateringHistory(id);
      res.json({ ...plant, wateringHistory });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch plant details" });
    }
  });

  // Create a new plant
  apiRouter.post("/plants", async (req: Request, res: Response) => {
    try {
      console.log("Received plant creation request with data:", req.body);
      
      // Convert lastWatered string to Date if needed
      let data = {...req.body};
      
      // Handle date conversion issue for lastWatered
      if (data.lastWatered) {
        try {
          // Handle different date formats safely
          if (typeof data.lastWatered === 'string') {
            data.lastWatered = new Date(data.lastWatered);
          } else if (data.lastWatered instanceof Date) {
            // Already a Date object, ensure it's valid
            if (isNaN(data.lastWatered.getTime())) {
              throw new Error('Invalid date object');
            }
          } else if (data.lastWatered && typeof data.lastWatered === 'object') {
            // Handle potential serialized date objects
            data.lastWatered = new Date(data.lastWatered);
          }
          
          console.log("Converted lastWatered to:", data.lastWatered);
        } catch (e) {
          console.error("Date conversion error:", e, data.lastWatered);
          return res.status(400).json({ 
            message: "Invalid date format for lastWatered", 
          });
        }
      } else {
        // Default to current date if missing
        data.lastWatered = new Date();
        console.log("Using default lastWatered:", data.lastWatered);
      }
      
      // Ensure we have an imageUrl if specified
      if (data.imageUrl) {
        console.log("Using image URL:", data.imageUrl);
      }
      
      const parsedData = insertPlantSchema.safeParse(data);
      
      if (!parsedData.success) {
        console.error("Validation errors:", parsedData.error.format());
        return res.status(400).json({ 
          message: "Invalid plant data", 
          errors: parsedData.error.format()
        });
      }

      const newPlant = await dbStorage.createPlant(parsedData.data);
      console.log("Plant created successfully:", newPlant);
      res.status(201).json(newPlant);
    } catch (error) {
      console.error("Server error creating plant:", error);
      res.status(500).json({ message: "Failed to create plant" });
    }
  });

  // Update a plant
  apiRouter.patch("/plants/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid plant ID" });
      }

      console.log("Received plant update request for ID:", id, "with data:", req.body);
      
      // Convert lastWatered string to Date if needed
      let data = {...req.body};
      
      // Handle date conversion issue for lastWatered
      if (data.lastWatered) {
        try {
          // Handle different date formats safely
          if (typeof data.lastWatered === 'string') {
            data.lastWatered = new Date(data.lastWatered);
          } else if (data.lastWatered instanceof Date) {
            // Already a Date object, ensure it's valid
            if (isNaN(data.lastWatered.getTime())) {
              throw new Error('Invalid date object');
            }
          } else if (data.lastWatered && typeof data.lastWatered === 'object') {
            // Handle potential serialized date objects
            data.lastWatered = new Date(data.lastWatered);
          }
          
          console.log("Converted lastWatered to:", data.lastWatered);
        } catch (e) {
          console.error("Date conversion error:", e, data.lastWatered);
          return res.status(400).json({ 
            message: "Invalid date format for lastWatered", 
          });
        }
      }

      // Validate the update data
      const updateSchema = insertPlantSchema.partial();
      const parsedData = updateSchema.safeParse(data);
      
      if (!parsedData.success) {
        console.error("Validation errors:", parsedData.error.format());
        return res.status(400).json({ 
          message: "Invalid plant data", 
          errors: parsedData.error.format()
        });
      }

      const updatedPlant = await dbStorage.updatePlant(id, parsedData.data);
      if (!updatedPlant) {
        return res.status(404).json({ message: "Plant not found" });
      }

      console.log("Plant updated successfully:", updatedPlant);
      res.json(updatedPlant);
    } catch (error) {
      console.error("Server error updating plant:", error);
      res.status(500).json({ message: "Failed to update plant" });
    }
  });

  // Delete a plant
  apiRouter.delete("/plants/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid plant ID" });
      }

      const deleted = await dbStorage.deletePlant(id);
      if (!deleted) {
        return res.status(404).json({ message: "Plant not found" });
      }

      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete plant" });
    }
  });

  // Water a plant
  apiRouter.post("/plants/:id/water", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid plant ID" });
      }

      const wateringEntry = await dbStorage.waterPlant(id);
      const updatedPlant = await dbStorage.getPlant(id);
      
      // Send a confirmation notification via Pushover
      const notificationTitle = "🪴 PlantDaddy: Plant Watered";
      const notificationMessage = `${updatedPlant?.name} has been watered successfully.`;
      
      // We don't need to await this, it can happen in the background
      sendPushoverNotification(notificationTitle, notificationMessage, 0)
        .catch((err: Error) => console.error("Failed to send watering confirmation notification:", err));

      res.json({
        success: true,
        watering: wateringEntry,
        plant: updatedPlant
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to water plant" });
    }
  });

  // Get watering history for a plant
  apiRouter.get("/plants/:id/watering-history", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid plant ID" });
      }

      const history = await dbStorage.getWateringHistory(id);
      res.json(history);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch watering history" });
    }
  });

  // Get all locations
  apiRouter.get("/locations", async (req: Request, res: Response) => {
    try {
      const locations = await dbStorage.getAllLocations();
      res.json(locations);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch locations" });
    }
  });

  // Create a new location
  apiRouter.post("/locations", async (req: Request, res: Response) => {
    try {
      // Get the current user ID from the session
      const userId = getCurrentUserId();
      if (!userId) {
        return res.status(401).json({ error: "You must be logged in to create a location" });
      }
      
      // Add the userId to the request body
      const locationData = {
        ...req.body,
        userId
      };
      
      const parsedData = insertLocationSchema.safeParse(locationData);
      
      if (!parsedData.success) {
        return res.status(400).json({ 
          message: "Invalid location data", 
          errors: parsedData.error.format()
        });
      }

      const newLocation = await dbStorage.createLocation(parsedData.data);
      res.status(201).json(newLocation);
    } catch (error: any) {
      const errorMessage = error?.message || "Failed to create location";
      res.status(400).json({ message: errorMessage });
    }
  });

  // Update a location
  apiRouter.patch("/locations/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid location ID" });
      }

      // Validate the update data
      const updateSchema = insertLocationSchema.partial();
      const parsedData = updateSchema.safeParse(req.body);
      
      if (!parsedData.success) {
        return res.status(400).json({ 
          message: "Invalid location data", 
          errors: parsedData.error.format()
        });
      }

      const updatedLocation = await dbStorage.updateLocation(id, parsedData.data);
      if (!updatedLocation) {
        return res.status(404).json({ message: "Location not found" });
      }

      res.json(updatedLocation);
    } catch (error: any) {
      const errorMessage = error?.message || "Failed to update location";
      res.status(400).json({ message: errorMessage });
    }
  });

  // Delete a location
  apiRouter.delete("/locations/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid location ID" });
      }

      const deleted = await dbStorage.deleteLocation(id);
      res.json({ success: true });
    } catch (error: any) {
      const errorMessage = error?.message || "Failed to delete location";
      res.status(400).json({ message: errorMessage });
    }
  });

  // Upload a plant image
  apiRouter.post("/plants/:id/upload", upload.single('image'), async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid plant ID" });
      }

      const plant = await dbStorage.getPlant(id);
      if (!plant) {
        return res.status(404).json({ message: "Plant not found" });
      }

      // Get uploaded file info
      const file = req.file;
      if (!file) {
        return res.status(400).json({ message: "No image file uploaded" });
      }

      // Create a public URL path for the image
      const imageUrl = `/uploads/${file.filename}`;

      // Update plant with image URL
      const updatedPlant = await dbStorage.updatePlant(id, { imageUrl });
      
      res.json({ 
        success: true, 
        imageUrl,
        plant: updatedPlant
      });
    } catch (error: any) {
      const errorMessage = error?.message || "Failed to upload image";
      res.status(400).json({ message: errorMessage });
    }
  });

  // Notification endpoints
  apiRouter.post("/notifications/test", async (req: Request, res: Response) => {
    try {
      const sent = await sendWelcomeNotification();
      
      if (sent) {
        res.json({ success: true, message: "Test notification sent successfully" });
      } else {
        res.status(500).json({ success: false, message: "Failed to send test notification" });
      }
    } catch (error: any) {
      const errorMessage = error?.message || "Failed to send test notification";
      res.status(500).json({ success: false, message: errorMessage });
    }
  });

  apiRouter.post("/notifications/check-plants", async (req: Request, res: Response) => {
    try {
      const plants = await dbStorage.getAllPlants();
      const notificationCount = await checkPlantsAndSendNotifications(plants);
      
      res.json({ 
        success: true, 
        notificationCount,
        message: `Sent notifications for ${notificationCount} plants that need watering`
      });
    } catch (error: any) {
      const errorMessage = error?.message || "Failed to check plants and send notifications";
      res.status(500).json({ success: false, message: errorMessage });
    }
  });

  // Send notification for a specific plant
  apiRouter.post("/plants/:id/notify", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid plant ID" });
      }

      const plant = await dbStorage.getPlant(id);
      if (!plant) {
        return res.status(404).json({ message: "Plant not found" });
      }

      const sent = await sendPlantWateringNotification(plant);
      
      if (sent) {
        res.json({ success: true, message: `Sent watering notification for ${plant.name}` });
      } else {
        res.status(500).json({ success: false, message: "Failed to send notification" });
      }
    } catch (error: any) {
      const errorMessage = error?.message || "Failed to send plant notification";
      res.status(500).json({ success: false, message: errorMessage });
    }
  });

  // Plant Species Catalog routes
  
  // Get all plant species
  apiRouter.get("/plant-species", async (req: Request, res: Response) => {
    try {
      const query = req.query.q as string;
      let species;
      
      if (query) {
        species = await dbStorage.searchPlantSpecies(query);
      } else {
        species = await dbStorage.getAllPlantSpecies();
      }
      
      res.json(species);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch plant species" });
    }
  });
  
  // Get a specific plant species
  apiRouter.get("/plant-species/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid plant species ID" });
      }
      
      const species = await dbStorage.getPlantSpecies(id);
      if (!species) {
        return res.status(404).json({ message: "Plant species not found" });
      }
      
      res.json(species);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch plant species details" });
    }
  });
  
  // Create a new plant species
  apiRouter.post("/plant-species", async (req: Request, res: Response) => {
    try {
      const parsedData = insertPlantSpeciesSchema.safeParse(req.body);
      
      if (!parsedData.success) {
        return res.status(400).json({ 
          message: "Invalid plant species data", 
          errors: parsedData.error.format() 
        });
      }
      
      const newSpecies = await dbStorage.createPlantSpecies(parsedData.data);
      res.status(201).json(newSpecies);
    } catch (error: any) {
      const errorMessage = error?.message || "Failed to create plant species";
      res.status(400).json({ message: errorMessage });
    }
  });
  
  // Update a plant species
  apiRouter.patch("/plant-species/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid plant species ID" });
      }
      
      const updateSchema = insertPlantSpeciesSchema.partial();
      const parsedData = updateSchema.safeParse(req.body);
      
      if (!parsedData.success) {
        return res.status(400).json({ 
          message: "Invalid plant species data", 
          errors: parsedData.error.format() 
        });
      }
      
      const updatedSpecies = await dbStorage.updatePlantSpecies(id, parsedData.data);
      if (!updatedSpecies) {
        return res.status(404).json({ message: "Plant species not found" });
      }
      
      res.json(updatedSpecies);
    } catch (error: any) {
      const errorMessage = error?.message || "Failed to update plant species";
      res.status(400).json({ message: errorMessage });
    }
  });
  
  // Delete a plant species
  apiRouter.delete("/plant-species/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid plant species ID" });
      }
      
      const deleted = await dbStorage.deletePlantSpecies(id);
      if (!deleted) {
        return res.status(404).json({ message: "Plant species not found" });
      }
      
      res.json({ success: true });
    } catch (error: any) {
      const errorMessage = error?.message || "Failed to delete plant species";
      res.status(400).json({ message: errorMessage });
    }
  });

  // Notification Settings endpoints
  
  // Get notification settings
  apiRouter.get("/notification-settings", async (req: Request, res: Response) => {
    try {
      const settings = await dbStorage.getNotificationSettings();
      // If no settings exist yet, return default values
      if (!settings) {
        return res.json({
          id: null,
          enabled: true,
          pushoverAppToken: process.env.PUSHOVER_APP_TOKEN ? true : false, // Just return boolean indicating if token exists
          pushoverUserKey: process.env.PUSHOVER_USER_KEY ? true : false, // Just return boolean indicating if key exists
          lastUpdated: null
        });
      }
      
      // Don't expose actual tokens in the response for security reasons
      // Just indicate whether they exist or not
      res.json({
        id: settings.id,
        enabled: settings.enabled,
        pushoverAppToken: !!settings.pushoverAppToken,
        pushoverUserKey: !!settings.pushoverUserKey,
        lastUpdated: settings.lastUpdated
      });
    } catch (error: any) {
      const errorMessage = error?.message || "Failed to fetch notification settings";
      res.status(500).json({ message: errorMessage });
    }
  });

  // Update notification settings
  apiRouter.post("/notification-settings", async (req: Request, res: Response) => {
    try {
      // Use partial schema to validate the update data
      const updateSchema = insertNotificationSettingsSchema.partial();
      const parsedData = updateSchema.safeParse(req.body);
      
      if (!parsedData.success) {
        return res.status(400).json({ 
          message: "Invalid notification settings data", 
          errors: parsedData.error.format()
        });
      }

      const updatedSettings = await dbStorage.updateNotificationSettings(parsedData.data);
      
      // Don't expose actual tokens in the response for security reasons
      res.json({
        id: updatedSettings.id,
        enabled: updatedSettings.enabled,
        pushoverAppToken: !!updatedSettings.pushoverAppToken,
        pushoverUserKey: !!updatedSettings.pushoverUserKey,
        lastUpdated: updatedSettings.lastUpdated
      });
    } catch (error: any) {
      const errorMessage = error?.message || "Failed to update notification settings";
      res.status(500).json({ message: errorMessage });
    }
  });

  // Test notification settings
  apiRouter.post("/notification-settings/test", async (req: Request, res: Response) => {
    try {
      const sent = await sendWelcomeNotification();
      
      if (sent) {
        res.json({ success: true, message: "Test notification sent successfully" });
      } else {
        res.status(500).json({ success: false, message: "Failed to send test notification" });
      }
    } catch (error: any) {
      const errorMessage = error?.message || "Failed to send test notification";
      res.status(500).json({ success: false, message: errorMessage });
    }
  });
  
  // Add API router to app
  // Apply user context middleware before API routes to make user data available
  app.use(setUserContext);
  
  // Mount API routes
  app.use("/api", apiRouter);

  const httpServer = createServer(app);
  
  // Send welcome notification on startup
  sendWelcomeNotification().then(sent => {
    if (sent) {
      console.log("PlantDaddy welcome notification sent successfully");
    } else {
      console.warn("Failed to send PlantDaddy welcome notification");
    }
  });
  
  return httpServer;
}
