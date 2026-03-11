import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { GoogleOAuthProvider } from '@react-oauth/google';
import Landing from "./pages/Landing";
import Home from "./pages/Home";
import Auth from "./pages/Auth";
import Feed from "./pages/Feed";
import RecipeBook from "./pages/RecipeBook";
import GeneratedRecipes from "./pages/GeneratedRecipes";
import CreateRecipe from "./pages/CreateRecipe";
import RestaurantDiscovery from "./pages/RestaurantDiscovery";
import RestaurantDetail from "./pages/RestaurantDetail";
import AdminDashboard from "./pages/AdminDashboard";
import SuperAdminDashboard from "./pages/SuperAdminDashboard";
import RestaurantCommunity from '@/pages/RestaurantCommunity';
import NotFound from "./pages/NotFound";
import Navigation from "./components/Navigation";
import { AuthProvider, useAuth } from "./hooks/useAuth";
import { useEffect, useState } from "react";

const queryClient = new QueryClient();

const ProtectedRoute = ({ children }:  { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/" replace state={{ from: location }} />;
  }

  return <>{children}</>;
};

const AppRoutes = () => {
  const { loading, user } = useAuth();
  const location = useLocation();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (! loading) {
      setIsReady(true);
    }
  }, [loading]);

  if (!isReady || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Check if current path is a restaurant route
  const isRestaurantRoute = location.pathname.startsWith('/restaurants');

  return (
    <>
      {/* Only show Navigation for non-restaurant routes */}
      {!isRestaurantRoute && <Navigation />}
      
      <Routes>
        <Route 
          path="/" 
          element={user ? <Navigate to="/home" replace /> : <Landing />} 
        />
        <Route 
          path="/auth" 
          element={user ?  <Navigate to="/home" replace /> : <Auth />} 
        />
        <Route 
          path="/home" 
          element={
            <ProtectedRoute>
              <Home />
            </ProtectedRoute>
          } 
        />
        
        {/* Restaurant Discovery Routes */}
        <Route 
          path="/restaurants" 
          element={
            <ProtectedRoute>
              <RestaurantDiscovery />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/restaurants/:id" 
          element={
            <ProtectedRoute>
              <RestaurantDetail />
            </ProtectedRoute>
          } 
        />
        
        {/* Recipe Routes */}
        <Route 
          path="/feed" 
          element={
            <ProtectedRoute>
              <Feed />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/recipe-book" 
          element={
            <ProtectedRoute>
              <RecipeBook />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/generated-recipes" 
          element={
            <ProtectedRoute>
              <GeneratedRecipes />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/create-recipe" 
          element={
            <ProtectedRoute>
              <CreateRecipe />
            </ProtectedRoute>
          } 
        />
        
        {/* Admin Routes */}
        <Route 
          path="/admin-dashboard" 
          element={
            <ProtectedRoute>
              <AdminDashboard />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/superadmin-dashboard" 
          element={
            <ProtectedRoute>
              <SuperAdminDashboard />
            </ProtectedRoute>
          } 
        />
        <Route path="/restaurant-community" element={<ProtectedRoute><RestaurantCommunity /></ProtectedRoute>} />
        
        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  );
};

const App = () => {
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  if (!googleClientId) {
    console.error('Google Client ID is missing! ');
  }

  return (
    <GoogleOAuthProvider clientId={googleClientId}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <AppRoutes />
            </BrowserRouter>
          </TooltipProvider>
        </AuthProvider>
      </QueryClientProvider>
    </GoogleOAuthProvider>
  );
};

export default App;