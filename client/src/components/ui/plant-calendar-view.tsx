import React, { useState, useMemo } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { Plant } from '@shared/schema';
import { Card, CardContent } from '@/components/ui/card';
import { addDays, format, isSameDay, isAfter, isBefore } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { StatusDot } from '@/components/ui/status-dot';
import { getPlantStatus } from '@/lib/plant-utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getDueText } from '@/lib/date-utils';

interface PlantCalendarViewProps {
  plants: Plant[];
  onWatered: (plantId: number) => void;
  onSelect: (plantId: number) => void;
}

export function PlantCalendarView({ plants, onWatered, onSelect }: PlantCalendarViewProps) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());

  // Generate a mapping of dates to plants that need watering on those dates
  const plantWateringDates = useMemo(() => {
    const dateMap: Record<string, Plant[]> = {};
    
    plants.forEach(plant => {
      if (!plant.lastWatered) return;
      
      const lastWateredDate = new Date(plant.lastWatered);
      if (isNaN(lastWateredDate.getTime())) return;
      
      // Calculate next watering date based on frequency
      const nextWateringDate = addDays(lastWateredDate, plant.wateringFrequency);
      const dateKey = format(nextWateringDate, 'yyyy-MM-dd');
      
      if (!dateMap[dateKey]) {
        dateMap[dateKey] = [];
      }
      
      dateMap[dateKey].push(plant);
    });
    
    return dateMap;
  }, [plants]);

  // Get plants that need watering on the selected date
  const plantsForSelectedDate = useMemo(() => {
    if (!selectedDate) return [];
    
    // Look for exact match first
    const exactKey = format(selectedDate, 'yyyy-MM-dd');
    const exactMatch = plantWateringDates[exactKey] || [];
    
    // Also include overdue plants if the selected date is today
    const today = new Date();
    const isToday = isSameDay(selectedDate, today);
    
    if (isToday) {
      // Find all overdue plants (due date is before today)
      const overduePlants = plants.filter(plant => {
        if (!plant.lastWatered) return false;
        const lastWateredDate = new Date(plant.lastWatered);
        if (isNaN(lastWateredDate.getTime())) return false;
        
        const nextWateringDate = addDays(lastWateredDate, plant.wateringFrequency);
        return isBefore(nextWateringDate, today);
      });
      
      // Combine with exact matches, avoiding duplicates
      const combinedPlants = [...exactMatch];
      
      overduePlants.forEach(plant => {
        if (!combinedPlants.some(p => p.id === plant.id)) {
          combinedPlants.push(plant);
        }
      });
      
      return combinedPlants;
    }
    
    return exactMatch;
  }, [selectedDate, plantWateringDates, plants]);

  // Function to get date class names based on plants due on that date
  const getDayClassName = (day: Date) => {
    const dateKey = format(day, 'yyyy-MM-dd');
    const plantsOnDate = plantWateringDates[dateKey];
    const today = new Date();
    
    // If there are plants due on this date
    if (plantsOnDate?.length) {
      // If the date is today, highlight it
      if (isSameDay(day, today)) {
        return 'bg-primary text-primary-foreground';
      }
      
      // If the date is overdue, show a different color
      if (isBefore(day, today)) {
        return 'bg-status-overdue/20 text-status-overdue';
      }
      
      // Upcoming watering date
      return 'bg-status-soon/20 text-status-soon';
    }
    
    // No plants due on this date
    return '';
  };

  // Create a map of dates to plant counts for the badge
  const dateToPlantCountMap = useMemo(() => {
    const countMap: Record<string, number> = {};
    
    Object.entries(plantWateringDates).forEach(([dateKey, plantsArray]) => {
      countMap[dateKey] = plantsArray.length;
    });
    
    return countMap;
  }, [plantWateringDates]);

  return (
    <div className="space-y-6">
      <div className="bg-card rounded-lg p-4 shadow-sm">
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={setSelectedDate}
          className="rounded-md border"
          components={{
            Day: ({ day, ...props }) => {
              const dateKey = format(day, 'yyyy-MM-dd');
              const count = dateToPlantCountMap[dateKey];
              
              return (
                <div
                  {...props}
                  className={`${props.className} ${getDayClassName(day)} relative`}
                >
                  {day.getDate()}
                  {count > 0 && (
                    <Badge
                      className="absolute -top-2 -right-2 size-5 p-0 flex items-center justify-center text-[10px] font-medium"
                      variant={isBefore(day, new Date()) ? "destructive" : "default"}
                    >
                      {count}
                    </Badge>
                  )}
                </div>
              );
            },
          }}
        />
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-3 font-heading">
          {selectedDate && (
            <>
              Plants due on {format(selectedDate, 'MMMM d, yyyy')}
              {isSameDay(selectedDate, new Date()) && ' (Today)'}
            </>
          )}
        </h2>
        
        {plantsForSelectedDate.length === 0 ? (
          <Card className="bg-card p-4 text-center">
            <p className="text-muted-foreground">No plants need watering on this date</p>
          </Card>
        ) : (
          <div className="space-y-3">
            {plantsForSelectedDate.map(plant => (
              <Card key={plant.id} className="bg-card border shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="relative">
                        <Avatar className="size-12">
                          {plant.imageUrl ? (
                            <AvatarImage src={plant.imageUrl} alt={plant.name} />
                          ) : (
                            <AvatarFallback>
                              <span className="emoji-xl" role="img" aria-label="plant">🌿</span>
                            </AvatarFallback>
                          )}
                        </Avatar>
                        <StatusDot plant={plant} className="absolute -top-1 -right-1 ring-2 ring-white" />
                      </div>
                      
                      <div>
                        <h3 className="font-medium">{plant.name}</h3>
                        <p className="text-sm text-muted-foreground">{plant.location}</p>
                        <p className="text-sm font-medium mt-1">{getDueText(plant.lastWatered, plant.wateringFrequency)}</p>
                      </div>
                    </div>
                    
                    <div className="flex space-x-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => onSelect(plant.id)}
                      >
                        Details
                      </Button>
                      
                      <Button 
                        size="sm"
                        onClick={() => onWatered(plant.id)}
                        variant={getPlantStatus(plant) === 'overdue' ? "destructive" : "default"}
                      >
                        Water
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}