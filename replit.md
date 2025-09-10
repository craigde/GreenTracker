# PlantDaddy - Plant Care Management System

## Overview

PlantDaddy is a full-stack web application designed to help users track and manage their indoor plants. The application provides a comprehensive plant care system with watering schedules, notifications, location management, and plant species exploration. Built with React and Express, it offers both web-based management and notification capabilities through multiple channels.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **React SPA**: Single-page application using React with TypeScript
- **UI Framework**: Radix UI components with custom Tailwind CSS styling
- **State Management**: TanStack Query for server state and React hooks for local state
- **Routing**: Wouter for client-side routing
- **Form Handling**: React Hook Form with Zod validation
- **Theme System**: Next-themes with light/dark mode support and custom theme configuration

### Backend Architecture
- **Express.js Server**: RESTful API with TypeScript
- **Authentication**: Passport.js with local strategy and session-based authentication
- **Database Layer**: Drizzle ORM with PostgreSQL
- **File Uploads**: Multer for plant image handling
- **Background Jobs**: Custom scheduler for automated notification checks

### Data Storage Solutions
- **Primary Database**: PostgreSQL with Neon serverless hosting
- **ORM**: Drizzle ORM for type-safe database operations
- **Session Storage**: PostgreSQL-backed session store using connect-pg-simple
- **File Storage**: Local filesystem for uploaded plant images
- **Schema Management**: Drizzle Kit for migrations and schema changes

### Authentication and Authorization
- **Session-based Authentication**: Express sessions with PostgreSQL storage
- **Password Security**: Bcrypt hashing with salt
- **Multi-user Support**: User-scoped data access with AsyncLocalStorage for request context
- **Route Protection**: Middleware-based authentication checks for protected endpoints

### Key Features
- **Plant Management**: CRUD operations for plants with watering schedules and care notes
- **Location Management**: Organization of plants by user-defined locations
- **Plant Species Catalog**: Searchable database of plant species with care information
- **Notification System**: Multi-channel notifications (Pushover, email) for watering reminders
- **Multiple View Modes**: Grid, list, and calendar views for plant organization
- **Image Support**: Plant photo uploads with preview and storage
- **Responsive Design**: Mobile-first design with touch-friendly interface

## External Dependencies

### Database Services
- **Neon PostgreSQL**: Serverless PostgreSQL hosting with connection pooling
- **Drizzle ORM**: Type-safe database toolkit with automatic migrations

### Notification Services
- **Pushover API**: Push notifications to mobile devices and desktop
- **SendGrid**: Email delivery service for watering reminders and system notifications

### UI and Styling
- **Radix UI**: Accessible component primitives for complex UI elements
- **Tailwind CSS**: Utility-first CSS framework with custom design system
- **Material Icons**: Google's icon font for consistent iconography
- **Custom Theme System**: Replit's shadcn theme plugin for dynamic theming

### Development and Build Tools
- **Vite**: Frontend build tool with hot module replacement
- **TypeScript**: Type safety across frontend and backend
- **ESBuild**: Fast JavaScript bundler for production builds
- **Node.js WebSocket**: WebSocket support for Neon serverless connections

### File and Media Handling
- **Multer**: Multipart form data handling for file uploads
- **Local File System**: Image storage with unique filename generation