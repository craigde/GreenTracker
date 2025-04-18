import { 
  plants, 
  wateringHistory, 
  type Plant, 
  type InsertPlant, 
  type WateringHistory, 
  type InsertWateringHistory,
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
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private plants: Map<number, Plant>;
  private wateringHistory: Map<number, WateringHistory>;
  
  private userIdCounter: number;
  private plantIdCounter: number;
  private wateringHistoryIdCounter: number;

  constructor() {
    this.users = new Map();
    this.plants = new Map();
    this.wateringHistory = new Map();
    
    this.userIdCounter = 1;
    this.plantIdCounter = 1;
    this.wateringHistoryIdCounter = 1;
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
    const plant: Plant = { ...insertPlant, id };
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
}

export const storage = new MemStorage();
