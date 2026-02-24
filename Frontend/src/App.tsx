// FILE: Frontend/src/App.tsx
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ChatBotWrapper } from "@/components/chatbot/ChatBotWrapper";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import SignUp from "./pages/SignUp";
import SignIn from "./pages/SignIn";
import Profile from "./pages/Profile";
import VerifyOTP from "./pages/VerifyOTP";
import SelectMetaAccount from "./pages/SelectMetaAccount";
import SelectGoogleAccount from "./pages/SelectGoogleAccount";
import SelectShopifyAccount from "@/pages/SelectShopifyAccount";
import Admin from "./pages/Admin";
import AdminRoute from "./components/auth/AdminRoute";
import ProtectedRoute from "./components/auth/ProtectedRoute";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          {/* Landing page - SignUp for new users */}
          <Route path="/" element={<SignUp />} />

          {/* Dashboard - Protected */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Index />
              </ProtectedRoute>
            }
          />

          {/* Auth routes */}
          <Route path="/signup" element={<SignUp />} />
          <Route path="/signin" element={<SignIn />} />
          <Route path="/verify-otp" element={<VerifyOTP />} />

          {/* Protected routes */}
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            }
          />
          <Route 
  path="/select-meta-account" 
  element={<SelectMetaAccount />} 
/>
          <Route
            path="/select-google-account"
            element={
              <ProtectedRoute>
                <SelectGoogleAccount />
              </ProtectedRoute>
            }
          />
          <Route
            path="/select-shopify"
            element={
              <ProtectedRoute>
                <SelectShopifyAccount />
              </ProtectedRoute>
            }
          />

          {/* Admin route */}
          <Route
            path="/admin"
            element={
              <AdminRoute>
                <Admin />
              </AdminRoute>
            }
          />

          {/* 404 */}
          <Route path="*" element={<NotFound />} />
        </Routes>

        <ChatBotWrapper />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
