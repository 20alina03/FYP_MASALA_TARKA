import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, Users, ChefHat, Flame, Eye } from "lucide-react";
import { cn } from "@/lib/utils";

export interface Recipe {
  id: string;
  title: string;
  description: string;
  ingredients: string[];
  instructions: string[];
  cookingTime: number;
  servings: number;
  difficulty: "Easy" | "Medium" | "Hard";
  cuisine: string;
  calories: number;
  nutrition?: {
    protein: string;
    carbs: string;
    fat: string;
    fiber: string;
  };
}

interface RecipeCardProps {
  recipe: Recipe;
  onViewDetails: (recipe: Recipe) => void;
}

const getDifficultyColor = (difficulty: string) => {
  switch (difficulty) {
    case "Easy": return "bg-secondary/20 text-secondary border-secondary/30";
    case "Medium": return "bg-accent/20 text-accent-foreground border-accent/30";
    case "Hard": return "bg-destructive/20 text-destructive border-destructive/30";
    default: return "bg-muted text-muted-foreground";
  }
};

export default function RecipeCard({ recipe, onViewDetails }: RecipeCardProps) {
  return (
    <Card className="group overflow-hidden bg-gradient-card shadow-card border-0 hover:shadow-elegant transition-all duration-300 hover:scale-[1.02]">
      <div className="p-6">
        <div className="flex justify-between items-start mb-4">
          <div className="flex-1">
            <h3 className="text-xl font-bold mb-2 group-hover:text-primary transition-smooth">
              {recipe.title}
            </h3>
            <p className="text-muted-foreground text-sm line-clamp-2 mb-3">
              {recipe.description}
            </p>
          </div>
        </div>

        {/* Recipe Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
          <div className="flex items-center gap-2 text-sm">
            <Clock className="h-4 w-4 text-primary" />
            <span className="font-medium">{recipe.cookingTime}m</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Users className="h-4 w-4 text-primary" />
            <span className="font-medium">{recipe.servings} servings</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Flame className="h-4 w-4 text-primary" />
            <span className="font-medium">{recipe.calories} cal</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <ChefHat className="h-4 w-4 text-primary" />
            <Badge 
              variant="outline" 
              className={cn("text-xs", getDifficultyColor(recipe.difficulty))}
            >
              {recipe.difficulty}
            </Badge>
          </div>
        </div>

        {/* Cuisine Badge */}
        <div className="mb-4">
          <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">
            {recipe.cuisine}
          </Badge>
        </div>

        {/* Key Ingredients Preview */}
        <div className="mb-4">
          <p className="text-xs text-muted-foreground mb-2">Key ingredients:</p>
          <div className="flex flex-wrap gap-1">
            {recipe.ingredients.slice(0, 4).map((ingredient, index) => (
              <Badge 
                key={index} 
                variant="outline" 
                className="text-xs bg-muted/50 border-muted"
              >
                {ingredient}
              </Badge>
            ))}
            {recipe.ingredients.length > 4 && (
              <Badge variant="outline" className="text-xs bg-muted/50 border-muted">
                +{recipe.ingredients.length - 4} more
              </Badge>
            )}
          </div>
        </div>

        {/* Nutrition Info (if available) */}
        {recipe.nutrition && (
          <div className="mb-4 p-3 rounded-lg bg-muted/30">
            <p className="text-xs font-semibold text-muted-foreground mb-2">Nutrition per serving:</p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>Protein: {recipe.nutrition.protein}</div>
              <div>Carbs: {recipe.nutrition.carbs}</div>
              <div>Fat: {recipe.nutrition.fat}</div>
              <div>Fiber: {recipe.nutrition.fiber}</div>
            </div>
          </div>
        )}

        <Button 
          onClick={() => onViewDetails(recipe)}
          className="w-full bg-gradient-primary hover:shadow-glow transition-all duration-300 hover:scale-[1.02]"
        >
          <Eye className="mr-2 h-4 w-4" />
          View Full Recipe
        </Button>
      </div>
    </Card>
  );
}