import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

export type ImportMode = 'merge' | 'replace';

interface ImportSummary {
  plantsImported: number;
  locationsImported: number;
  wateringHistoryImported: number;
  imagesImported: number;
  mode: ImportMode;
}

interface ImportResponse {
  success: boolean;
  message: string;
  summary: ImportSummary;
}

export function useImport() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const importMutation = useMutation({
    mutationFn: async ({ file, mode }: { file: File; mode: ImportMode }): Promise<ImportResponse> => {
      const formData = new FormData();
      formData.append('backup', file);
      formData.append('mode', mode);

      const response = await fetch("/api/import", {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: "Import failed" }));
        throw new Error(errorData.message || "Failed to import backup data");
      }

      const result = await response.json();
      return result;
    },
    onSuccess: (data: ImportResponse) => {
      const { summary } = data;
      
      // Invalidate all relevant queries to refresh the UI
      queryClient.invalidateQueries({ queryKey: ['/api/plants'] });
      queryClient.invalidateQueries({ queryKey: ['/api/locations'] });
      queryClient.invalidateQueries({ queryKey: ['/api/notification-settings'] });

      toast({
        title: "Import successful",
        description: `Successfully imported ${summary.plantsImported} plants, ${summary.locationsImported} locations, and ${summary.wateringHistoryImported} watering records`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Import failed",
        description: error.message || "Failed to import your backup data",
        variant: "destructive",
      });
    },
  });

  return {
    importData: importMutation.mutate,
    isImporting: importMutation.isPending,
    error: importMutation.error,
    reset: importMutation.reset,
  };
}