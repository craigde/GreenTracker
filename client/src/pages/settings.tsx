import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useLocations } from "@/hooks/use-locations";
import { useToast } from "@/hooks/use-toast";
import { useNotificationSettings, NotificationSettingsResponse } from "@/hooks/use-notification-settings";
import { 
  Loader2, 
  PencilIcon, 
  Trash2Icon, 
  PlusIcon, 
  SaveIcon, 
  XIcon, 
  Bell, 
  BellOff,
  CheckCircle, 
  AlertCircle,
  BellRing
} from "lucide-react";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function Settings() {
  const { toast } = useToast();
  const { locations, isLoading, createLocation, updateLocation, deleteLocation } = useLocations();
  const { 
    settings, 
    isLoading: isLoadingSettings, 
    updateSettings, 
    isUpdating,
    testNotification,
    isTesting,
    testSuccess
  } = useNotificationSettings();

  const [newLocation, setNewLocation] = useState("");
  const [editingLocation, setEditingLocation] = useState<{ id: number; name: string } | null>(null);
  const [pushoverAppToken, setPushoverAppToken] = useState("");
  const [pushoverUserKey, setPushoverUserKey] = useState("");
  const [emailAddress, setEmailAddress] = useState("");
  const [sendgridApiKey, setSendgridApiKey] = useState("");
  
  const notificationSettings = settings as NotificationSettingsResponse;

  const handleAddLocation = () => {
    if (!newLocation.trim()) {
      toast({
        title: "Error",
        description: "Location name cannot be empty",
        variant: "destructive",
      });
      return;
    }

    createLocation.mutate(
      { name: newLocation.trim() },
      {
        onSuccess: () => {
          toast({
            title: "Location added",
            description: "New location has been added successfully.",
          });
          setNewLocation("");
        },
        onError: (error: any) => {
          toast({
            title: "Failed to add location",
            description: error?.message || "Please try again.",
            variant: "destructive",
          });
        },
      }
    );
  };

  const handleEditLocation = (id: number, name: string) => {
    setEditingLocation({ id, name });
  };

  const handleSaveEdit = () => {
    if (!editingLocation) return;
    
    if (!editingLocation.name.trim()) {
      toast({
        title: "Error",
        description: "Location name cannot be empty",
        variant: "destructive",
      });
      return;
    }

    updateLocation.mutate(
      { 
        id: editingLocation.id, 
        data: { name: editingLocation.name.trim() } 
      },
      {
        onSuccess: () => {
          toast({
            title: "Location updated",
            description: "Location has been updated successfully.",
          });
          setEditingLocation(null);
        },
        onError: (error: any) => {
          toast({
            title: "Failed to update location",
            description: error?.message || "Please try again.",
            variant: "destructive",
          });
        },
      }
    );
  };

  const handleCancelEdit = () => {
    setEditingLocation(null);
  };

  const handleDeleteLocation = (id: number) => {
    deleteLocation.mutate(id, {
      onSuccess: () => {
        toast({
          title: "Location deleted",
          description: "Location has been removed successfully.",
        });
      },
      onError: (error: any) => {
        toast({
          title: "Failed to delete location",
          description: error?.message || "Please try again.",
          variant: "destructive",
        });
      },
    });
  };

  return (
    <div className="px-4 py-6">
      <header className="mb-6">
        <h1 className="text-2xl font-bold font-heading">Settings</h1>
        <p className="text-muted-foreground">Customize your plant care preferences</p>
      </header>

      <section className="mb-8">
        <h2 className="text-lg font-semibold mb-3 font-heading">Appearance</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Customize the look and feel of PlantDaddy.
        </p>
        <Card className="mb-8">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium">Dark Mode</h3>
                <p className="text-sm text-muted-foreground">Switch between light and dark themes.</p>
              </div>
              <ThemeToggle />
            </div>
          </CardContent>
        </Card>

        <h2 className="text-lg font-semibold mb-3 font-heading">Locations</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Manage the locations where you keep your plants.
        </p>

        <Card className="mb-4">
          <CardContent className="p-4">
            <div className="flex items-center mb-4">
              <Input
                placeholder="Add a new location..."
                value={newLocation}
                onChange={(e) => setNewLocation(e.target.value)}
                className="mr-2"
              />
              <Button 
                onClick={handleAddLocation} 
                disabled={createLocation.isPending || !newLocation.trim()}
                className="bg-primary text-white"
              >
                {createLocation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <PlusIcon className="h-4 w-4" />
                )}
                Add
              </Button>
            </div>

            <div className="space-y-2">
              {isLoading ? (
                <div className="py-4 flex justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : locations.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">No custom locations added yet.</p>
              ) : (
                locations.map((location) => (
                  <div
                    key={location.id}
                    className="flex items-center justify-between py-2 px-3 border-b border-border last:border-0"
                  >
                    {editingLocation && editingLocation.id === location.id ? (
                      <div className="flex-1 flex items-center">
                        <Input
                          value={editingLocation.name}
                          onChange={(e) => setEditingLocation({ ...editingLocation, name: e.target.value })}
                          className="mr-2"
                          autoFocus
                        />
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={handleSaveEdit}
                          className="text-green-600 mr-1"
                          disabled={updateLocation.isPending}
                        >
                          {updateLocation.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <SaveIcon className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={handleCancelEdit}
                          className="text-muted-foreground"
                        >
                          <XIcon className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <>
                        <span className="font-medium flex-1">
                          {location.name}
                          {location.isDefault === true && (
                            <span className="ml-2 text-xs text-muted-foreground">(Default)</span>
                          )}
                        </span>
                        <div className="flex items-center">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleEditLocation(location.id, location.name)}
                            className="text-muted-foreground"
                          >
                            <PencilIcon className="h-4 w-4" />
                          </Button>

                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-red-500"
                                disabled={deleteLocation.isPending}
                              >
                                {deleteLocation.isPending ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Trash2Icon className="h-4 w-4" />
                                )}
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Location</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete "{location.name}"? This action cannot be undone. 
                                  Locations that are being used by plants cannot be deleted.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDeleteLocation(location.id)}
                                  className="bg-red-500 hover:bg-red-600"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </>
                    )}
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="mb-8">
        <h2 className="text-lg font-semibold mb-3 font-heading">Notifications</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Configure your watering reminders and notifications.
        </p>
        <Card className="mb-4">
          <CardContent className="p-4">
            {isLoadingSettings ? (
              <div className="py-4 flex justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between py-2">
                  <div>
                    <h3 className="font-medium flex items-center">
                      {notificationSettings?.enabled ? (
                        <Bell className="h-5 w-5 mr-2 text-primary" />
                      ) : (
                        <BellOff className="h-5 w-5 mr-2 text-muted-foreground" />
                      )}
                      Watering Notifications
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Receive notifications when your plants need watering.
                    </p>
                  </div>
                  <Switch
                    checked={notificationSettings?.enabled ?? false}
                    onCheckedChange={(checked) => {
                      updateSettings({ enabled: checked });
                      toast({
                        title: checked ? "Notifications enabled" : "Notifications disabled",
                        description: checked
                          ? "You will receive watering reminders for your plants."
                          : "You will no longer receive watering reminders.",
                      });
                    }}
                    disabled={isUpdating}
                  />
                </div>

                <div className="mt-6">
                  <h4 className="font-medium mb-3">Pushover Credentials</h4>
                  <p className="text-sm text-muted-foreground mb-4">
                    PlantDaddy uses Pushover to send notifications to your devices. You'll need to provide your Pushover credentials to receive notifications.
                  </p>

                  <div className="space-y-4">
                    <div className="grid gap-2">
                      <Label htmlFor="pushover-app-token">Pushover App Token</Label>
                      <div className="flex items-center">
                        <Input
                          id="pushover-app-token"
                          type="password"
                          value={pushoverAppToken}
                          onChange={(e) => setPushoverAppToken(e.target.value)}
                          placeholder={notificationSettings?.pushoverAppToken ? "••••••••••••••••••••••••••••••" : "Enter your Pushover App Token"}
                          className="mr-2"
                        />
                        {notificationSettings?.pushoverAppToken && (
                          <div className="text-green-500 flex items-center">
                            <CheckCircle className="h-4 w-4 mr-1" />
                            <span className="text-xs">Configured</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="pushover-user-key">Pushover User Key</Label>
                      <div className="flex items-center">
                        <Input
                          id="pushover-user-key"
                          type="password"
                          value={pushoverUserKey}
                          onChange={(e) => setPushoverUserKey(e.target.value)}
                          placeholder={notificationSettings?.pushoverUserKey ? "••••••••••••••••••••••••••••••" : "Enter your Pushover User Key"}
                          className="mr-2"
                        />
                        {notificationSettings?.pushoverUserKey && (
                          <div className="text-green-500 flex items-center">
                            <CheckCircle className="h-4 w-4 mr-1" />
                            <span className="text-xs">Configured</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center space-x-3">
                      <Button 
                        onClick={() => {
                          const updates: any = {};
                          if (pushoverAppToken) updates.pushoverAppToken = pushoverAppToken;
                          if (pushoverUserKey) updates.pushoverUserKey = pushoverUserKey;
                          
                          if (Object.keys(updates).length === 0) {
                            toast({
                              title: "No changes to save",
                              description: "Please enter your Pushover credentials.",
                              variant: "destructive",
                            });
                            return;
                          }
                          
                          // Enable Pushover notifications when credentials are saved
                          updates.pushoverEnabled = true;
                          
                          updateSettings(updates);
                          toast({
                            title: "Credentials saved",
                            description: "Your Pushover credentials have been saved.",
                          });
                          
                          // Clear input fields after saving
                          setPushoverAppToken("");
                          setPushoverUserKey("");
                        }}
                        disabled={isUpdating || (!pushoverAppToken && !pushoverUserKey)}
                      >
                        {isUpdating ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                          <SaveIcon className="h-4 w-4 mr-2" />
                        )}
                        Save Credentials
                      </Button>
                      
                      <Button 
                        variant="outline"
                        onClick={() => {
                          testNotification();
                          toast({
                            title: "Sending test notification",
                            description: "Check your device for the test notification.",
                          });
                        }}
                        disabled={isTesting || !notificationSettings?.pushoverAppToken || !notificationSettings?.pushoverUserKey || !notificationSettings?.enabled}
                      >
                        {isTesting ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                          <BellRing className="h-4 w-4 mr-2" />
                        )}
                        Test Notification
                      </Button>
                    </div>
                    
                    {notificationSettings?.enabled && (!notificationSettings.pushoverAppToken || !notificationSettings.pushoverUserKey) && !notificationSettings.emailEnabled && (
                      <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-md p-3 mt-2">
                        <div className="flex items-start">
                          <AlertCircle className="h-5 w-5 text-amber-500 mt-0.5 mr-2" />
                          <div>
                            <h4 className="font-medium text-amber-800 dark:text-amber-300">Credentials Required</h4>
                            <p className="text-sm text-amber-700 dark:text-amber-400">
                              Please enter your Pushover credentials to receive notifications, or set up Email notifications below.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="mt-8 border-t pt-6">
                  <div className="flex items-center justify-between py-2 mb-3">
                    <div>
                      <h4 className="font-medium flex items-center">
                        Email Notifications
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        Receive watering reminders via email instead of Pushover.
                      </p>
                    </div>
                    <Switch
                      checked={notificationSettings?.emailEnabled ?? false}
                      onCheckedChange={(checked) => {
                        updateSettings({ emailEnabled: checked });
                        toast({
                          title: checked ? "Email notifications enabled" : "Email notifications disabled",
                          description: checked
                            ? "You will receive watering reminders via email."
                            : "You will no longer receive email notifications.",
                        });
                      }}
                      disabled={isUpdating}
                    />
                  </div>
                  
                  <div className="space-y-4">
                    <div className="grid gap-2">
                      <Label htmlFor="email-address">Email Address</Label>
                      <div className="flex items-center">
                        <Input
                          id="email-address"
                          type="email"
                          value={emailAddress}
                          onChange={(e) => setEmailAddress(e.target.value)}
                          placeholder={notificationSettings?.emailAddress || "Enter your email address"}
                          className="mr-2"
                        />
                        {notificationSettings?.emailAddress && (
                          <div className="text-green-500 flex items-center">
                            <CheckCircle className="h-4 w-4 mr-1" />
                            <span className="text-xs">Configured</span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="grid gap-2">
                      <Label htmlFor="sendgrid-api-key">SendGrid API Key</Label>
                      <div className="flex items-center">
                        <Input
                          id="sendgrid-api-key"
                          type="password"
                          value={sendgridApiKey}
                          onChange={(e) => setSendgridApiKey(e.target.value)}
                          placeholder={notificationSettings?.sendgridApiKey ? "••••••••••••••••••••••••••••••" : "Enter your SendGrid API Key"}
                          className="mr-2"
                        />
                        {notificationSettings?.sendgridApiKey && (
                          <div className="text-green-500 flex items-center">
                            <CheckCircle className="h-4 w-4 mr-1" />
                            <span className="text-xs">Configured</span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-3">
                      <Button 
                        onClick={() => {
                          const updates: any = {};
                          if (emailAddress) updates.emailAddress = emailAddress;
                          if (sendgridApiKey) updates.sendgridApiKey = sendgridApiKey;
                          
                          if (Object.keys(updates).length === 0) {
                            toast({
                              title: "No changes to save",
                              description: "Please enter your email settings.",
                              variant: "destructive",
                            });
                            return;
                          }
                          
                          // Enable email notifications when credentials are saved
                          updates.emailEnabled = true;
                          
                          updateSettings(updates);
                          toast({
                            title: "Email settings saved",
                            description: "Your email notification settings have been saved.",
                          });
                          
                          // Clear input fields after saving
                          setEmailAddress("");
                          setSendgridApiKey("");
                        }}
                        disabled={isUpdating || (!emailAddress && !sendgridApiKey)}
                      >
                        {isUpdating ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                          <SaveIcon className="h-4 w-4 mr-2" />
                        )}
                        Save Email Settings
                      </Button>
                      
                      <Button 
                        variant="outline"
                        onClick={() => {
                          testNotification();
                          toast({
                            title: "Sending test email",
                            description: "Check your inbox for the test email notification.",
                          });
                        }}
                        disabled={isTesting || !notificationSettings?.emailAddress || !notificationSettings?.sendgridApiKey || !notificationSettings?.emailEnabled || !notificationSettings?.enabled}
                      >
                        {isTesting ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                          <BellRing className="h-4 w-4 mr-2" />
                        )}
                        Test Email
                      </Button>
                    </div>
                    
                    {notificationSettings?.enabled && notificationSettings?.emailEnabled && (!notificationSettings.emailAddress || !notificationSettings.sendgridApiKey) && (
                      <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-md p-3 mt-2">
                        <div className="flex items-start">
                          <AlertCircle className="h-5 w-5 text-amber-500 mt-0.5 mr-2" />
                          <div>
                            <h4 className="font-medium text-amber-800 dark:text-amber-300">Email Settings Required</h4>
                            <p className="text-sm text-amber-700 dark:text-amber-400">
                              Please enter your email address and SendGrid API key to receive email notifications.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-3 font-heading">About PlantDaddy</h2>
        <Card>
          <CardContent className="p-4">
            <p className="text-foreground mb-2">Version 1.0.0</p>
            <p className="text-muted-foreground text-sm">
              PlantDaddy helps you track and manage your houseplants, ensuring they get watered on time.
            </p>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}