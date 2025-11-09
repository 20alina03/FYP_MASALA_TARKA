import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ChefHat, Home } from "lucide-react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="text-center p-8 max-w-md bg-gradient-card shadow-elegant border-0">
        <div className="p-4 rounded-full bg-primary/20 w-fit mx-auto mb-6">
          <ChefHat className="h-12 w-12 text-primary" />
        </div>
        
        <h1 className="text-6xl font-bold mb-4 bg-gradient-hero bg-clip-text text-transparent">
          404
        </h1>
        
        <h2 className="text-xl font-semibold mb-2">Recipe Not Found!</h2>
        
        <p className="text-muted-foreground mb-6">
          Oops! The page you're looking for doesn't exist. 
          Let's get you back to cooking amazing recipes!
        </p>
        
        <Button 
          asChild
          className="bg-gradient-primary hover:shadow-glow transition-all duration-300"
        >
          <a href="/">
            <Home className="mr-2 h-4 w-4" />
            Back to Kitchen
          </a>
        </Button>
      </Card>
    </div>
  );
};

export default NotFound;
