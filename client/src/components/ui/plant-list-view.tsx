import React from 'react';
import { Plant } from '@shared/schema';
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow 
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { StatusDot } from '@/components/ui/status-dot';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { formatDate } from '@/lib/date-utils';
import { getDueText } from '@/lib/date-utils';
import { getPlantStatus } from '@/lib/plant-utils';
import { Droplets, Info } from 'lucide-react';

interface PlantListViewProps {
  plants: Plant[];
  onWatered: (plantId: number) => void;
  onSelect: (plantId: number) => void;
}

export function PlantListView({ plants, onWatered, onSelect }: PlantListViewProps) {
  if (plants.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">No plants found</p>
      </div>
    );
  }

  // Sort plants by watering status: overdue first, then due today, then upcoming
  const sortedPlants = [...plants].sort((a, b) => {
    const statusA = getPlantStatus(a);
    const statusB = getPlantStatus(b);
    
    // First, sort by overdue status
    if (statusA === 'overdue' && statusB !== 'overdue') return -1;
    if (statusA !== 'overdue' && statusB === 'overdue') return 1;
    
    // Then sort by watering date
    const daysUntilA = getDaysUntilWatering(a);
    const daysUntilB = getDaysUntilWatering(b);
    
    return daysUntilA - daysUntilB;
  });

  return (
    <div className="rounded-lg border shadow-sm overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[300px]">Plant</TableHead>
            <TableHead>Location</TableHead>
            <TableHead>Last Watered</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedPlants.map(plant => (
            <TableRow key={plant.id}>
              <TableCell>
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Avatar className="h-10 w-10">
                      {plant.imageUrl ? (
                        <AvatarImage src={plant.imageUrl} alt={plant.name} />
                      ) : (
                        <AvatarFallback>
                          <span className="emoji-sm" role="img" aria-label="plant">🌿</span>
                        </AvatarFallback>
                      )}
                    </Avatar>
                    <StatusDot plant={plant} className="absolute -top-1 -right-1 h-3 w-3 ring-1 ring-white" />
                  </div>
                  <div>
                    <div className="font-medium">{plant.name}</div>
                    <div className="text-xs text-muted-foreground">{plant.species || 'Unknown Species'}</div>
                  </div>
                </div>
              </TableCell>
              <TableCell>{plant.location}</TableCell>
              <TableCell>{formatDate(new Date(plant.lastWatered))}</TableCell>
              <TableCell>
                <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  getStatusClass(plant)
                }`}>
                  {getDueText(plant.lastWatered, plant.wateringFrequency)}
                </div>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onSelect(plant.id)}
                  >
                    <Info className="h-4 w-4 mr-1" />
                    Details
                  </Button>
                  
                  {getPlantStatus(plant) !== 'watered' && (
                    <Button
                      size="sm"
                      onClick={() => onWatered(plant.id)}
                      variant={getPlantStatus(plant) === 'overdue' ? "destructive" : "default"}
                    >
                      <Droplets className="h-4 w-4 mr-1" />
                      Water
                    </Button>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

// Helper to get status styling
function getStatusClass(plant: Plant): string {
  const status = getPlantStatus(plant);
  
  switch (status) {
    case 'overdue':
      return 'bg-status-overdue/10 text-status-overdue';
    case 'soon':
      return 'bg-status-soon/10 text-status-soon';
    case 'watered':
      return 'bg-status-watered/10 text-status-watered';
    default:
      return 'bg-muted text-muted-foreground';
  }
}

// Helper to calculate days until watering for sorting
function getDaysUntilWatering(plant: Plant): number {
  if (!plant.lastWatered) return 999;
  
  try {
    const lastWateredDate = new Date(plant.lastWatered);
    if (isNaN(lastWateredDate.getTime())) return 999;
    
    const today = new Date();
    const nextWateringDate = new Date(lastWateredDate);
    nextWateringDate.setDate(nextWateringDate.getDate() + plant.wateringFrequency);
    
    const diffTime = nextWateringDate.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  } catch (error) {
    return 999;
  }
}