// src/lib/api.ts
import axios from 'axios';
import { toast } from '@/hooks/use-toast'; // Or your preferred notification method

const backendUrl = import.meta.env.VITE_BACKEND_URL || "http://localhost:8000";

const apiClient = axios.create({
  baseURL: backendUrl,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor: Add the Authorization header
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      console.log("Interceptor: Added Auth header"); // For debugging
    } else {
      console.warn("Interceptor: No auth token found in localStorage"); // For debugging
      // Optional: You could redirect to login here if no token exists for a protected route
    }
    return config;
  },
  (error) => {
    console.error("Interceptor Request Error:", error); // For debugging
    return Promise.reject(error);
  }
);

// Optional: Response Interceptor (Example: Handle 401 globally)
apiClient.interceptors.response.use(
  (response) => response, // Simply return successful responses
  (error) => {
    console.error("Interceptor Response Error:", error.response || error); // For debugging
    if (error.response && error.response.status === 401) {
      console.error("Authentication Error (401): Token might be invalid or expired.");
      // Clear credentials and redirect to login
      localStorage.clear();
      // Use toast or another notification method
      toast({
        title: "Session Expired",
        description: "Please log in again.",
        variant: "destructive",
      });
      // Redirect using window.location or navigate if within a component/hook context
      // Be careful using navigate directly in a lib file if it relies on context.
      window.location.href = '/signin';
    }
    return Promise.reject(error); // Reject the promise for other errors
  }
);


export default apiClient;