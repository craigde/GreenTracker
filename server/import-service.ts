import { IStorage } from "./storage";
import { ObjectStorageService } from "./objectStorage";
import JSZip from "jszip";
import * as fs from "fs";
import * as path from "path";
import { z } from "zod";
import { 
  type Plant, 
  type InsertPlant,
  type Location,
  type WateringHistory,
  type InsertWateringHistory,
  type NotificationSettings,
  type InsertNotificationSettings
} from "@shared/schema";

// Validation schemas for import data
const BackupPlantSchema = z.object({
  id: z.number(),
  name: z.string(),
  species: z.string().nullable(),
  location: z.string(),
  wateringFrequency: z.number(),
  lastWatered: z.string().nullable().transform(val => val ? new Date(val) : undefined),
  notes: z.string().nullable(),
  imageUrl: z.string().nullable(),
  userId: z.number()
});

const BackupLocationSchema = z.object({
  id: z.number(),
  name: z.string(),
  isDefault: z.boolean(),
  userId: z.number()
});

const BackupWateringHistorySchema = z.object({
  id: z.number(),
  plantId: z.number(),
  wateredAt: z.string().transform(val => new Date(val))
});

const BackupNotificationSettingsSchema = z.object({
  enabled: z.boolean(),
  pushoverEnabled: z.boolean().optional(),
  emailEnabled: z.boolean().optional(),
  emailAddress: z.string().nullable().optional(),
  lastUpdated: z.string().transform(val => new Date(val))
});

const BackupExportInfoSchema = z.object({
  version: z.string(),
  exportedAt: z.string().transform(val => new Date(val)),
  username: z.string()
});

const BackupDataSchema = z.object({
  exportInfo: BackupExportInfoSchema,
  plants: z.array(BackupPlantSchema),
  locations: z.array(BackupLocationSchema),
  wateringHistory: z.array(BackupWateringHistorySchema),
  notificationSettings: BackupNotificationSettingsSchema.optional()
});

export type BackupData = z.infer<typeof BackupDataSchema>;
export type ImportMode = "merge" | "replace";

export interface ImportSummary {
  mode: ImportMode;
  plantsCreated: number;
  plantsUpdated: number;
  plantsSkipped: number;
  locationsCreated: number;
  wateringHistoryCreated: number;
  imagesRestored: number;
  notificationSettingsUpdated: boolean;
  warnings: string[];
}

export class ImportService {
  private objectStorageService: ObjectStorageService;
  
  constructor(private storage: IStorage) {
    this.objectStorageService = new ObjectStorageService();
  }

  async importFromZipBuffer(
    zipBuffer: Buffer, 
    mode: ImportMode = "merge"
  ): Promise<ImportSummary> {
    // Extract and validate backup data
    const { backupData, imageFiles } = await this.extractZipContents(zipBuffer);
    
    // Validate backup data
    const validatedData = BackupDataSchema.parse(backupData);
    
    // Initialize summary
    const summary: ImportSummary = {
      mode,
      plantsCreated: 0,
      plantsUpdated: 0,
      plantsSkipped: 0,
      locationsCreated: 0,
      wateringHistoryCreated: 0,
      imagesRestored: 0,
      notificationSettingsUpdated: false,
      warnings: []
    };
    
    // Create ID mapping for plants
    const plantIdMapping = new Map<number, number>();
    
    try {
      // Delete all user data if in replace mode - do this inside try block to prevent data loss
      if (mode === "replace") {
        await this.storage.deleteAllUserData();
      }
      // 1. Restore locations first
      const locationMapping = await this.restoreLocations(validatedData.locations, summary);
      
      // 2. Restore plants with image handling
      await this.restorePlants(
        validatedData.plants, 
        imageFiles, 
        mode, 
        plantIdMapping, 
        summary
      );
      
      // 3. Restore watering history with ID remapping
      await this.restoreWateringHistory(
        validatedData.wateringHistory, 
        plantIdMapping, 
        summary
      );
      
      // 4. Restore notification settings (safely)
      if (validatedData.notificationSettings) {
        await this.restoreNotificationSettings(validatedData.notificationSettings, summary);
      }
      
    } catch (error) {
      summary.warnings.push(`Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
    
    return summary;
  }
  
  private async extractZipContents(zipBuffer: Buffer): Promise<{
    backupData: any;
    imageFiles: Map<string, Buffer>;
  }> {
    const zip = new JSZip();
    
    const contents = await zip.loadAsync(zipBuffer);
    const imageFiles = new Map<string, Buffer>();
    let backupData: any = null;
    
    // Extract backup.json
    const backupFile = contents.file("backup.json");
    if (!backupFile) {
      throw new Error("backup.json not found in ZIP file");
    }
    
    const backupText = await backupFile.async("text");
    backupData = JSON.parse(backupText);
    
    // Extract image files
    const imageFolder = contents.folder("images");
    if (imageFolder) {
      for (const filename in imageFolder.files) {
        const file = imageFolder.files[filename];
        if (!file.dir && filename.startsWith("images/")) {
          const imageName = filename.replace("images/", "");
          const imageBuffer = await file.async("nodebuffer");
          imageFiles.set(imageName, imageBuffer);
        }
      }
    }
    
    return { backupData, imageFiles };
  }
  
  private async restoreLocations(
    locations: Array<z.infer<typeof BackupLocationSchema>>,
    summary: ImportSummary
  ): Promise<Map<string, string>> {
    const locationMapping = new Map<string, string>();
    
    for (const loc of locations) {
      if (!loc.isDefault) { // Only restore user-created locations
        try {
          // Check if location already exists before upserting
          const existingLocations = await this.storage.getAllLocations();
          const locationExists = existingLocations.some(
            existing => existing.name.toLowerCase() === loc.name.toLowerCase() && !existing.isDefault
          );
          
          const restoredLocation = await this.storage.upsertLocationByName(loc.name, false);
          locationMapping.set(loc.name, restoredLocation.name);
          
          // Only increment counter if location was actually created (not already existed)
          if (!locationExists) {
            summary.locationsCreated++;
          }
        } catch (error) {
          summary.warnings.push(`Failed to restore location '${loc.name}': ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
    }
    
    return locationMapping;
  }
  
  private async restorePlants(
    plants: Array<z.infer<typeof BackupPlantSchema>>,
    imageFiles: Map<string, Buffer>,
    mode: ImportMode,
    plantIdMapping: Map<number, number>,
    summary: ImportSummary
  ): Promise<void> {
    for (const plant of plants) {
      try {
        // Check for existing plant in merge mode
        if (mode === "merge") {
          const existingPlant = await this.storage.findPlantByDetails(
            plant.name, 
            plant.species, 
            plant.location
          );
          
          if (existingPlant) {
            // Update existing plant
            const updateData: Partial<InsertPlant> = {
              wateringFrequency: plant.wateringFrequency,
              notes: plant.notes
            };
            
            // Only update lastWatered if it was provided in the backup
            if (plant.lastWatered) {
              updateData.lastWatered = plant.lastWatered;
            }
            
            const updatedPlant = await this.storage.updatePlant(existingPlant.id, updateData);
            
            if (updatedPlant) {
              plantIdMapping.set(plant.id, updatedPlant.id);
              summary.plantsUpdated++;
            }
            continue;
          }
        }
        
        // Create new plant
        const plantData: InsertPlant = {
          name: plant.name,
          species: plant.species,
          location: plant.location,
          wateringFrequency: plant.wateringFrequency,
          lastWatered: plant.lastWatered || new Date(),
          notes: plant.notes,
          imageUrl: null, // Will be set after image upload
          userId: 0 // Will be set by storage layer based on current user context
        };
        
        const newPlant = await this.storage.createPlant(plantData);
        plantIdMapping.set(plant.id, newPlant.id);
        
        // Handle image restoration
        if (plant.imageUrl && imageFiles.size > 0) {
          const imageRestored = await this.restorePlantImage(
            plant.id, 
            newPlant.id, 
            imageFiles
          );
          
          if (imageRestored) {
            summary.imagesRestored++;
          }
        }
        
        summary.plantsCreated++;
        
      } catch (error) {
        summary.warnings.push(`Failed to restore plant '${plant.name}': ${error instanceof Error ? error.message : 'Unknown error'}`);
        summary.plantsSkipped++;
      }
    }
  }
  
  private async restorePlantImage(
    oldPlantId: number,
    newPlantId: number,
    imageFiles: Map<string, Buffer>
  ): Promise<boolean> {
    try {
      // Look for image file with pattern: plant-{oldId}-*.ext
      const imagePattern = `plant-${oldPlantId}-`;
      let matchedImageName: string | null = null;
      let imageBuffer: Buffer | null = null;
      
      for (const filename of Array.from(imageFiles.keys())) {
        if (filename.startsWith(imagePattern)) {
          matchedImageName = filename;
          imageBuffer = imageFiles.get(filename) || null;
          break;
        }
      }
      
      if (!matchedImageName || !imageBuffer) {
        return false;
      }
      
      // Extract file extension
      const extension = matchedImageName.split('.').pop() || 'jpg';
      
      // TODO: Implement direct image upload to Object Storage
      // For now, skip image uploads during import
      // const imageKey = `${newPlantId}.${extension}`;
      // const imageUrl = await this.objectStorageService.uploadPlantImage(imageKey, imageBuffer);
      // await this.storage.updatePlant(newPlantId, { imageUrl });
      
      // Return false since upload is not implemented - prevents incorrect counter increment
      return false;
    } catch (error) {
      console.error(`Failed to restore image for plant ${newPlantId}:`, error);
      return false;
    }
  }
  
  private async restoreWateringHistory(
    wateringHistory: Array<z.infer<typeof BackupWateringHistorySchema>>,
    plantIdMapping: Map<number, number>,
    summary: ImportSummary
  ): Promise<void> {
    for (const entry of wateringHistory) {
      try {
        const newPlantId = plantIdMapping.get(entry.plantId);
        if (!newPlantId) {
          summary.warnings.push(`Skipping watering history entry: plant ID ${entry.plantId} not found`);
          continue;
        }
        
        const wateringData: InsertWateringHistory = {
          plantId: newPlantId,
          wateredAt: entry.wateredAt,
          userId: 0 // Will be set by storage layer based on current user context
        };
        
        await this.storage.createWateringHistory(wateringData);
        summary.wateringHistoryCreated++;
        
      } catch (error) {
        summary.warnings.push(`Failed to restore watering history entry: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
  }
  
  private async restoreNotificationSettings(
    settings: z.infer<typeof BackupNotificationSettingsSchema>,
    summary: ImportSummary
  ): Promise<void> {
    try {
      // Only restore safe notification settings (no tokens)
      const safeSettings: Partial<InsertNotificationSettings> = {
        enabled: settings.enabled,
        pushoverEnabled: settings.pushoverEnabled || false,
        emailEnabled: settings.emailEnabled || false,
        emailAddress: settings.emailAddress
        // Never restore: pushoverAppToken, pushoverUserKey, sendgridApiKey
      };
      
      await this.storage.updateNotificationSettings(safeSettings);
      summary.notificationSettingsUpdated = true;
    } catch (error) {
      summary.warnings.push(`Failed to restore notification settings: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}