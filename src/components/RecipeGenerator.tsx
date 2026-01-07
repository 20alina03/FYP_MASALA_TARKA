import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Plus, X, ChefHat, Clock, Users, Flame, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const CUISINES = [
  "Italian", "Indian", "Japanese", "Mediterranean", "Vegan", 
  "American", "Mexican", "Thai", "French", "Chinese", "Korean", "Lebanese"
];

const DIFFICULTY_LEVELS = ["Easy", "Medium", "Hard"];

// Common ingredients organized by categories - all in lowercase
const COMMON_INGREDIENTS = {
  "Vegetables": [
    "onion", "garlic", "tomato", "potato", "carrot", "broccoli", "spinach", 
    "bell pepper", "cucumber", "lettuce", "cabbage", "cauliflower", "zucchini",
    "eggplant", "mushroom", "green beans", "peas", "corn", "asparagus", "celery",
    "ginger", "pumpkin", "sweet potato", "radish", "turnip", "beetroot", "artichoke"
  ],
  "Fruits": [
    "apple", "banana", "orange", "lemon", "lime", "strawberry", "blueberry",
    "grapes", "pineapple", "mango", "avocado", "peach", "pear", "kiwi",
    "watermelon", "cantaloupe", "cherry", "raspberry", "blackberry", "plum",
    "pomegranate", "fig", "date", "coconut", "papaya", "guava", "lychee"
  ],
  "Meat & Poultry": [
    "chicken", "beef", "pork", "lamb", "turkey", "duck", "bacon", "sausage",
    "ham", "chicken breast", "chicken thigh", "ground beef", "steak", "pork chops",
    "chicken wings", "minced meat", "ribs", "veal", "quail"
  ],
  "Seafood": [
    "salmon", "tuna", "shrimp", "prawns", "cod", "tilapia", "crab", "lobster",
    "mussels", "clams", "squid", "octopus", "sardines", "anchovies", "trout",
    "mackerel", "halibut", "scallops", "oysters", "crayfish"
  ],
  "Dairy & Eggs": [
    "milk", "eggs", "butter", "cheese", "yogurt", "cream", "sour cream",
    "cottage cheese", "cream cheese", "parmesan", "mozzarella", "cheddar",
    "feta", "gouda", "ricotta", "buttermilk", "whipping cream", "egg whites",
    "egg yolks"
  ],
  "Grains & Flours": [
    "rice", "pasta", "bread", "flour", "oats", "quinoa", "couscous",
    "barley", "buckwheat", "cornmeal", "whole wheat flour", "breadcrumbs",
    "all-purpose flour", "semolina", "rye flour", "corn flour", "rice flour",
    "noodles", "spaghetti", "vermicelli", "lasagna"
  ],
  "Herbs & Spices": [
    "basil", "oregano", "thyme", "rosemary", "cilantro", "parsley",
    "dill", "mint", "chives", "cinnamon", "cumin", "paprika",
    "turmeric", "ginger", "black pepper", "salt", "chili powder", "nutmeg",
    "cardamom", "cloves", "coriander", "bay leaves", "sage", "tarragon"
  ],
  "Pantry Staples": [
    "olive oil", "vegetable oil", "soy sauce", "vinegar", "honey",
    "sugar", "salt", "pepper", "garlic powder", "onion powder",
    "tomato sauce", "chicken broth", "beef broth", "vegetable broth",
    "sesame oil", "coconut milk", "tomato paste", "worcestershire sauce",
    "mustard", "ketchup", "mayonnaise", "sriracha", "fish sauce"
  ],
  "Legumes & Nuts": [
    "beans", "lentils", "chickpeas", "peanuts", "almonds", "walnuts",
    "cashews", "pistachios", "sunflower seeds", "pumpkin seeds",
    "kidney beans", "black beans", "pinto beans", "green lentils", "red lentils",
    "pecans", "hazelnuts", "macadamia nuts", "chia seeds", "flax seeds"
  ],
  "Baking": [
    "baking powder", "baking soda", "yeast", "vanilla extract", "cocoa powder",
    "chocolate", "powdered sugar", "brown sugar", "molasses", "maple syrup",
    "cornstarch", "shortening", "food coloring", "icing sugar"
  ]
};

// Helper function to normalize ingredient names for comparison
const normalizeIngredient = (ingredient: string): string => {
  return ingredient
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ') // Replace multiple spaces with single space
    .replace(/s$/i, ''); // Remove trailing 's' for plural forms
};

// Function to check if ingredient already exists (handles plurals and similar names)
const isIngredientDuplicate = (newIngredient: string, existingIngredients: string[]): boolean => {
  const normalizedNew = normalizeIngredient(newIngredient);
  
  return existingIngredients.some(existing => {
    const normalizedExisting = normalizeIngredient(existing);
    
    // Check exact match or if one is singular/plural of the other
    return normalizedNew === normalizedExisting ||
           normalizedNew === normalizedExisting + 's' ||
           normalizedExisting === normalizedNew + 's';
  });
};

// Function to format ingredient for display (capitalize first letter)
const formatIngredientDisplay = (ingredient: string): string => {
  return ingredient.charAt(0).toUpperCase() + ingredient.slice(1);
};

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
  const [showCommonIngredients, setShowCommonIngredients] = useState(false);

  const addIngredient = (ingredient: string) => {
    const trimmed = ingredient.trim().toLowerCase();
    
    if (!trimmed) {
      return;
    }
    
    // Check for duplicate (handles plurals and similar names)
    if (isIngredientDuplicate(trimmed, ingredients)) {
      toast.error("Ingredient already added", { duration: 2000 });
      return;
    }
    
    setIngredients([...ingredients, trimmed]);
    // Clear the input field if we're adding from manual input
    if (ingredient === currentIngredient) {
      setCurrentIngredient("");
    }
  };

  const removeIngredient = (ingredient: string) => {
    setIngredients(ingredients.filter(i => i !== ingredient));
  };

  const handleGenerate = () => {
    if (ingredients.length === 0) {
      toast.error("Please add at least one ingredient", { duration: 2000 });
      return;
    }

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
      addIngredient(currentIngredient);
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
            Enter the ingredients you have available right now
          </p>
        </div>

        {/* Ingredients Input */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-foreground">Available Ingredients</h3>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowCommonIngredients(!showCommonIngredients)}
              className="text-sm text-primary hover:text-primary/80"
            >
              {showCommonIngredients ? (
                <>
                  <ChevronUp className="h-4 w-4 mr-1" />
                  Hide Common Ingredients
                </>
              ) : (
                <>
                  <ChevronDown className="h-4 w-4 mr-1" />
                  Show Common Ingredients
                </>
              )}
            </Button>
          </div>
          
          <div className="flex gap-2">
            <Input
              placeholder="e.g., chicken, tomato, rice..."
              value={currentIngredient}
              onChange={(e) => setCurrentIngredient(e.target.value)}
              onKeyPress={handleKeyPress}
              className="flex-1"
            />
            <Button 
              onClick={() => addIngredient(currentIngredient)} 
              disabled={!currentIngredient.trim()}
              variant="outline"
              size="icon"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          
          {/* Common Ingredients Panel */}
          {showCommonIngredients && (
            <Card className="p-4 border bg-muted/30 max-h-96 overflow-y-auto">
              <div className="space-y-4">
                {Object.entries(COMMON_INGREDIENTS).map(([category, items]) => (
                  <div key={category} className="space-y-2">
                    <h4 className="text-sm font-medium text-foreground">{category}</h4>
                    <div className="flex flex-wrap gap-2">
                      {items.map((item) => {
                        const isSelected = isIngredientDuplicate(item, ingredients);
                        return (
                          <Badge
                            key={item}
                            variant="outline"
                            onClick={() => addIngredient(item)}
                            className={cn(
                              "px-3 py-1 cursor-pointer transition-all",
                              "hover:bg-primary/10 hover:text-primary hover:border-primary/50",
                              isSelected && "bg-primary/20 text-primary border-primary cursor-not-allowed"
                            )}
                            title={isSelected ? "Already added" : `Add ${formatIngredientDisplay(item)}`}
                          >
                            {formatIngredientDisplay(item)}
                          </Badge>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
          
          {/* Selected Ingredients List */}
          {ingredients.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-foreground">
                Selected Ingredients ({ingredients.length}):
              </p>
              <div className="flex flex-wrap gap-2">
                {ingredients.map((ingredient) => (
                  <Badge 
                    key={ingredient} 
                    variant="secondary" 
                    className="px-3 py-1 bg-primary/10 text-primary border-primary/20"
                  >
                    {formatIngredientDisplay(ingredient)}
                    <button
                      onClick={() => removeIngredient(ingredient)}
                      className="ml-2 hover:text-destructive transition-colors"
                      title="Remove ingredient"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
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
              Generating Customized Recipes...
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