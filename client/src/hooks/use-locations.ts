import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Location, InsertLocation } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";

export function useLocations() {
  const queryClient = useQueryClient();
  
  // Fetch all locations
  const {
    data: locations = [],
    isLoading,
    error,
  } = useQuery<Location[]>({
    queryKey: ["/api/locations"],
  });
  
  // Create a new location
  const createLocation = useMutation({
    mutationFn: async (location: InsertLocation) => {
      const res = await apiRequest("POST", "/api/locations", location);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/locations"] });
    },
  });
  
  // Update a location
  const updateLocation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<InsertLocation> }) => {
      const res = await apiRequest("PATCH", `/api/locations/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/locations"] });
    },
  });
  
  // Delete a location
  const deleteLocation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/locations/${id}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/locations"] });
    },
  });
  
  return {
    locations,
    isLoading,
    error,
    createLocation,
    updateLocation,
    deleteLocation,
  };
}