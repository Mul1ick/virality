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

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/signup" element={<SignUp />} />
          <Route path="/signin" element={<SignIn />} />
          <Route path="/verify-otp" element={<VerifyOTP />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/select-meta-account" element={<SelectMetaAccount />} />
          <Route
            path="/select-google-account"
            element={<SelectGoogleAccount />}
          />
          <Route path="/select-shopify" element={<SelectShopifyAccount />} />

          <Route
            path="/admin"
            element={
              <AdminRoute>
                <Admin />
              </AdminRoute>
            }
          />

          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>

        {/* Chatbot appears on all pages except profile */}
        <ChatBotWrapper />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
