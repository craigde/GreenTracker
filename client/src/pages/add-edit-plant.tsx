import React, { useEffect } from "react";
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
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { usePlants } from "@/hooks/use-plants";
import { useToast } from "@/hooks/use-toast";
import { getWateringFrequencies } from "@/lib/plant-utils";
import { useLocations } from "@/hooks/use-locations";
import { Loader2 } from "lucide-react";

export default function AddEditPlant() {
  const { id } = useParams();
  const [_, navigate] = useLocation();
  const { toast } = useToast();
  const isEditing = id !== "new";
  const plantId = isEditing ? parseInt(id) : undefined;

  const { useGetPlant, createPlant, updatePlant } = usePlants();
  const { locations, isLoading: isLoadingLocations } = useLocations();
  const { data: plantData, isLoading: isLoadingPlant } = useGetPlant(plantId || 0);

  // Form schema
  const formSchema = z.object({
    name: z.string().min(1, "Plant name is required"),
    species: z.string().optional(),
    location: z.string().min(1, "Location is required"),
    wateringFrequency: z.coerce.number().min(1, "Watering frequency is required"),
    lastWatered: z.string().transform((val) => new Date(val)),
    notes: z.string().optional(),
  });

  // Form
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      species: "",
      location: "",
      wateringFrequency: 7,
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
    }
  }, [isEditing, plantData, form]);

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    if (isEditing && plantId) {
      updatePlant.mutate(
        { id: plantId, data: values },
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
      createPlant.mutate(values, {
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
