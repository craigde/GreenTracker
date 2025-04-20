import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plant, InsertPlant } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";

export function usePlants() {
  const queryClient = useQueryClient();
  
  // Fetch all plants
  const {
    data: plants = [],
    isLoading,
    error,
  } = useQuery<Plant[]>({
    queryKey: ["/api/plants"],
  });
  
  // Fetch a single plant with watering history
  const useGetPlant = (id: number) => {
    return useQuery<Plant & { wateringHistory: any[] }>({
      queryKey: [`/api/plants/${id}`],
      enabled: !!id,
      onSettled: (data, error) => {
        if (data) {
          console.log("Plant detail data retrieved:", data);
        }
        if (error) {
          console.error("Error retrieving plant details:", error);
        }
      }
    });
  };
  
  // Create a new plant
  const createPlant = useMutation({
    mutationFn: async (plant: InsertPlant) => {
      try {
        console.log("Creating plant with data:", plant);
        const res = await apiRequest({
          url: "/api/plants", 
          method: "POST", 
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(plant)
        });
        return res; // apiRequest handles JSON parsing
      } catch (error) {
        console.error("Error creating plant:", error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/plants"] });
    },
    onError: (error) => {
      console.error("Plant creation mutation error:", error);
    }
  });
  
  // Update a plant
  const updatePlant = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<InsertPlant> }) => {
      try {
        console.log("Updating plant with ID:", id, "with data:", data);
        const res = await apiRequest({
          url: `/api/plants/${id}`,
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data)
        });
        return res;
      } catch (error) {
        console.error("Error updating plant:", error);
        throw error;
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/plants"] });
      queryClient.invalidateQueries({ queryKey: ["/api/plants", variables.id] });
    },
    onError: (error) => {
      console.error("Plant update mutation error:", error);
    }
  });
  
  // Delete a plant
  const deletePlant = useMutation({
    mutationFn: async (id: number) => {
      try {
        console.log("Deleting plant with ID:", id);
        const res = await apiRequest({
          url: `/api/plants/${id}`,
          method: "DELETE"
        });
        return res;
      } catch (error) {
        console.error("Error deleting plant:", error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/plants"] });
    },
    onError: (error) => {
      console.error("Plant deletion mutation error:", error);
    }
  });
  
  // Water a plant
  const waterPlant = useMutation({
    mutationFn: async (id: number) => {
      try {
        console.log("Watering plant with ID:", id);
        const res = await apiRequest({
          url: `/api/plants/${id}/water`,
          method: "POST"
        });
        return res;
      } catch (error) {
        console.error("Error watering plant:", error);
        throw error;
      }
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ["/api/plants"] });
      queryClient.invalidateQueries({ queryKey: ["/api/plants", id] });
    },
    onError: (error) => {
      console.error("Plant watering mutation error:", error);
    }
  });
  
  // Upload an image for a plant
  const uploadPlantImage = useMutation({
    mutationFn: async ({ id, imageFile }: { id: number; imageFile: File }) => {
      const formData = new FormData();
      formData.append('image', imageFile);
      
      const res = await fetch(`/api/plants/${id}/upload`, {
        method: 'POST',
        body: formData,
      });
      
      if (!res.ok) {
        throw new Error('Failed to upload image');
      }
      
      return res.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/plants"] });
      queryClient.invalidateQueries({ queryKey: ["/api/plants", variables.id] });
    },
  });
  
  return {
    plants,
    isLoading,
    error,
    useGetPlant,
    createPlant,
    updatePlant,
    deletePlant,
    waterPlant,
    uploadPlantImage,
  };
}
