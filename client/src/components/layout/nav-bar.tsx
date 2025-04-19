import React from "react";
import { useLocation } from "wouter";

interface NavBarProps {
  notificationCount: number;
}

export function NavBar({ notificationCount }: NavBarProps) {
  const [location, setLocation] = useLocation();
  
  const navigateTo = (path: string) => {
    setLocation(path);
  };

  const isActive = (path: string) => location === path;

  return (
    <nav className="bg-white fixed bottom-0 left-0 right-0 h-16 shadow-lg flex justify-around items-center">
      <button
        onClick={() => navigateTo("/")}
        className={`flex flex-col items-center justify-center w-1/4 h-full ${
          isActive("/") ? "text-primary" : "text-gray-500"
        }`}
      >
        <span className="material-icons">home</span>
        <span className="text-xs mt-1">Home</span>
      </button>

      <button
        onClick={() => navigateTo("/plant-explorer")}
        className={`flex flex-col items-center justify-center w-1/4 h-full ${
          isActive("/plant-explorer") ? "text-primary" : "text-gray-500"
        }`}
      >
        <span className="material-icons">eco</span>
        <span className="text-xs mt-1">Explorer</span>
      </button>

      <button
        onClick={() => navigateTo("/notifications")}
        className={`flex flex-col items-center justify-center w-1/4 h-full ${
          isActive("/notifications") ? "text-primary" : "text-gray-500"
        } relative`}
      >
        <span className="material-icons">notifications</span>
        <span className="text-xs mt-1">Alerts</span>
        {notificationCount > 0 && (
          <span className="absolute top-[-5px] right-[-5px] h-5 w-5 rounded-full bg-status-overdue text-white flex items-center justify-center text-xs font-bold">
            {notificationCount}
          </span>
        )}
      </button>

      <button
        onClick={() => navigateTo("/settings")}
        className={`flex flex-col items-center justify-center w-1/4 h-full ${
          isActive("/settings") ? "text-primary" : "text-gray-500"
        }`}
      >
        <span className="material-icons">settings</span>
        <span className="text-xs mt-1">Settings</span>
      </button>
    </nav>
  );
}
