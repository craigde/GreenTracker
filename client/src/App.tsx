import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import PlantDetails from "@/pages/plant-details";
import AddEditPlant from "@/pages/add-edit-plant";
import Notifications from "@/pages/notifications";
import { NavBar } from "@/components/layout/nav-bar";
import { usePlants } from "@/hooks/use-plants";
import { getPlantStatus } from "@/lib/plant-utils";

function AppNavBar() {
  const { plants, isLoading } = usePlants();
  
  const notificationCount = !isLoading
    ? plants.filter(plant => {
        const status = getPlantStatus(plant);
        return status === "overdue" || (status === "soon" && new Date(plant.lastWatered).getDate() === new Date().getDate());
      }).length
    : 0;
    
  return <NavBar notificationCount={notificationCount} />;
}

function Router() {
  return (
    <div className="flex flex-col h-screen bg-neutral">
      <main className="flex-1 overflow-y-auto pb-16">
        <Switch>
          <Route path="/" component={Dashboard} />
          <Route path="/plants/new" component={AddEditPlant} />
          <Route path="/plants/:id/edit" component={AddEditPlant} />
          <Route path="/plants/:id" component={PlantDetails} />
          <Route path="/notifications" component={Notifications} />
          <Route path="/settings" component={() => (
            <div className="p-4">
              <h1 className="text-2xl font-bold mb-4 font-heading">Settings</h1>
              <p className="text-gray-500">Settings will be implemented in a future version.</p>
            </div>
          )} />
          <Route component={NotFound} />
        </Switch>
      </main>
      <AppNavBar />
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
