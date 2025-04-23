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
      try {
        // Make API request
        const res = await apiRequest("POST", "/api/login", credentials);
        console.log("Login response status:", res.status);
        
        // Handle successful login (status 2xx)
        if (res.ok) {
          try {
            const data = await res.json();
            console.log("Login success response:", data);
            return data;
          } catch (err) {
            console.error("Failed to parse successful login response:", err);
            // If we can't parse the response, use basic user data
            return { 
              id: -1, 
              username: credentials.username 
            };
          }
        }
        
        // Handle error responses
        let errorMessage = "Login failed";
        try {
          const errorData = await res.json();
          console.error("API Error Response:", errorData);
          if (errorData && 'error' in errorData) {
            errorMessage = errorData.error;
          }
        } catch (parseErr) {
          console.error("Failed to parse error response:", parseErr);
        }
        
        console.error("Login failed:", errorMessage);
        throw new Error(errorMessage);
      } catch (err) {
        if (err instanceof Error) {
          console.error("Login request error:", err);
          throw err;
        } else {
          // For non-Error objects
          console.error("Login error (unknown type):", err);
          throw new Error("Login failed. Please try again.");
        }
      }
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
      try {
        // Make API request
        const res = await apiRequest("POST", "/api/register", credentials);
        console.log("Registration response status:", res.status);
        
        // Handle successful registration (status 2xx)
        if (res.ok) {
          try {
            const data = await res.json();
            console.log("Registration success response:", data);
            return data;
          } catch (err) {
            console.error("Failed to parse successful registration response:", err);
            // If we can't parse the response, use basic user data
            return { 
              id: -1, 
              username: credentials.username 
            };
          }
        }
        
        // Handle error responses
        let errorMessage = "Registration failed";
        try {
          const errorData = await res.json();
          console.error("API Error Response:", errorData);
          if (errorData && 'error' in errorData) {
            errorMessage = errorData.error;
          }
        } catch (parseErr) {
          console.error("Failed to parse error response:", parseErr);
        }
        
        console.error("Registration failed:", errorMessage);
        throw new Error(errorMessage);
      } catch (err) {
        if (err instanceof Error) {
          console.error("Registration request error:", err);
          throw err;
        } else {
          // For non-Error objects
          console.error("Registration error (unknown type):", err);
          throw new Error("Registration failed. Please try again.");
        }
      }
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
      try {
        console.log("Attempting to logout");
        const res = await apiRequest("POST", "/api/logout");
        
        // Always parse response for consistency
        let responseData = {};
        try {
          responseData = await res.json();
          console.log("Logout response:", responseData);
        } catch (parseErr) {
          console.error("Failed to parse logout response:", parseErr);
        }
        
        // Check for success or error
        if (!res.ok) {
          const errorMessage = 
            responseData && 'error' in responseData 
              ? responseData.error 
              : "Logout failed: " + res.statusText;
          
          throw new Error(errorMessage);
        }
        
        // Return response data in case we need it
        return responseData;
      } catch (err) {
        console.error("Logout request error:", err);
        throw err;
      }
    },
    onSuccess: (data) => {
      // Log success data
      console.log("Logout successful:", data);
      
      // Clear user data from cache
      queryClient.setQueryData(["/api/user"], null);
      
      // Invalidate all queries to force refetch when logged in again
      queryClient.invalidateQueries();
      
      // Show success message
      toast({
        title: "Logged out",
        description: data && 'message' in data 
          ? data.message 
          : "You've been successfully logged out.",
      });
      
      // Force redirect to auth page
      setTimeout(() => {
        window.location.href = "/auth";
      }, 500); // Small delay to ensure toast is seen
    },
    onError: (error: Error) => {
      console.error("Logout error:", error);
      
      toast({
        title: "Logout failed",
        description: error.message || "Could not complete logout process.",
        variant: "destructive",
      });
    },
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