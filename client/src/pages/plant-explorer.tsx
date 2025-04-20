import React, { useState } from 'react';
import { useLocation } from 'wouter';
import { usePlantSpecies } from '@/hooks/use-plant-species';
import { PlantSpeciesCard } from '@/components/ui/plant-species-card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { 
  Search, 
  Leaf, 
  Filter, 
  X,
  Droplets, 
  Sun, 
  AlertTriangle, 
  Home,
  RefreshCw
} from 'lucide-react';
import type { PlantSpecies } from '@shared/schema';

export default function PlantExplorer() {
  const [searchQuery, setSearchQuery] = useState('');
  const [careLevel, setCareLevel] = useState<string>('');
  const [selectedSpeciesId, setSelectedSpeciesId] = useState<number | null>(null);
  const [, navigate] = useLocation();
  
  // Get plant species data with search query
  const { getPlantSpecies, getPlantSpeciesById } = usePlantSpecies();
  const { data: plantSpecies, isLoading, isError } = getPlantSpecies();
  const { data: selectedSpecies, isLoading: isLoadingSelected } = getPlantSpeciesById(selectedSpeciesId);
  
  // Handle species selection
  const handleSelectSpecies = (speciesId: number) => {
    setSelectedSpeciesId(speciesId);
  };
  
  // Filter plant species based on search query and filters
  const filteredSpecies = React.useMemo(() => {
    if (!plantSpecies) return [];
    
    return plantSpecies.filter((species: PlantSpecies) => {
      const matchesSearch = !searchQuery || 
        species.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        species.scientificName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (species.description && species.description.toLowerCase().includes(searchQuery.toLowerCase()));
      
      const matchesCareLevel = !careLevel || careLevel === 'all' || species.careLevel === careLevel;
      
      return matchesSearch && matchesCareLevel;
    });
  }, [plantSpecies, searchQuery, careLevel]);
  
  // Calculate watering frequency text
  const getWateringText = (frequency: number): string => {
    if (frequency === 1) return 'Daily';
    if (frequency <= 3) return 'Every few days';
    if (frequency <= 7) return 'Weekly';
    if (frequency <= 14) return 'Bi-weekly';
    return 'Monthly or less';
  };
  
  // Reset filters
  const resetFilters = () => {
    setSearchQuery('');
    setCareLevel('all');
  };
  
  // Format care level text
  const formatCareLevel = (level: string): string => {
    return level.charAt(0).toUpperCase() + level.slice(1);
  };
  
  // Get color class for toxicity
  const getToxicityColor = (toxicity: string | null): string => {
    if (!toxicity) return 'bg-gray-100 text-gray-800';
    if (toxicity.includes('non-toxic')) return 'bg-green-100 text-green-800';
    return 'bg-red-100 text-red-800';
  };

  return (
    <div className="container mx-auto p-4 max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold flex items-center">
          <Leaf className="mr-2 h-6 w-6 text-green-600" />
          Plant Explorer
        </h1>
        <Button variant="outline" onClick={() => navigate('/')}>
          <Home className="mr-2 h-4 w-4" /> Back to Dashboard
        </Button>
      </div>
      
      <div className="bg-card p-4 rounded-lg shadow-sm mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-grow">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search for plants by name or description..."
              className="pl-10 w-full"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button 
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                onClick={() => setSearchQuery('')}
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          
          <div className="flex gap-2 items-center">
            <div className="w-40">
              <Select value={careLevel} onValueChange={setCareLevel}>
                <SelectTrigger>
                  <div className="flex items-center">
                    <Filter className="mr-2 h-4 w-4" />
                    <SelectValue placeholder="Care Level" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Levels</SelectItem>
                  <SelectItem value="easy">Easy</SelectItem>
                  <SelectItem value="moderate">Moderate</SelectItem>
                  <SelectItem value="difficult">Difficult</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {(searchQuery || (careLevel && careLevel !== 'all')) && (
              <Button variant="ghost" size="sm" onClick={resetFilters}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Reset
              </Button>
            )}
          </div>
        </div>
      </div>
      
      {isLoading ? (
        <div className="py-12 flex justify-center">
          <div className="flex flex-col items-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-700 mb-4"></div>
            <p className="text-muted-foreground">Loading plant catalog...</p>
          </div>
        </div>
      ) : isError ? (
        <div className="py-12 text-center">
          <AlertTriangle className="h-12 w-12 mx-auto text-amber-500 mb-4" />
          <h3 className="text-xl font-medium mb-2">Error loading plant catalog</h3>
          <p className="text-muted-foreground mb-4">There was a problem loading the plant database.</p>
          <Button onClick={() => window.location.reload()}>Try Again</Button>
        </div>
      ) : filteredSpecies && filteredSpecies.length > 0 ? (
        <>
          <div className="mb-4 flex justify-between items-center">
            <p className="text-muted-foreground">
              Showing {filteredSpecies.length} {filteredSpecies.length === 1 ? 'plant' : 'plants'}
              {careLevel && <span> with <strong>{formatCareLevel(careLevel)}</strong> care level</span>}
              {searchQuery && <span> matching <strong>"{searchQuery}"</strong></span>}
            </p>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredSpecies.map((species) => (
              <PlantSpeciesCard 
                key={species.id} 
                species={species} 
                onSelect={handleSelectSpecies} 
              />
            ))}
          </div>
        </>
      ) : (
        <div className="py-12 text-center">
          <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
            <Leaf className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-xl font-medium mb-2">No plants found</h3>
          <p className="text-muted-foreground mb-4">
            No plants match your search criteria. Try adjusting your filters.
          </p>
          <Button onClick={resetFilters}>Clear Filters</Button>
        </div>
      )}

      {/* Plant Details Dialog */}
      <Dialog open={!!selectedSpeciesId} onOpenChange={(open) => !open && setSelectedSpeciesId(null)}>
        {isLoadingSelected ? (
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="sr-only">Loading Plant Details</DialogTitle>
              <DialogDescription className="sr-only">Please wait while we load plant information</DialogDescription>
            </DialogHeader>
            <div className="py-8 flex justify-center">
              <div className="flex flex-col items-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-700 mb-4"></div>
                <p className="text-muted-foreground">Loading plant details...</p>
              </div>
            </div>
          </DialogContent>
        ) : selectedSpecies && (
          <DialogContent className="sm:max-w-3xl h-[90vh] block">
            <DialogHeader>
              <DialogTitle className="text-2xl flex items-center">
                {selectedSpecies.name}
                <span className="text-sm ml-2 font-normal italic text-muted-foreground">
                  ({selectedSpecies.scientificName})
                </span>
              </DialogTitle>
              <DialogDescription>
                {selectedSpecies.family && <span>Family: {selectedSpecies.family}</span>}
                {selectedSpecies.origin && <span> • Origin: {selectedSpecies.origin}</span>}
              </DialogDescription>
            </DialogHeader>
            
            <ScrollArea className="mt-2 pr-4 h-full pb-20">
              <div className="flex flex-col md:flex-row gap-6">
                <div className="md:w-2/5">
                  <div className="rounded-lg overflow-hidden border">
                    <img 
                      src={selectedSpecies.imageUrl || '/uploads/plant-silhouette.svg'} 
                      alt={selectedSpecies.name} 
                      className="w-full h-[300px] object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = '/uploads/plant-silhouette.svg';
                      }}
                    />
                  </div>
                  
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Badge className={`
                      ${selectedSpecies.careLevel === 'easy' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100' : ''}
                      ${selectedSpecies.careLevel === 'moderate' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100' : ''}
                      ${selectedSpecies.careLevel === 'difficult' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100' : ''}
                    `}>
                      {formatCareLevel(selectedSpecies.careLevel)} care
                    </Badge>
                    {selectedSpecies.toxicity && (
                      <Badge variant="outline" className={getToxicityColor(selectedSpecies.toxicity)}>
                        {selectedSpecies.toxicity}
                      </Badge>
                    )}
                  </div>
                </div>
                
                <div className="md:w-3/5">
                  <Tabs defaultValue="overview">
                    <TabsList className="mb-4">
                      <TabsTrigger value="overview">Overview</TabsTrigger>
                      <TabsTrigger value="care">Care Instructions</TabsTrigger>
                      {selectedSpecies.commonIssues && (
                        <TabsTrigger value="issues">Common Issues</TabsTrigger>
                      )}
                    </TabsList>
                    
                    <TabsContent value="overview" className="space-y-4">
                      <div>
                        <h3 className="font-medium mb-2">Description</h3>
                        <p>{selectedSpecies.description}</p>
                      </div>
                      
                      {selectedSpecies.propagation && (
                        <div>
                          <h3 className="font-medium mb-2">Propagation</h3>
                          <p>{selectedSpecies.propagation}</p>
                        </div>
                      )}
                    </TabsContent>
                    
                    <TabsContent value="care" className="space-y-6">
                      <div className="flex items-start gap-4">
                        <div className="flex-shrink-0 p-2 bg-blue-50 rounded-lg">
                          <Droplets className="h-6 w-6 text-blue-600" />
                        </div>
                        <div>
                          <h3 className="font-medium mb-1">Watering</h3>
                          <p>
                            {getWateringText(selectedSpecies.wateringFrequency)}: 
                            Water every {selectedSpecies.wateringFrequency} 
                            {selectedSpecies.wateringFrequency === 1 ? ' day' : ' days'}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-start gap-4">
                        <div className="flex-shrink-0 p-2 bg-amber-50 rounded-lg">
                          <Sun className="h-6 w-6 text-amber-600" />
                        </div>
                        <div>
                          <h3 className="font-medium mb-1">Light</h3>
                          <p>{selectedSpecies.lightRequirements}</p>
                        </div>
                      </div>
                      
                      {selectedSpecies.humidity && (
                        <div>
                          <h3 className="font-medium mb-1">Humidity</h3>
                          <p>Prefers {selectedSpecies.humidity} humidity</p>
                        </div>
                      )}
                      
                      {selectedSpecies.soilType && (
                        <div>
                          <h3 className="font-medium mb-1">Soil</h3>
                          <p>{selectedSpecies.soilType}</p>
                        </div>
                      )}
                    </TabsContent>
                    
                    {selectedSpecies.commonIssues && (
                      <TabsContent value="issues">
                        <h3 className="font-medium mb-2">Common Issues & Solutions</h3>
                        <p>{selectedSpecies.commonIssues}</p>
                      </TabsContent>
                    )}
                  </Tabs>
                </div>
              </div>
              
              <Separator className="my-6" />
              
              <div className="mb-6">
                <h3 className="font-medium mb-4">Care Summary</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="border rounded-lg p-3">
                    <div className="text-sm text-muted-foreground mb-1">Care Level</div>
                    <div className="font-medium">{formatCareLevel(selectedSpecies.careLevel)}</div>
                  </div>
                  <div className="border rounded-lg p-3">
                    <div className="text-sm text-muted-foreground mb-1">Watering</div>
                    <div className="font-medium">Every {selectedSpecies.wateringFrequency} days</div>
                  </div>
                  <div className="border rounded-lg p-3">
                    <div className="text-sm text-muted-foreground mb-1">Light</div>
                    <div className="font-medium">{selectedSpecies.lightRequirements}</div>
                  </div>
                  {selectedSpecies.humidity && (
                    <div className="border rounded-lg p-3">
                      <div className="text-sm text-muted-foreground mb-1">Humidity</div>
                      <div className="font-medium">{selectedSpecies.humidity}</div>
                    </div>
                  )}
                  {selectedSpecies.toxicity && (
                    <div className="border rounded-lg p-3">
                      <div className="text-sm text-muted-foreground mb-1">Toxicity</div>
                      <div className="font-medium">{selectedSpecies.toxicity}</div>
                    </div>
                  )}
                </div>
              </div>
            </ScrollArea>
            
            <DialogFooter className="absolute bottom-0 left-0 right-0 bg-card p-4 border-t">
              <Button 
                onClick={() => setSelectedSpeciesId(null)}
                variant="outline"
                className="mr-2"
              >
                Close
              </Button>
              <Button 
                onClick={() => {
                  setSelectedSpeciesId(null);
                  // Pass as URL parameters instead of state
                  const params = new URLSearchParams({
                    name: selectedSpecies.name,
                    species: selectedSpecies.scientificName,
                    wateringFrequency: selectedSpecies.wateringFrequency.toString()
                  });
                  navigate(`/plants/new?${params.toString()}`);
                }}
              >
                <Leaf className="mr-2 h-4 w-4" />
                Add to My Plants
              </Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}