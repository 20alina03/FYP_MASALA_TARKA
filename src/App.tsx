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
import NotFound from "./pages/NotFound";
import Navigation from "./components/Navigation";
import { AuthProvider, useAuth } from "./hooks/useAuth";
import { useEffect, useState } from "react";

const queryClient = new QueryClient();

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
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
    console.log('No user found, redirecting to landing');
    return <Navigate to="/" replace state={{ from: location }} />;
  }

  return <>{children}</>;
};

const AppRoutes = () => {
  const { loading, user } = useAuth();
  const location = useLocation();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (!loading) {
      setIsReady(true);
    }
  }, [loading]);

  useEffect(() => {
    console.log('Auth state changed:', { 
      user: user ? `${user.email} (${user.id})` : 'null', 
      loading,
      path: location.pathname 
    });
  }, [user, loading, location.pathname]);

  if (!isReady || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <>
      <Navigation />
      <Routes>
        <Route 
          path="/" 
          element={user ? <Navigate to="/home" replace /> : <Landing />} 
        />
        <Route 
          path="/auth" 
          element={user ? <Navigate to="/home" replace /> : <Auth />} 
        />
        <Route 
          path="/home" 
          element={
            <ProtectedRoute>
              <Home />
            </ProtectedRoute>
          } 
        />
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
        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  );
};

const App = () => {
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  if (!googleClientId) {
    console.error('Google Client ID is missing!');
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