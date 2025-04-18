import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusDot } from "@/components/ui/status-dot";
import { Plant } from "@shared/schema";
import { getPlantStatus, getStatusText } from "@/lib/plant-utils";
import { formatDistanceToNow } from "@/lib/date-utils";

interface PlantCardProps {
  plant: Plant;
  onWatered: (plantId: number) => void;
  onSelect: (plantId: number) => void;
}

export function PlantCard({ plant, onWatered, onSelect }: PlantCardProps) {
  const status = getPlantStatus(plant);
  const statusText = getStatusText(plant);
  
  const handleClick = () => {
    onSelect(plant.id);
  };
  
  const handleWater = (e: React.MouseEvent) => {
    e.stopPropagation();
    onWatered(plant.id);
  };
  
  const lastWateredText = formatDistanceToNow(plant.lastWatered);

  return (
    <Card 
      className="bg-white rounded-lg shadow-md mb-4 overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
      onClick={handleClick}
    >
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <StatusDot plant={plant} />
            <h3 className="font-semibold font-heading">{plant.name}</h3>
          </div>
          <span className={`text-sm font-medium ${
            status === 'watered' ? 'text-status-watered' : 
            status === 'soon' ? 'text-status-soon' : 
            'text-status-overdue'
          }`}>
            {statusText}
          </span>
        </div>
        
        <div className="flex justify-between items-center mt-3">
          <div>
            <p className="text-gray-600 text-sm">{plant.location}</p>
            <p className="text-gray-500 text-xs mt-1">Last watered: {lastWateredText}</p>
          </div>
          
          {status === 'watered' ? (
            <Button 
              variant="ghost" 
              className="text-gray-400 px-4 py-2 rounded-full text-sm font-medium cursor-default flex items-center"
              disabled={true}
            >
              <span className="material-icons text-sm mr-1">check_circle</span>
              Watered
            </Button>
          ) : (
            <Button 
              onClick={handleWater}
              variant={status === 'overdue' ? "default" : "outline"}
              className={`${
                status === 'overdue' 
                  ? 'bg-primary text-white' 
                  : 'border border-primary text-primary'
              } px-4 py-2 rounded-full text-sm font-medium flex items-center`}
            >
              <span className="material-icons text-sm mr-1">opacity</span>
              Water
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
