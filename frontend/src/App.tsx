import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import Index from "./pages/Index";
import Blog from "./pages/Blog";
import About from "./pages/About";
import NotFound from "./pages/NotFound";
import CardManager from "./pages/CardManager";
import PaymentSuccess from "./pages/PaymentSuccess";
import PaymentCancel from "./pages/PaymentCancel";
import Dashboard from "./pages/Dashboard";
import AuthCallback from "./pages/AuthCallback";
import SplitApp from "./pages/SplitApp";
import Analytics from "./pages/Analytics";
import VirtualCard from "./pages/VirtualCard";
import PlaidLink from "./pages/PlaidLink";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const token = localStorage.getItem("access_token");
  const location = useLocation();
  if (!token) return <Navigate to="/" state={{ from: location }} replace />;
  return <>{children}</>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const token = localStorage.getItem("access_token");
  if (token) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <Routes>
        {/* Public */}
        <Route path="/" element={<PublicRoute><Index /></PublicRoute>} />
        <Route path="/blog" element={<Blog />} />
        <Route path="/about" element={<About />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        {/* Protected */}
        <Route path="/dashboard"    element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/split"        element={<ProtectedRoute><SplitApp /></ProtectedRoute>} />
        <Route path="/cards"        element={<ProtectedRoute><CardManager /></ProtectedRoute>} />
        <Route path="/analytics"    element={<ProtectedRoute><Analytics /></ProtectedRoute>} />
        <Route path="/virtual-card" element={<ProtectedRoute><VirtualCard /></ProtectedRoute>} />
        <Route path="/bank"         element={<ProtectedRoute><PlaidLink /></ProtectedRoute>} />
        {/* Payment */}
        <Route path="/payment/success" element={<PaymentSuccess />} />
        <Route path="/payment/cancel"  element={<PaymentCancel />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;