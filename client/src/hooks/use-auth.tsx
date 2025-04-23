import { createContext, ReactNode, useContext } from "react";
import {
  useQuery,
  useMutation,
  UseMutationResult,
} from "@tanstack/react-query";
import { User } from "@shared/schema";
import { getQueryFn, apiRequest, queryClient } from "../lib/queryClient";
import { useToast } from "@/hooks/use-toast";

// User data returned from the API
type UserData = {
  id: number;
  username: string;
};

type AuthContextType = {
  user: UserData | null;
  isLoading: boolean;
  error: Error | null;
  loginMutation: UseMutationResult<UserData, Error, LoginData>;
  logoutMutation: UseMutationResult<void, Error, void>;
  registerMutation: UseMutationResult<UserData, Error, RegisterData>;
};

type LoginData = {
  username: string;
  password: string;
};

type RegisterData = {
  username: string;
  password: string;
};

export const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  
  const {
    data: user,
    error,
    isLoading,
  } = useQuery<UserData | null, Error>({
    queryKey: ["/api/user"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginData) => {
      console.log("Attempting to login with username:", credentials.username);
      
      // Make the API request
      const res = await apiRequest("POST", "/api/login", credentials);
      console.log("Login response status:", res.status);
      
      // For successful responses (status 2xx)
      if (res.ok) {
        // Try to parse JSON, but don't fail if it's not JSON
        let userData: any = { 
          id: -1, 
          username: credentials.username 
        };
        
        const text = await res.text();
        console.log("Login response text:", text);
        
        if (text && text.trim()) {
          try {
            // Only try to parse as JSON if it looks like JSON
            if (text.trim().startsWith('{')) {
              userData = JSON.parse(text);
              console.log("Parsed login response:", userData);
            }
          } catch (parseErr) {
            console.warn("Failed to parse login response as JSON:", parseErr);
            // We'll use the default user data
          }
        }
        
        // Success case - return the data 
        return userData;
      }
      
      // Handle error responses
      let errorMessage = "Login failed";
      try {
        const text = await res.text();
        console.error("Login error response text:", text);
        
        if (text && text.trim()) {
          if (text.trim().startsWith('{')) {
            const errorData = JSON.parse(text);
            if (errorData && 'error' in errorData) {
              errorMessage = errorData.error;
            }
          }
        }
      } catch (parseErr) {
        console.error("Failed to parse login error response:", parseErr);
      }
      
      // Throw with appropriate error message
      throw new Error(errorMessage || "Login failed: " + res.statusText);
    },
    onSuccess: (user: UserData) => {
      console.log("Login successful for user:", user);
      
      // Update user data in cache
      queryClient.setQueryData(["/api/user"], user);
      
      // Show success message
      toast({
        title: "Login successful",
        description: `Welcome back, ${user.username}!`,
      });
      
      // Redirect to home page
      setTimeout(() => {
        window.location.href = "/";
      }, 300); // Small delay to allow toast to appear
    },
    onError: (error: Error) => {
      console.error("Login error:", error);
      
      let errorMessage = error.message;
      
      // Make error messages more user-friendly
      if (error.message === "Invalid username or password") {
        errorMessage = "We couldn't find an account with these credentials. Please check your username and password, or create a new account.";
      }
      
      toast({
        title: "Login failed",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (credentials: RegisterData) => {
      console.log("Attempting to register with username:", credentials.username);
      
      // Make the API request
      const res = await apiRequest("POST", "/api/register", credentials);
      console.log("Registration response status:", res.status);
      
      // For successful responses (status 2xx)
      if (res.ok) {
        // Try to parse JSON, but don't fail if it's not JSON
        let userData: any = { 
          id: -1, 
          username: credentials.username 
        };
        
        const text = await res.text();
        console.log("Registration response text:", text);
        
        if (text && text.trim()) {
          try {
            // Only try to parse as JSON if it looks like JSON
            if (text.trim().startsWith('{')) {
              userData = JSON.parse(text);
              console.log("Parsed registration response:", userData);
            }
          } catch (parseErr) {
            console.warn("Failed to parse registration response as JSON:", parseErr);
            // We'll use the default user data
          }
        }
        
        // Success case - return the data 
        return userData;
      }
      
      // Handle error responses
      let errorMessage = "Registration failed";
      try {
        const text = await res.text();
        console.error("Registration error response text:", text);
        
        if (text && text.trim()) {
          if (text.trim().startsWith('{')) {
            const errorData = JSON.parse(text);
            if (errorData && 'error' in errorData) {
              errorMessage = errorData.error;
            }
          }
        }
      } catch (parseErr) {
        console.error("Failed to parse registration error response:", parseErr);
      }
      
      // Throw with appropriate error message
      throw new Error(errorMessage || "Registration failed: " + res.statusText);
    },
    onSuccess: (user: UserData) => {
      console.log("Registration successful for user:", user);
      
      // Update user data in cache
      queryClient.setQueryData(["/api/user"], user);
      
      // Show success message
      toast({
        title: "Registration successful",
        description: `Welcome to PlantDaddy, ${user.username}!`,
      });
      
      // Redirect to home page
      setTimeout(() => {
        window.location.href = "/";
      }, 300); // Small delay to allow toast to appear
    },
    onError: (error: Error) => {
      console.error("Registration error:", error);
      
      let errorMessage = error.message;
      
      // Make error messages more user-friendly
      if (error.message === "Username already exists") {
        errorMessage = "This username is already taken. Please choose a different username.";
      }
      
      toast({
        title: "Registration failed",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      console.log("Starting simple logout process");
      
      // Make a simple fetch request instead of using the apiRequest function
      const response = await fetch("/api/logout", {
        method: "POST",
        credentials: "include" // Important for cookies/session
      });
      
      console.log("Logout response status:", response.status);
      
      // Any response is considered success for logout
      // We'll clear the user session on the client side regardless
      return true;
    },
    onSuccess: () => {
      console.log("Logout completed, clearing session data");
      
      // Clear user data from cache
      queryClient.setQueryData(["/api/user"], null);
      
      // Invalidate all queries
      queryClient.invalidateQueries();
      
      // Show success message
      toast({
        title: "Logged out",
        description: "You've been successfully logged out."
      });
      
      // Force redirect to auth page
      window.location.href = "/auth";
    },
    onError: (error) => {
      console.error("Logout error:", error);
      
      // Even if server-side logout fails, we can force client-side logout
      queryClient.setQueryData(["/api/user"], null);
      queryClient.invalidateQueries();
      
      // Still redirect to auth page
      window.location.href = "/auth";
      
      // Don't show error toast since we're still effectively logging out
    }
  });

  return (
    <AuthContext.Provider
      value={{
        user: user ?? null,
        isLoading,
        error,
        loginMutation,
        logoutMutation,
        registerMutation,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}