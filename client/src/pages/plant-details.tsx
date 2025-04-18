import React from "react";
import { useLocation, useParams } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { StatusDot } from "@/components/ui/status-dot";
import { usePlants } from "@/hooks/use-plants";
import { getPlantStatus, getStatusText } from "@/lib/plant-utils";
import { formatDate, formatTime, formatDistanceToNow } from "@/lib/date-utils";
import { Skeleton } from "@/components/ui/skeleton";
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
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

export default function PlantDetails() {
  const { id } = useParams();
  const [_, navigate] = useLocation();
  const { toast } = useToast();
  
  const plantId = parseInt(id);
  const { useGetPlant, deletePlant, waterPlant } = usePlants();
  const { data: plantData, isLoading } = useGetPlant(plantId);

  const handleWaterPlant = () => {
    waterPlant.mutate(plantId, {
      onSuccess: () => {
        toast({
          title: "Plant watered!",
          description: "Watering recorded successfully.",
        });
      },
      onError: () => {
        toast({
          title: "Failed to water plant",
          description: "Please try again.",
          variant: "destructive",
        });
      },
    });
  };

  const handleEditPlant = () => {
    navigate(`/plants/${plantId}/edit`);
  };

  const handleDeletePlant = () => {
    deletePlant.mutate(plantId, {
      onSuccess: () => {
        toast({
          title: "Plant deleted",
          description: "Plant has been removed successfully.",
        });
        navigate("/");
      },
      onError: () => {
        toast({
          title: "Failed to delete plant",
          description: "Please try again.",
          variant: "destructive",
        });
      },
    });
  };

  const handleBack = () => {
    navigate("/");
  };

  if (isLoading || !plantData) {
    return (
      <div>
        <div className="bg-white p-4 shadow-sm">
          <div className="flex items-center mb-4">
            <Button variant="ghost" onClick={handleBack} className="mr-2">
              <span className="material-icons">arrow_back</span>
            </Button>
            <Skeleton className="h-7 w-40" />
          </div>
          <div className="flex items-center justify-between mb-4">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-5 w-10" />
          </div>
        </div>

        <div className="p-4">
          <Card className="mb-6">
            <CardContent className="p-4">
              <Skeleton className="h-6 w-32 mb-4" />
              <div className="grid grid-cols-2 gap-4">
                {[...Array(4)].map((_, i) => (
                  <div key={i}>
                    <Skeleton className="h-4 w-20 mb-2" />
                    <Skeleton className="h-5 w-24" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="mb-6">
            <CardContent className="p-4">
              <Skeleton className="h-6 w-40 mb-4" />
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="flex justify-between items-center py-2">
                    <div>
                      <Skeleton className="h-5 w-24 mb-1" />
                      <Skeleton className="h-4 w-16" />
                    </div>
                    <Skeleton className="h-4 w-20" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const plant = plantData;
  const status = getPlantStatus(plant);
  const statusText = getStatusText(plant);

  return (
    <div>
      <div className="bg-white p-4 shadow-sm">
        <div className="flex items-center mb-4">
          <Button variant="ghost" onClick={handleBack} className="mr-2">
            <span className="material-icons">arrow_back</span>
          </Button>
          <h1 className="text-xl font-bold font-heading">{plant.name}</h1>
        </div>

        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <StatusDot plant={plant} className="mr-2" />
            <span
              className={`${
                status === "watered"
                  ? "text-status-watered"
                  : status === "soon"
                  ? "text-status-soon"
                  : "text-status-overdue"
              } font-medium`}
            >
              {statusText}
            </span>
          </div>
          <Button variant="ghost" onClick={handleEditPlant} className="text-gray-500">
            <span className="material-icons">edit</span>
          </Button>
        </div>
      </div>

      <div className="p-4">
        <Card className="mb-6">
          <CardContent className="p-4">
            <h2 className="text-lg font-semibold mb-3 font-heading">Plant Details</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-gray-500 text-sm">Species</p>
                <p className="font-medium">{plant.species || "-"}</p>
              </div>
              <div>
                <p className="text-gray-500 text-sm">Location</p>
                <p className="font-medium">{plant.location}</p>
              </div>
              <div>
                <p className="text-gray-500 text-sm">Watering Frequency</p>
                <p className="font-medium">Every {plant.wateringFrequency} days</p>
              </div>
              <div>
                <p className="text-gray-500 text-sm">Last Watered</p>
                <p className="font-medium">{formatDate(new Date(plant.lastWatered))}</p>
              </div>
              {plant.notes && (
                <div className="col-span-2">
                  <p className="text-gray-500 text-sm">Notes</p>
                  <p className="font-medium">{plant.notes}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex justify-between items-center mb-3">
              <h2 className="text-lg font-semibold font-heading">Watering History</h2>
              {status !== "watered" && (
                <Button 
                  onClick={handleWaterPlant} 
                  variant="default" 
                  className="bg-primary text-white"
                  disabled={waterPlant.isPending}
                >
                  {waterPlant.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <span className="material-icons text-sm mr-1">opacity</span>
                  )}
                  Water Now
                </Button>
              )}
            </div>

            <div className="space-y-3">
              {plant.wateringHistory && plant.wateringHistory.length > 0 ? (
                plant.wateringHistory.map((entry) => (
                  <div
                    key={entry.id}
                    className="flex justify-between items-center py-2 border-b border-gray-100"
                  >
                    <div>
                      <p className="font-medium">{formatDate(new Date(entry.wateredAt))}</p>
                      <p className="text-sm text-gray-500">{formatTime(new Date(entry.wateredAt))}</p>
                    </div>
                    <span className="text-sm text-gray-500">
                      {formatDistanceToNow(new Date(entry.wateredAt))}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 text-sm py-2">No watering history available.</p>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-center">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button 
                variant="ghost" 
                className="text-red-500 font-medium flex items-center"
                disabled={deletePlant.isPending}
              >
                {deletePlant.isPending ? (
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <span className="material-icons mr-1 text-sm">delete</span>
                )}
                Delete Plant
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete {plant.name} and all of its watering history.
                  This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction 
                  onClick={handleDeletePlant}
                  className="bg-red-500 hover:bg-red-600"
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </div>
  );
}
