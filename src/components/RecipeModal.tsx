import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Clock, Users, ChefHat, Flame, CheckCircle2, Minus, Plus, Upload, BookMarked, Share2 } from "lucide-react";
import { Recipe } from "@/components/RecipeCard";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface RecipeModalProps {
  recipe: (Recipe & { 
    isReadOnly?: boolean, 
    fromDb?: boolean, 
    dbRecipeId?: string,
    fromGeneratedRecipes?: boolean,
    generatedRecipeId?: string
  }) | null;
  isOpen: boolean;
  onClose: () => void;
  onSaveToBook?: () => void;
}

const getDifficultyColor = (difficulty: string) => {
  switch (difficulty) {
    case "Easy": return "bg-secondary/20 text-secondary border-secondary/30";
    case "Medium": return "bg-accent/20 text-accent-foreground border-accent/30";
    case "Hard": return "bg-destructive/20 text-destructive border-destructive/30";
    default: return "bg-muted text-muted-foreground";
  }
};

export default function RecipeModal({ recipe, isOpen, onClose, onSaveToBook }: RecipeModalProps) {
  const { user } = useAuth();
  const [currentServings, setCurrentServings] = useState(recipe?.servings || 1);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [isSharing, setIsSharing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  console.log('RecipeModal props:', { recipe, user, onSaveToBook });

  if (!recipe) return null;

  const servingMultiplier = currentServings / recipe.servings;
  
  const adjustServings = (change: number) => {
    const newServings = Math.max(1, Math.min(12, currentServings + change));
    setCurrentServings(newServings);
  };

  const toggleStep = (stepIndex: number) => {
    const newCompleted = new Set(completedSteps);
    if (newCompleted.has(stepIndex)) {
      newCompleted.delete(stepIndex);
    } else {
      newCompleted.add(stepIndex);
    }
    setCompletedSteps(newCompleted);
  };

  const formatIngredientAmount = (ingredient: string) => {
    // Simple regex to find numbers in ingredients and multiply them
    return ingredient.replace(/(\d+(?:\.\d+)?)/g, (match) => {
      const number = parseFloat(match);
      const adjusted = (number * servingMultiplier).toFixed(1);
      return adjusted.endsWith('.0') ? adjusted.slice(0, -2) : adjusted;
    });
  };

  const saveToRecipeBook = async () => {
    if (!user || isSaving) return;
    
    setIsSaving(true);
    try {
      // First save recipe to database if it's not already there
      let recipeId = recipe.dbRecipeId;
      
      if (!recipe.fromDb) {
        const { data: newRecipe, error: insertError } = await supabase
          .from('recipes')
          .insert({
            title: recipe.title,
            description: recipe.description,
            ingredients: recipe.ingredients,
            instructions: recipe.instructions,
            cooking_time: recipe.cookingTime,
            servings: recipe.servings,
            difficulty: recipe.difficulty,
            cuisine: recipe.cuisine,
            calories: recipe.calories,
            author_id: user.id,
          })
          .select('id')
          .single();

        if (insertError) throw insertError;
        recipeId = newRecipe.id;
      }

      // Save to recipe book
      const { error } = await supabase
        .from('recipe_books')
        .insert({
          user_id: user.id,
          recipe_id: recipeId
        });

      if (error) {
        if (error.code === '23505') { // Unique constraint violation
          toast({
            title: "Already saved",
            description: "This recipe is already in your recipe book",
            variant: "destructive",
          });
          return;
        }
        throw error;
      }

      toast({
        title: "Saved to recipe book",
        description: "Recipe saved for offline access",
      });
      
      onSaveToBook?.();
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to save recipe to book",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const saveToRecipeBookFromGenerated = async () => {
    if (!user || isSaving || !recipe.generatedRecipeId) return;
    
    setIsSaving(true);
    try {
      // Get the generated recipe
      const { data: generatedRecipe, error: fetchError } = await supabase
        .from('generated_recipes')
        .select('*')
        .eq('id', recipe.generatedRecipeId)
        .single();

      if (fetchError) throw fetchError;

      // Add to recipes table (community)
      const { data: insertedRecipe, error: recipeError } = await supabase
        .from('recipes')
        .insert({
          title: generatedRecipe.title,
          description: generatedRecipe.description,
          ingredients: generatedRecipe.ingredients,
          instructions: generatedRecipe.instructions,
          image_url: generatedRecipe.image_url,
          cooking_time: generatedRecipe.cooking_time,
          servings: generatedRecipe.servings,
          difficulty: generatedRecipe.difficulty,
          calories: generatedRecipe.calories,
          cuisine: generatedRecipe.cuisine,
          author_id: user.id,
        })
        .select()
        .single();

      if (recipeError) throw recipeError;

      // Add to recipe_books
      const { error: bookError } = await supabase
        .from('recipe_books')
        .insert({
          user_id: user.id,
          recipe_id: insertedRecipe.id,
        });

      if (bookError) {
        if (bookError.code === '23505') { // Unique constraint violation
          toast({
            title: "Already saved",
            description: "This recipe is already in your recipe book",
            variant: "destructive",
          });
          return;
        }
        throw bookError;
      }

      toast({
        title: "Saved to recipe book",
        description: "Recipe saved for offline access",
      });
      
      onSaveToBook?.();
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to save recipe to book",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const shareToCommunitFromGenerated = async () => {
    if (!user || isSharing || !recipe.generatedRecipeId) return;
    
    setIsSharing(true);
    try {
      // Get the generated recipe
      const { data: generatedRecipe, error: fetchError } = await supabase
        .from('generated_recipes')
        .select('*')
        .eq('id', recipe.generatedRecipeId)
        .single();

      if (fetchError) throw fetchError;

      // Add to recipes table (community)
      const { error } = await supabase
        .from('recipes')
        .insert({
          title: generatedRecipe.title,
          description: generatedRecipe.description,
          ingredients: generatedRecipe.ingredients,
          instructions: generatedRecipe.instructions,
          image_url: generatedRecipe.image_url,
          cooking_time: generatedRecipe.cooking_time,
          servings: generatedRecipe.servings,
          difficulty: generatedRecipe.difficulty,
          calories: generatedRecipe.calories,
          cuisine: generatedRecipe.cuisine,
          author_id: user.id,
        });

      if (error) throw error;

      toast({
        title: "Shared to community",
        description: "Your recipe is now available to the community",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to share recipe",
        variant: "destructive",
      });
    } finally {
      setIsSharing(false);
    }
  };

  const shareToCommnunity = async () => {
    if (!user || isSharing) return;
    
    console.log('Sharing recipe to community:', recipe.title);
    setIsSharing(true);
    try {
      const { error } = await supabase
        .from('recipes')
        .insert({
          title: recipe.title,
          description: recipe.description,
          ingredients: recipe.ingredients,
          instructions: recipe.instructions,
          cooking_time: recipe.cookingTime,
          servings: recipe.servings,
          difficulty: recipe.difficulty,
          cuisine: recipe.cuisine,
          calories: recipe.calories,
          author_id: user.id,
        });

      if (error) {
        console.error('Error sharing recipe:', error);
        throw error;
      }

      console.log('Recipe shared successfully');
      toast({
        title: "Shared to community",
        description: "Your recipe is now available to the community",
      });
    } catch (error: any) {
      console.error('Failed to share recipe:', error);
      toast({
        title: "Error",
        description: "Failed to share recipe",
        variant: "destructive",
      });
    } finally {
      setIsSharing(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pb-6">
          <DialogTitle className="text-2xl font-bold bg-gradient-hero bg-clip-text text-transparent">
            {recipe.title}
          </DialogTitle>
          <p className="text-muted-foreground mt-2">{recipe.description}</p>
        </DialogHeader>

        <div className="space-y-6">
          {/* Recipe Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 p-4 rounded-lg bg-muted/30">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Cook Time</p>
                <p className="font-semibold">{recipe.cookingTime}m</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Servings</p>
                <div className="flex items-center gap-2">
                  {!recipe.isReadOnly && (
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => adjustServings(-1)}
                      disabled={currentServings <= 1}
                    >
                      <Minus className="h-3 w-3" />
                    </Button>
                  )}
                  <span className="font-semibold w-8 text-center">{currentServings}</span>
                  {!recipe.isReadOnly && (
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => adjustServings(1)}
                      disabled={currentServings >= 12}
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <ChefHat className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Difficulty</p>
                <Badge 
                  variant="outline" 
                  className={cn("text-xs", getDifficultyColor(recipe.difficulty))}
                >
                  {recipe.difficulty}
                </Badge>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Flame className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Calories</p>
                <p className="font-semibold">{Math.round(recipe.calories * servingMultiplier)}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div>
                <p className="text-sm text-muted-foreground">Cuisine</p>
                <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">
                  {recipe.cuisine}
                </Badge>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Ingredients */}
            <div>
              <h3 className="text-xl font-semibold mb-4">Ingredients</h3>
              <div className="space-y-2">
                {recipe.ingredients.map((ingredient, index) => (
                  <div 
                    key={index}
                    className="flex items-start gap-3 p-3 rounded-lg bg-card border hover:bg-muted/30 transition-smooth"
                  >
                    <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0" />
                    <span className="text-sm">
                      {formatIngredientAmount(ingredient)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Instructions */}
            <div>
              <h3 className="text-xl font-semibold mb-4">Instructions</h3>
              <div className="space-y-3">
                {recipe.instructions.map((instruction, index) => (
                  <div 
                    key={index}
                    className={cn(
                      "flex items-start gap-4 p-4 rounded-lg border transition-all duration-200 cursor-pointer",
                      completedSteps.has(index) 
                        ? "bg-secondary/20 border-secondary/30" 
                        : "bg-card hover:bg-muted/30"
                    )}
                    onClick={() => toggleStep(index)}
                  >
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-semibold text-sm flex-shrink-0 mt-1">
                      {completedSteps.has(index) ? (
                        <CheckCircle2 className="h-4 w-4 text-secondary" />
                      ) : (
                        index + 1
                      )}
                    </div>
                    <p className={cn(
                      "text-sm leading-relaxed",
                      completedSteps.has(index) && "line-through text-muted-foreground"
                    )}>
                      {instruction}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Nutrition Info */}
          {recipe.nutrition && (
            <div className="p-4 rounded-lg bg-muted/30">
              <h3 className="text-lg font-semibold mb-3">Nutrition per serving</h3>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-primary">{recipe.nutrition.protein}</p>
                  <p className="text-sm text-muted-foreground">Protein</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-secondary">{recipe.nutrition.carbs}</p>
                  <p className="text-sm text-muted-foreground">Carbs</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-accent">{recipe.nutrition.fat}</p>
                  <p className="text-sm text-muted-foreground">Fat</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-muted-foreground">{recipe.nutrition.fiber}</p>
                  <p className="text-sm text-muted-foreground">Fiber</p>
                </div>
              </div>
            </div>
          )}

          <Separator />

          <div className="flex justify-between items-center">
            <div className="text-sm text-muted-foreground">
              Recipe adjusted for {currentServings} serving{currentServings !== 1 ? 's' : ''}
            </div>
            <div className="flex gap-2">
              {user && (
                <>
                  {recipe.fromGeneratedRecipes && (
                    <>
                      <Button 
                        variant="outline" 
                        onClick={saveToRecipeBookFromGenerated}
                        disabled={isSaving}
                      >
                        <BookMarked className="mr-2 h-4 w-4" />
                        {isSaving ? 'Adding to Book...' : 'Add to Recipe Book'}
                      </Button>
                      <Button 
                        variant="outline" 
                        onClick={shareToCommunitFromGenerated}
                        disabled={isSharing}
                      >
                        <Share2 className="mr-2 h-4 w-4" />
                        {isSharing ? 'Sharing...' : 'Share to Community'}
                      </Button>
                    </>
                  )}
                  
                  {!recipe.fromDb && !recipe.fromGeneratedRecipes && (
                    <Button 
                      variant="outline" 
                      onClick={saveToRecipeBook}
                      disabled={isSaving}
                    >
                      <BookMarked className="mr-2 h-4 w-4" />
                      {isSaving ? 'Saving...' : 'Save to Book'}
                    </Button>
                  )}
                  
                  {!recipe.fromGeneratedRecipes && (
                    <Button 
                      variant="outline" 
                      onClick={shareToCommnunity}
                      disabled={isSharing}
                    >
                      <Upload className="mr-2 h-4 w-4" />
                      {isSharing ? 'Sharing...' : 'Share to Community'}
                    </Button>
                  )}
                </>
              )}
              <Button variant="outline" onClick={onClose}>
                Close Recipe
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}