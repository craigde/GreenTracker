import express, { type Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage as dbStorage } from "./storage";
import { z } from "zod";
import { insertPlantSchema, insertLocationSchema } from "@shared/schema";
import multer from "multer";
import path from "path";
import fs from "fs";
import { sendPlantWateringNotification, sendWelcomeNotification, checkPlantsAndSendNotifications, sendPushoverNotification } from "./notifications";

export async function registerRoutes(app: Express): Promise<Server> {
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
      const parsedData = insertPlantSchema.safeParse(req.body);
      
      if (!parsedData.success) {
        return res.status(400).json({ 
          message: "Invalid plant data", 
          errors: parsedData.error.format()
        });
      }

      const newPlant = await dbStorage.createPlant(parsedData.data);
      res.status(201).json(newPlant);
    } catch (error) {
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

      // Validate the update data
      const updateSchema = insertPlantSchema.partial();
      const parsedData = updateSchema.safeParse(req.body);
      
      if (!parsedData.success) {
        return res.status(400).json({ 
          message: "Invalid plant data", 
          errors: parsedData.error.format()
        });
      }

      const updatedPlant = await dbStorage.updatePlant(id, parsedData.data);
      if (!updatedPlant) {
        return res.status(404).json({ message: "Plant not found" });
      }

      res.json(updatedPlant);
    } catch (error) {
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
      const parsedData = insertLocationSchema.safeParse(req.body);
      
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

  // Add API router to app
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
