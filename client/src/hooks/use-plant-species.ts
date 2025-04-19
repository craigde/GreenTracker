import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest, getQueryFn } from '@/lib/queryClient';
import type { PlantSpecies } from '@shared/schema';

export function usePlantSpecies() {
  // Get all plant species with optional search query
  const getPlantSpecies = (query?: string) => {
    return useQuery<PlantSpecies[]>({
      queryKey: query ? ['plant-species', query] : ['plant-species'],
      queryFn: getQueryFn<PlantSpecies[]>({
        on401: 'throw',
        path: query 
          ? `/api/plant-species?q=${encodeURIComponent(query)}` 
          : '/api/plant-species'
      })
    });
  };

  // Get a specific plant species by ID
  const getPlantSpeciesById = (id: number | null) => {
    return useQuery<PlantSpecies>({
      queryKey: ['plant-species', id],
      queryFn: getQueryFn<PlantSpecies>({
        on401: 'throw',
        path: `/api/plant-species/${id}`
      }),
      enabled: !!id // Only run the query if ID is provided
    });
  };

  // Add a new plant species
  const addPlantSpecies = useMutation({
    mutationFn: async (newSpecies: Omit<PlantSpecies, 'id'>) => {
      const response = await apiRequest('/api/plant-species', {
        method: 'POST',
        body: JSON.stringify(newSpecies),
        headers: {
          'Content-Type': 'application/json',
        },
      });
      return response as PlantSpecies;
    },
    onSuccess: () => {
      // Invalidate the plant species cache to trigger a refetch
      queryClient.invalidateQueries({ queryKey: ['plant-species'] });
    },
  });

  // Update a plant species
  const updatePlantSpecies = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<PlantSpecies> }) => {
      const response = await apiRequest(`/api/plant-species/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
        headers: {
          'Content-Type': 'application/json',
        },
      });
      return response as PlantSpecies;
    },
    onSuccess: (_data, variables) => {
      // Invalidate the individual plant species and the list
      queryClient.invalidateQueries({ queryKey: ['plant-species', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['plant-species'] });
    },
  });

  // Delete a plant species
  const deletePlantSpecies = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest(`/api/plant-species/${id}`, {
        method: 'DELETE',
      });
      return response as boolean;
    },
    onSuccess: () => {
      // Invalidate the plant species cache after deletion
      queryClient.invalidateQueries({ queryKey: ['plant-species'] });
    },
  });

  return {
    getPlantSpecies,
    getPlantSpeciesById,
    addPlantSpecies,
    updatePlantSpecies,
    deletePlantSpecies
  };
}