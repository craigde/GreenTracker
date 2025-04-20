import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useLocations } from "@/hooks/use-locations";
import { useToast } from "@/hooks/use-toast";
import { Loader2, PencilIcon, Trash2Icon, PlusIcon, SaveIcon, XIcon } from "lucide-react";
import { ThemeToggle } from "@/components/ui/theme-toggle";
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
  const [newLocation, setNewLocation] = useState("");
  const [editingLocation, setEditingLocation] = useState<{ id: number; name: string } | null>(null);

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

        <h2 className="text-lg font-semibold mb-3 text-gray-700 font-heading">Locations</h2>
        <p className="text-sm text-gray-500 mb-4">
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
                <p className="text-gray-500 text-center py-4">No custom locations added yet.</p>
              ) : (
                locations.map((location) => (
                  <div
                    key={location.id}
                    className="flex items-center justify-between py-2 px-3 border-b border-gray-100 last:border-0"
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
                          className="text-gray-500"
                        >
                          <XIcon className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <>
                        <span className="font-medium flex-1">
                          {location.name}
                          {location.isDefault === true && (
                            <span className="ml-2 text-xs text-gray-500">(Default)</span>
                          )}
                        </span>
                        <div className="flex items-center">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleEditLocation(location.id, location.name)}
                            className="text-gray-500"
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

      <section>
        <h2 className="text-lg font-semibold mb-3 text-gray-700 font-heading">About PlantDaddy</h2>
        <Card>
          <CardContent className="p-4">
            <p className="text-gray-600 mb-2">Version 1.0.0</p>
            <p className="text-gray-500 text-sm">
              PlantDaddy helps you track and manage your houseplants, ensuring they get watered on time.
            </p>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}