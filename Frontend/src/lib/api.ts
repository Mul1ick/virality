// src/lib/api.ts
import axios from 'axios';
import { toast } from '@/hooks/use-toast';

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
    } else {
      console.warn("Interceptor: No auth token found in localStorage");
    }
    return config;
  },
  (error) => {
    console.error("Interceptor Request Error:", error);
    return Promise.reject(error);
  }
);

// Prevent multiple 401 redirects from racing each other
let isRedirectingTo401 = false;

// Response Interceptor: Handle 401 globally (debounced)
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Only process the FIRST 401 — ignore subsequent ones
      if (!isRedirectingTo401) {
        isRedirectingTo401 = true;
        console.error("Authentication Error (401): Token might be invalid or expired.");

        // Clear auth data specifically (not everything)
        localStorage.removeItem('access_token');

        toast({
          title: "Session Expired",
          description: "Please log in again.",
          variant: "destructive",
        });

        // Small delay so the toast can show before redirect
        setTimeout(() => {
          window.location.href = '/signin';
        }, 300);
      }
    }
    return Promise.reject(error);
  }
);


export default apiClient;
