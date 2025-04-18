import { 
  plants, 
  wateringHistory, 
  locations,
  type Plant, 
  type InsertPlant, 
  type WateringHistory, 
  type InsertWateringHistory,
  type Location,
  type InsertLocation,
  users, 
  type User, 
  type InsertUser 
} from "@shared/schema";

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Plant methods
  getAllPlants(): Promise<Plant[]>;
  getPlant(id: number): Promise<Plant | undefined>;
  createPlant(plant: InsertPlant): Promise<Plant>;
  updatePlant(id: number, plant: Partial<InsertPlant>): Promise<Plant | undefined>;
  deletePlant(id: number): Promise<boolean>;
  
  // Watering methods
  waterPlant(plantId: number): Promise<WateringHistory>;
  getWateringHistory(plantId: number): Promise<WateringHistory[]>;

  // Location methods
  getAllLocations(): Promise<Location[]>;
  getLocation(id: number): Promise<Location | undefined>;
  createLocation(location: InsertLocation): Promise<Location>;
  updateLocation(id: number, location: Partial<InsertLocation>): Promise<Location | undefined>;
  deleteLocation(id: number): Promise<boolean>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private plants: Map<number, Plant>;
  private wateringHistory: Map<number, WateringHistory>;
  private locations: Map<number, Location>;
  
  private userIdCounter: number;
  private plantIdCounter: number;
  private wateringHistoryIdCounter: number;
  private locationIdCounter: number;

  constructor() {
    this.users = new Map();
    this.plants = new Map();
    this.wateringHistory = new Map();
    this.locations = new Map();
    
    this.userIdCounter = 1;
    this.plantIdCounter = 1;
    this.wateringHistoryIdCounter = 1;
    this.locationIdCounter = 1;
    
    // Set up default locations
    this.initDefaultLocations();
  }
  
  private initDefaultLocations() {
    const defaultLocations = [
      { name: "Living Room", isDefault: true },
      { name: "Bedroom", isDefault: true },
      { name: "Kitchen", isDefault: true },
      { name: "Bathroom", isDefault: true },
      { name: "Office", isDefault: true },
      { name: "Balcony", isDefault: true },
      { name: "Dining Room", isDefault: true },
      { name: "Hallway", isDefault: true },
      { name: "Porch", isDefault: true },
      { name: "Patio", isDefault: true }
    ];
    
    // Add locations directly to the map
    for (const loc of defaultLocations) {
      const id = this.locationIdCounter++;
      this.locations.set(id, { 
        id, 
        name: loc.name,
        isDefault: loc.isDefault || false
      });
    }
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userIdCounter++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  // Plant methods
  async getAllPlants(): Promise<Plant[]> {
    return Array.from(this.plants.values());
  }

  async getPlant(id: number): Promise<Plant | undefined> {
    return this.plants.get(id);
  }

  async createPlant(insertPlant: InsertPlant): Promise<Plant> {
    const id = this.plantIdCounter++;
    // Ensure species and notes are null if not provided
    const plant: Plant = { 
      ...insertPlant, 
      id,
      species: insertPlant.species || null,
      notes: insertPlant.notes || null
    };
    this.plants.set(id, plant);
    return plant;
  }

  async updatePlant(id: number, plantUpdate: Partial<InsertPlant>): Promise<Plant | undefined> {
    const existingPlant = this.plants.get(id);
    if (!existingPlant) {
      return undefined;
    }

    const updatedPlant: Plant = { ...existingPlant, ...plantUpdate };
    this.plants.set(id, updatedPlant);
    return updatedPlant;
  }

  async deletePlant(id: number): Promise<boolean> {
    return this.plants.delete(id);
  }

  // Watering methods
  async waterPlant(plantId: number): Promise<WateringHistory> {
    const plant = this.plants.get(plantId);
    if (!plant) {
      throw new Error(`Plant with ID ${plantId} not found`);
    }

    // Update plant's last watered date
    const now = new Date();
    this.plants.set(plantId, { ...plant, lastWatered: now });

    // Add watering entry to history
    const id = this.wateringHistoryIdCounter++;
    const wateringEntry: WateringHistory = {
      id,
      plantId,
      wateredAt: now
    };
    
    this.wateringHistory.set(id, wateringEntry);
    return wateringEntry;
  }

  async getWateringHistory(plantId: number): Promise<WateringHistory[]> {
    return Array.from(this.wateringHistory.values())
      .filter((entry) => entry.plantId === plantId)
      .sort((a, b) => b.wateredAt.getTime() - a.wateredAt.getTime()); // Most recent first
  }
  
  // Location methods
  async getAllLocations(): Promise<Location[]> {
    return Array.from(this.locations.values());
  }

  async getLocation(id: number): Promise<Location | undefined> {
    return this.locations.get(id);
  }

  async createLocation(insertLocation: InsertLocation): Promise<Location> {
    // Check if a location with the same name already exists
    const existingLocation = Array.from(this.locations.values()).find(
      (loc) => loc.name.toLowerCase() === insertLocation.name.toLowerCase()
    );
    
    if (existingLocation) {
      throw new Error(`Location with name '${insertLocation.name}' already exists`);
    }
    
    const id = this.locationIdCounter++;
    const location: Location = { 
      id, 
      name: insertLocation.name,
      isDefault: insertLocation.isDefault || false
    };
    this.locations.set(id, location);
    return location;
  }

  async updateLocation(id: number, locationUpdate: Partial<InsertLocation>): Promise<Location | undefined> {
    const existingLocation = this.locations.get(id);
    if (!existingLocation) {
      return undefined;
    }
    
    // If name is being updated, check that it doesn't conflict with existing names
    if (locationUpdate.name && locationUpdate.name !== existingLocation.name) {
      const nameExists = Array.from(this.locations.values()).some(
        (loc) => loc.id !== id && loc.name.toLowerCase() === locationUpdate.name!.toLowerCase()
      );
      
      if (nameExists) {
        throw new Error(`Location with name '${locationUpdate.name}' already exists`);
      }
    }
    
    const updatedLocation: Location = { ...existingLocation, ...locationUpdate };
    this.locations.set(id, updatedLocation);
    return updatedLocation;
  }

  async deleteLocation(id: number): Promise<boolean> {
    const location = this.locations.get(id);
    if (!location) {
      return false;
    }
    
    // Check if any plants are using this location
    const locationName = location.name;
    const plantsUsingLocation = Array.from(this.plants.values()).some(
      (plant) => plant.location === locationName
    );
    
    if (plantsUsingLocation) {
      throw new Error(`Cannot delete location '${locationName}' as it is being used by one or more plants`);
    }
    
    return this.locations.delete(id);
  }
}

export const storage = new MemStorage();
