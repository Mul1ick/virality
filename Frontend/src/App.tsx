// FILE: Frontend/src/App.tsx
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
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
import ProtectedRoute from "./components/auth/ProtectedRoute"; // <--- 1. Import this

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          {/* 2. Wrap the Index route with ProtectedRoute */}
          <Route 
            path="/" 
            element={
              <ProtectedRoute>
                <Index />
              </ProtectedRoute>
            } 
          />
          
          <Route path="/signup" element={<SignUp />} />
          <Route path="/signin" element={<SignIn />} />
          <Route path="/verify-otp" element={<VerifyOTP />} />
          
          {/* You should probably protect these routes too */}
          <Route 
            path="/profile" 
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            } 
          />
          <Route path="/select-meta-account" element={<ProtectedRoute><SelectMetaAccount /></ProtectedRoute>} />
          <Route path="/select-google-account" element={<ProtectedRoute><SelectGoogleAccount /></ProtectedRoute>} />
          <Route path="/select-shopify" element={<ProtectedRoute><SelectShopifyAccount /></ProtectedRoute>} />

          <Route
            path="/admin"
            element={
              <AdminRoute>
                <Admin />
              </AdminRoute>
            }
          />

          <Route path="*" element={<NotFound />} />
        </Routes>

        <ChatBotWrapper />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;