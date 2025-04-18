import React from 'react';
import { useLocation } from 'wouter';

export function Header() {
  const [location] = useLocation();
  
  // Don't show the header on these pages as they have their own headers
  const hideHeaderOn = ['/plants/', '/settings'];
  
  const shouldShowHeader = !hideHeaderOn.some(path => location.startsWith(path));
  
  if (!shouldShowHeader) {
    return null;
  }
  
  return (
    <header className="bg-primary text-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <span className="text-xl font-bold font-heading flex items-center">
            <span className="mr-2" role="img" aria-label="plant">🪴</span>
            PlantDaddy
          </span>
        </div>
      </div>
    </header>
  );
}