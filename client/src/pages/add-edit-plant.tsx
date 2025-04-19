import React, { useEffect, useState } from "react";
import { useLocation, useParams } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Label } from "@/components/ui/label";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { usePlants } from "@/hooks/use-plants";
import { useToast } from "@/hooks/use-toast";
import { getWateringFrequencies } from "@/lib/plant-utils";
import { useLocations } from "@/hooks/use-locations";
import { useLocationState } from "@/hooks/use-location-state";
import { Loader2, Upload, Image } from "lucide-react";

export default function AddEditPlant() {
  const params = useParams();
  const id = params?.id;
  const [_, navigate] = useLocation();
  const { toast } = useToast();
  const isEditing = id !== "new";
  const plantId = isEditing && id ? parseInt(id) : null;
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  
  // Access recommended plant data from location state (if any)
  type LocationState = {
    recommendedPlant?: {
      name: string;
      species: string;
      wateringFrequency: number;
    }
  };
  
  const locationState = useLocationState<LocationState>();
  const recommendedPlant = locationState?.recommendedPlant;
  
  // Debug state
  useEffect(() => {
    if (recommendedPlant) {
      console.log("Recommended plant data:", recommendedPlant);
    }
  }, [recommendedPlant]);

  const { useGetPlant, createPlant, updatePlant, uploadPlantImage } = usePlants();
  const { locations, isLoading: isLoadingLocations } = useLocations();
  const { data: plantData, isLoading: isLoadingPlant } = useGetPlant(isEditing && id ? parseInt(id) : 0);

  // Form schema
  const formSchema = z.object({
    name: z.string().min(1, "Plant name is required"),
    species: z.string().optional(),
    location: z.string().min(1, "Location is required"),
    wateringFrequency: z.coerce.number().min(1, "Watering frequency is required"),
    lastWatered: z.string(),
    notes: z.string().optional(),
  });

  // Form
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: recommendedPlant?.name || "",
      species: recommendedPlant?.species || "",
      location: "",
      wateringFrequency: recommendedPlant?.wateringFrequency || 7,
      lastWatered: new Date().toISOString().split("T")[0],
      notes: "",
    },
  });

  // Load plant data if editing
  useEffect(() => {
    if (isEditing && plantData) {
      form.reset({
        name: plantData.name,
        species: plantData.species || "",
        location: plantData.location,
        wateringFrequency: plantData.wateringFrequency,
        lastWatered: new Date(plantData.lastWatered).toISOString().split("T")[0],
        notes: plantData.notes || "",
      });
      
      // Set image preview if plant has an image
      if (plantData.imageUrl) {
        setImagePreview(plantData.imageUrl);
      }
    }
  }, [isEditing, plantData, form]);
  
  // Update form with recommended plant data when locations are loaded
  useEffect(() => {
    if (!isEditing && !isLoadingLocations && locations && locations.length > 0 && recommendedPlant) {
      form.reset({
        ...form.getValues(),
        name: recommendedPlant.name || form.getValues().name,
        species: recommendedPlant.species || form.getValues().species,
        location: locations[0].name,
        wateringFrequency: recommendedPlant.wateringFrequency || form.getValues().wateringFrequency,
      });
    } else if (!isEditing && !isLoadingLocations && locations && locations.length > 0) {
      form.reset({
        ...form.getValues(),
        location: locations[0].name,
      });
    }
  }, [isEditing, isLoadingLocations, locations, recommendedPlant, form]);
  
  // Handle image selection
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setSelectedImage(file);
    
    // Create a preview URL
    const reader = new FileReader();
    reader.onload = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };
  
  // Handle image upload
  const handleImageUpload = async () => {
    if (!isEditing || !plantId || !selectedImage) return;
    
    setIsUploading(true);
    
    try {
      await uploadPlantImage.mutateAsync({
        id: plantId,
        imageFile: selectedImage
      });
      
      toast({
        title: "Image uploaded",
        description: "Plant image has been uploaded successfully."
      });
    } catch (error) {
      toast({
        title: "Failed to upload image",
        description: "Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
    }
  };

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    // Convert string date to Date object for the API
    const processedValues = {
      ...values,
      lastWatered: new Date(values.lastWatered)
    };
    
    if (isEditing && plantId) {
      updatePlant.mutate(
        { id: plantId, data: processedValues },
        {
          onSuccess: () => {
            toast({
              title: "Plant updated",
              description: "Plant has been updated successfully.",
            });
            navigate(`/plants/${plantId}`);
          },
          onError: () => {
            toast({
              title: "Failed to update plant",
              description: "Please try again.",
              variant: "destructive",
            });
          },
        }
      );
    } else {
      createPlant.mutate(processedValues, {
        onSuccess: () => {
          toast({
            title: "Plant added",
            description: "New plant has been added successfully.",
          });
          navigate("/");
        },
        onError: () => {
          toast({
            title: "Failed to add plant",
            description: "Please try again.",
            variant: "destructive",
          });
        },
      });
    }
  };

  const handleCancel = () => {
    if (isEditing && plantId) {
      navigate(`/plants/${plantId}`);
    } else {
      navigate("/");
    }
  };

  const isSubmitting = createPlant.isPending || updatePlant.isPending;

  return (
    <div>
      <div className="bg-white p-4 shadow-sm">
        <div className="flex items-center mb-4">
          <Button variant="ghost" onClick={handleCancel} className="mr-2">
            <span className="material-icons">arrow_back</span>
          </Button>
          <h1 className="text-xl font-bold font-heading">
            {isEditing ? "Edit Plant" : "Add New Plant"}
          </h1>
        </div>
      </div>

      <div className="p-4">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <Card className="mb-6">
              <CardContent className="p-4 space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Plant Name</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g., Monstera Deliciosa"
                          {...field}
                          disabled={isLoadingPlant}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="species"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Species (Optional)</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g., Monstera Deliciosa"
                          {...field}
                          disabled={isLoadingPlant}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                {isEditing && (
                  <div className="space-y-4">
                    <FormLabel>Plant Image (Optional)</FormLabel>
                    <div className="flex flex-col items-center gap-4 sm:flex-row">
                      <div className="flex flex-col items-center gap-2">
                        <Avatar className="size-24 rounded-md">
                          {imagePreview ? (
                            <AvatarImage src={imagePreview} alt="Plant image" className="object-cover" />
                          ) : (
                            <AvatarFallback className="rounded-md bg-muted">
                              <Image className="size-10 text-muted-foreground" />
                            </AvatarFallback>
                          )}
                        </Avatar>
                        <div className="text-xs text-gray-500">
                          {imagePreview ? "Current image" : "No image"}
                        </div>
                      </div>
                      
                      <div className="flex flex-col gap-2 w-full">
                        <Label htmlFor="plant-image" className="sr-only">
                          Choose image
                        </Label>
                        <Input
                          id="plant-image"
                          type="file"
                          accept="image/*"
                          onChange={handleImageChange}
                          disabled={isLoadingPlant || isUploading}
                          className="w-full"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleImageUpload}
                          disabled={!selectedImage || isUploading || isLoadingPlant}
                          className="flex items-center gap-2"
                        >
                          {isUploading ? (
                            <Loader2 className="size-4 animate-spin" />
                          ) : (
                            <Upload className="size-4" />
                          )}
                          Upload Image
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                <FormField
                  control={form.control}
                  name="location"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Location</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        disabled={isLoadingPlant}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select location" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {isLoadingLocations ? (
                            <div className="flex justify-center p-2">
                              <Loader2 className="h-4 w-4 animate-spin text-primary" />
                            </div>
                          ) : locations.length === 0 ? (
                            <div className="p-2 text-center text-sm text-gray-500">
                              No locations available
                            </div>
                          ) : (
                            locations.map((location) => (
                              <SelectItem key={location.id} value={location.name}>
                                {location.name}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="wateringFrequency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Watering Frequency</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value.toString()}
                        disabled={isLoadingPlant}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select frequency" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {getWateringFrequencies().map((freq) => (
                            <SelectItem key={freq.value} value={freq.value.toString()}>
                              {freq.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="lastWatered"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Last Watered</FormLabel>
                      <FormControl>
                        <Input
                          type="date"
                          {...field}
                          disabled={isLoadingPlant}
                        />
                      </FormControl>
                      <FormDescription>
                        When was this plant last watered?
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notes (Optional)</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Any special care instructions..."
                          className="h-24"
                          {...field}
                          disabled={isLoadingPlant}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            <div className="flex justify-center">
              <Button
                type="submit"
                className="bg-primary text-white px-6 py-3 rounded-full font-medium"
                disabled={isSubmitting || isLoadingPlant}
              >
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEditing ? "Update Plant" : "Save Plant"}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}
