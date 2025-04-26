import React from 'react';
import { Plant } from '@shared/schema';
import { PlantCard } from '@/components/ui/plant-card';
import { groupPlantsByStatus } from '@/lib/plant-utils';

interface PlantGridViewProps {
  plants: Plant[];
  onWatered: (plantId: number) => void;
  onSelect: (plantId: number) => void;
}

export function PlantGridView({ plants, onWatered, onSelect }: PlantGridViewProps) {
  const { plantsToWaterToday, upcomingPlants, recentlyWatered } = groupPlantsByStatus(plants);

  return (
    <div className="space-y-8">
      {/* Water Today Section */}
      <section>
        <h2 className="text-lg font-semibold mb-3 font-heading">
          Water Today
        </h2>

        {plantsToWaterToday.length === 0 ? (
          <p className="text-gray-500 text-sm">All caught up! No plants need watering today.</p>
        ) : (
          <div className="space-y-4">
            {plantsToWaterToday.map((plant) => (
              <PlantCard
                key={plant.id}
                plant={plant}
                onWatered={onWatered}
                onSelect={onSelect}
              />
            ))}
          </div>
        )}
      </section>

      {/* Coming Up Section */}
      {upcomingPlants.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold mb-3 font-heading">
            Coming Up
          </h2>

          <div className="space-y-4">
            {upcomingPlants.map((plant) => (
              <PlantCard
                key={plant.id}
                plant={plant}
                onWatered={onWatered}
                onSelect={onSelect}
              />
            ))}
          </div>
        </section>
      )}

      {/* Recently Watered Section */}
      {recentlyWatered.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold mb-3 font-heading">
            Recently Watered
          </h2>

          <div className="space-y-4">
            {recentlyWatered.map((plant) => (
              <PlantCard
                key={plant.id}
                plant={plant}
                onWatered={onWatered}
                onSelect={onSelect}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}