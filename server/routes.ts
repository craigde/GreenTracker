import express, { type Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";
import { insertPlantSchema, insertLocationSchema } from "@shared/schema";
import multer from "multer";
import path from "path";
import fs from "fs";

export async function registerRoutes(app: Express): Promise<Server> {
  const apiRouter = express.Router();

  // Get all plants
  apiRouter.get("/plants", async (req: Request, res: Response) => {
    try {
      const plants = await storage.getAllPlants();
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

      const plant = await storage.getPlant(id);
      if (!plant) {
        return res.status(404).json({ message: "Plant not found" });
      }

      const wateringHistory = await storage.getWateringHistory(id);
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

      const newPlant = await storage.createPlant(parsedData.data);
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

      const updatedPlant = await storage.updatePlant(id, parsedData.data);
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

      const deleted = await storage.deletePlant(id);
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

      const wateringEntry = await storage.waterPlant(id);
      const updatedPlant = await storage.getPlant(id);

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

      const history = await storage.getWateringHistory(id);
      res.json(history);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch watering history" });
    }
  });

  // Get all locations
  apiRouter.get("/locations", async (req: Request, res: Response) => {
    try {
      const locations = await storage.getAllLocations();
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

      const newLocation = await storage.createLocation(parsedData.data);
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

      const updatedLocation = await storage.updateLocation(id, parsedData.data);
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

      const deleted = await storage.deleteLocation(id);
      res.json({ success: true });
    } catch (error: any) {
      const errorMessage = error?.message || "Failed to delete location";
      res.status(400).json({ message: errorMessage });
    }
  });

  // Add API router to app
  app.use("/api", apiRouter);

  const httpServer = createServer(app);
  return httpServer;
}
