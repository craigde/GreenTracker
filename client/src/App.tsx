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
import Settings from "@/pages/settings";
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
          <Route path="/settings" component={Settings} />
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
