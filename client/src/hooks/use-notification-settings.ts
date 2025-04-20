import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { NotificationSettings } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";

type NotificationSettingsResponse = {
  id: number | null;
  enabled: boolean;
  pushoverAppToken: boolean; // Indicates if token exists, not the actual token
  pushoverUserKey: boolean; // Indicates if key exists, not the actual key
  lastUpdated: string | null;
};

type UpdateNotificationSettingsParams = {
  enabled?: boolean;
  pushoverAppToken?: string;
  pushoverUserKey?: string;
};

export function useNotificationSettings() {
  const queryClient = useQueryClient();
  
  const { data: settings, isLoading, error } = useQuery<NotificationSettingsResponse>({
    queryKey: ['/api/notification-settings'],
  });

  const updateSettingsMutation = useMutation({
    mutationFn: async (updatedSettings: UpdateNotificationSettingsParams) => {
      return apiRequest('/api/notification-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedSettings),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notification-settings'] });
    },
  });

  const testNotificationMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('/api/notification-settings/test', {
        method: 'POST',
      });
    },
  });

  return {
    settings,
    isLoading,
    error,
    updateSettings: updateSettingsMutation.mutate,
    isUpdating: updateSettingsMutation.isPending,
    updateError: updateSettingsMutation.error,
    testNotification: testNotificationMutation.mutate,
    isTesting: testNotificationMutation.isPending,
    testError: testNotificationMutation.error,
    testSuccess: testNotificationMutation.isSuccess,
  };
}