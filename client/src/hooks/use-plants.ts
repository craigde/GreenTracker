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
      queryKey: ["/api/plants", id],
      enabled: !!id
    });
  };
  
  // Create a new plant
  const createPlant = useMutation({
    mutationFn: async (plant: InsertPlant) => {
      try {
        console.log("Creating plant with data:", plant);
        const res = await apiRequest("POST", "/api/plants", plant);
        if (typeof res.json === 'function') {
          return await res.json();
        }
        return res; // If already parsed as JSON by apiRequest
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
      const res = await apiRequest("PATCH", `/api/plants/${id}`, data);
      return res.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/plants"] });
      queryClient.invalidateQueries({ queryKey: ["/api/plants", variables.id] });
    },
  });
  
  // Delete a plant
  const deletePlant = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/plants/${id}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/plants"] });
    },
  });
  
  // Water a plant
  const waterPlant = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("POST", `/api/plants/${id}/water`);
      return res.json();
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ["/api/plants"] });
      queryClient.invalidateQueries({ queryKey: ["/api/plants", id] });
    },
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
