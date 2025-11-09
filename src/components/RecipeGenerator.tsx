import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Plus, X, ChefHat, Clock, Users, Flame } from "lucide-react";
import { cn } from "@/lib/utils";

const CUISINES = [
  "Italian", "Indian", "Japanese", "Mediterranean", "Vegan", 
  "American", "Mexican", "Thai", "French", "Chinese", "Korean", "Lebanese"
];

const DIFFICULTY_LEVELS = ["Easy", "Medium", "Hard"];

interface RecipeGeneratorProps {
  onRecipeGenerate: (params: RecipeParams) => void;
  isLoading: boolean;
}

interface RecipeParams {
  ingredients: string[];
  cuisine: string;
  maxCalories?: number;
  servings: number;
  difficulty: string;
}

export default function RecipeGenerator({ onRecipeGenerate, isLoading }: RecipeGeneratorProps) {
  const [ingredients, setIngredients] = useState<string[]>([]);
  const [currentIngredient, setCurrentIngredient] = useState("");
  const [cuisine, setCuisine] = useState("");
  const [maxCalories, setMaxCalories] = useState([800]);
  const [servings, setServings] = useState([4]);
  const [difficulty, setDifficulty] = useState("");

  const addIngredient = () => {
    if (currentIngredient.trim() && !ingredients.includes(currentIngredient.trim())) {
      setIngredients([...ingredients, currentIngredient.trim()]);
      setCurrentIngredient("");
    }
  };

  const removeIngredient = (ingredient: string) => {
    setIngredients(ingredients.filter(i => i !== ingredient));
  };

  const handleGenerate = () => {
    if (ingredients.length === 0) return;

    onRecipeGenerate({
      ingredients,
      cuisine,
      maxCalories: maxCalories[0],
      servings: servings[0],
      difficulty
    });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addIngredient();
    }
  };

  return (
    <Card className="p-8 bg-card border shadow-sm hover:shadow-md transition-shadow duration-300">
      <div className="space-y-6">
        <div className="text-center mb-8">
          <div className="p-3 rounded-full bg-primary/10 w-fit mx-auto mb-4">
            <ChefHat className="h-8 w-8 text-primary" />
          </div>
          <h2 className="text-3xl font-bold text-foreground mb-2">
            AI Recipe Generator
          </h2>
          <p className="text-muted-foreground">
            Enter your ingredients and discover amazing recipes
          </p>
        </div>

        {/* Ingredients Input */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-foreground">Available Ingredients</h3>
          <div className="flex gap-2">
            <Input
              placeholder="Add an ingredient..."
              value={currentIngredient}
              onChange={(e) => setCurrentIngredient(e.target.value)}
              onKeyPress={handleKeyPress}
              className="flex-1"
            />
            <Button 
              onClick={addIngredient} 
              disabled={!currentIngredient.trim()}
              variant="outline"
              size="icon"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          
          {/* Ingredients List */}
          {ingredients.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-4">
              {ingredients.map((ingredient) => (
                <Badge 
                  key={ingredient} 
                  variant="secondary" 
                  className="px-3 py-1 bg-primary/10 text-primary border-primary/20"
                >
                  {ingredient}
                  <button
                    onClick={() => removeIngredient(ingredient)}
                    className="ml-2 hover:text-destructive transition-colors"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </div>

        {/* Cuisine Selection */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2 text-foreground">
              <Flame className="h-4 w-4 text-muted-foreground" />
              Cuisine Type
            </label>
            <Select value={cuisine} onValueChange={setCuisine}>
              <SelectTrigger>
                <SelectValue placeholder="Any cuisine" />
              </SelectTrigger>
              <SelectContent>
                {CUISINES.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Difficulty Level</label>
            <Select value={difficulty} onValueChange={setDifficulty}>
              <SelectTrigger>
                <SelectValue placeholder="Any difficulty" />
              </SelectTrigger>
              <SelectContent>
                {DIFFICULTY_LEVELS.map((d) => (
                  <SelectItem key={d} value={d}>{d}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Sliders */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <label className="text-sm font-medium flex items-center gap-2 text-foreground">
              <Clock className="h-4 w-4 text-muted-foreground" />
              Max Calories: {maxCalories[0]}
            </label>
            <Slider
              value={maxCalories}
              onValueChange={setMaxCalories}
              max={2000}
              min={200}
              step={50}
              className="w-full"
            />
          </div>

          <div className="space-y-3">
            <label className="text-sm font-medium flex items-center gap-2 text-foreground">
              <Users className="h-4 w-4 text-muted-foreground" />
              Servings: {servings[0]}
            </label>
            <Slider
              value={servings}
              onValueChange={setServings}
              max={12}
              min={1}
              step={1}
              className="w-full"
            />
          </div>
        </div>

        <Button 
          onClick={handleGenerate}
          disabled={ingredients.length === 0 || isLoading}
          className={cn(
            "w-full py-6 text-lg font-semibold bg-primary text-primary-foreground",
            "hover:bg-primary/90 transition-all duration-300",
            "relative overflow-hidden"
          )}
        >
          {isLoading ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2" />
              Generating Recipes...
            </>
          ) : (
            <>
              <ChefHat className="mr-2 h-5 w-5" />
              Generate Recipes
            </>
          )}
        </Button>
      </div>
    </Card>
  );
}