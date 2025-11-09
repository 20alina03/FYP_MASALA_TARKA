import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Feed from "./pages/Feed";
import RecipeBook from "./pages/RecipeBook";
import GeneratedRecipes from "./pages/GeneratedRecipes";
import CreateRecipe from "./pages/CreateRecipe";
import NotFound from "./pages/NotFound";
import Navigation from "./components/Navigation";
import { useAuth } from "./hooks/useAuth";

const queryClient = new QueryClient();

const App = () => {
  const { loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Navigation />
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/feed" element={<Feed />} />
            <Route path="/recipe-book" element={<RecipeBook />} />
            <Route path="/generated-recipes" element={<GeneratedRecipes />} />
            <Route path="/create-recipe" element={<CreateRecipe />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;