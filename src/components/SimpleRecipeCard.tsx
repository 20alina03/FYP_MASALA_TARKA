import { useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, Users, Eye, Edit, Trash2, BookOpen, Share2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { mongoClient } from '@/lib/mongodb-client';
import { toast } from '@/hooks/use-toast';
import EditRecipeModal from './EditRecipeModal';

export interface SimpleRecipe {
  id: string;
  title: string;
  description: string;
  ingredients?: any[];
  instructions?: any[];
  image_url?: string;
  cooking_time?: number;
  servings?: number;
  difficulty?: string;
  cuisine?: string;
  calories?: number;
  nutrition?: {
    protein: string;
    carbs: string;
    fat: string;
    fiber: string;
  };
  author_id?: string;
  user_id?: string;
  recipe_id?: string;
  generated_recipe_id?: string;
  created_at?: string;
  generated_at?: string;
}

interface SimpleRecipeCardProps {
  recipe: SimpleRecipe;
  onViewRecipe: (recipe: SimpleRecipe) => void;
  onRecipeUpdate?: () => void;
  showEditDelete?: boolean;
  isFromGeneratedRecipes?: boolean;
  isFromRecipeBook?: boolean;
}

export const SimpleRecipeCard = ({ 
  recipe, 
  onViewRecipe, 
  onRecipeUpdate,
  showEditDelete = true,
  isFromGeneratedRecipes = false,
  isFromRecipeBook = false
}: SimpleRecipeCardProps) => {
  const { user } = useAuth();
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Determine the source for the edit modal
  const getRecipeSource = () => {
    if (isFromGeneratedRecipes) return 'generated';
    if (isFromRecipeBook) {
      // Check if it's from generated_recipe_books or recipe_books
      if (recipe.generated_recipe_id) return 'generated';
      return 'community';
    }
    return 'community';
  };

  const handleSaveToBook = async () => {
    if (!user || isSaving) return;
    
    setIsSaving(true);
    try {
      console.log('Saving to recipe book:', { userId: user.id, recipeId: recipe.id, isFromGeneratedRecipes });
      
      if (isFromGeneratedRecipes || recipe.generated_recipe_id) {
        const { error: insertError } = await mongoClient
          .from('generated_recipe_books')
          .insert({
            generated_recipe_id: recipe.generated_recipe_id || recipe.id,
            user_id: user.id,
            added_at: new Date().toISOString(),
          });
        
        if (insertError) {
          console.error('Insert error:', insertError);
          if (insertError.error?.includes('already in book') || insertError.code === 'duplicate_key' || insertError.code === '23505') {
            toast({
              title: "Already in Recipe Book",
              description: "This recipe is already in your book",
              variant: "destructive",
            });
            return;
          }
          throw insertError;
        }
      } else {
        const { error: insertError } = await mongoClient
          .from('recipe_books')
          .insert({
            recipe_id: recipe.recipe_id || recipe.id,
            user_id: user.id,
            added_at: new Date().toISOString(),
          });
        
        if (insertError) {
          console.error('Insert error:', insertError);
          if (insertError.error?.includes('already in book') || insertError.code === 'duplicate_key' || insertError.code === '23505') {
            toast({
              title: "Already in Recipe Book",
              description: "This recipe is already in your book",
              variant: "destructive",
            });
            return;
          }
          throw insertError;
        }
      }
      
      console.log('Successfully saved to recipe book');
      toast({
        title: "Saved to recipe book",
        description: "Recipe added to your collection",
      });
      
      if (onRecipeUpdate) {
        await onRecipeUpdate();
      }
    } catch (error: any) {
      console.error('Save to book error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to save recipe",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleShareToCommunity = async () => {
    if (!user || isSharing) return;
    
    setIsSharing(true);
    try {
      console.log('Sharing to community:', recipe.id);
      
      const recipeData = {
        title: recipe.title,
        description: recipe.description,
        ingredients: recipe.ingredients,
        instructions: recipe.instructions,
        image_url: recipe.image_url,
        cooking_time: recipe.cooking_time,
        servings: recipe.servings,
        difficulty: recipe.difficulty,
        calories: recipe.calories,
        cuisine: recipe.cuisine,
        nutrition: recipe.nutrition,
      };

      const { error: recipeError } = await mongoClient
        .from('recipes')
        .insert(recipeData);

      if (recipeError) {
        console.error('Share error:', recipeError);
        if (recipeError.code === '23505' || recipeError.error?.includes('duplicate')) {
          toast({
            title: "Already Shared",
            description: "You've already shared this recipe to the community",
            variant: "destructive",
          });
          return;
        }
        throw recipeError;
      }

      console.log('Successfully shared to community');
      toast({
        title: "Shared to community",
        description: "Recipe is now available in the community feed",
      });
      
      if (onRecipeUpdate) {
        await onRecipeUpdate();
      }
    } catch (error: any) {
      console.error('Share to community error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to share recipe",
        variant: "destructive",
      });
    } finally {
      setIsSharing(false);
    }
  };

  const handleDelete = async () => {
    if (!user || isDeleting) return;
    
    if (!confirm('Are you sure you want to delete this recipe from your book?')) return;
    
    setIsDeleting(true);
    try {
      console.log('Deleting recipe from book:', recipe.id);
      
      // For recipe book, delete from the book tables, not the recipe itself
      if (isFromRecipeBook) {
        if (recipe.generated_recipe_id) {
          // Delete from generated_recipe_books
          const { error } = await mongoClient
            .from('generated_recipe_books')
            .delete()
            .eq('_id', recipe.id);
          
          if (error) throw error;
        } else {
          // Delete from recipe_books
          const { error } = await mongoClient
            .from('recipe_books')
            .delete()
            .eq('_id', recipe.id);
          
          if (error) throw error;
        }
      } else if (isFromGeneratedRecipes) {
        // Delete the actual generated recipe
        const { error } = await mongoClient
          .from('generated_recipes')
          .delete()
          .eq('_id', recipe.id);
        
        if (error) throw error;
      }
      
      console.log('Recipe deleted successfully');
      toast({
        title: "Recipe removed",
        description: isFromRecipeBook ? "Recipe removed from your book" : "Recipe deleted",
      });
      
      if (onRecipeUpdate) {
        await onRecipeUpdate();
      }
    } catch (error: any) {
      console.error('Delete error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete recipe",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <Card className="h-full hover:shadow-lg transition-shadow">
        {recipe.image_url && (
          <div className="aspect-video overflow-hidden rounded-t-lg">
            <img
              src={recipe.image_url}
              alt={recipe.title}
              className="w-full h-full object-cover"
            />
          </div>
        )}
        <CardHeader className="pb-2">
          <div className="flex justify-between items-start gap-2">
            <h3 className="font-semibold text-lg line-clamp-2">{recipe.title}</h3>
            {recipe.difficulty && (
              <Badge variant="secondary" className="text-xs">
                {recipe.difficulty}
              </Badge>
            )}
          </div>
          {recipe.description && (
            <p className="text-sm text-muted-foreground line-clamp-2 mt-2">
              {recipe.description}
            </p>
          )}
        </CardHeader>
        
        <CardContent className="pt-0">
          <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
            {recipe.cooking_time && (
              <div className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                <span>{recipe.cooking_time} min</span>
              </div>
            )}
            {recipe.servings && (
              <div className="flex items-center gap-1">
                <Users className="w-4 h-4" />
                <span>{recipe.servings}</span>
              </div>
            )}
            {recipe.cuisine && (
              <Badge variant="outline" className="text-xs">
                {recipe.cuisine}
              </Badge>
            )}
          </div>
          
          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-2">
            {!isFromRecipeBook && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleSaveToBook}
                disabled={isSaving}
              >
                <BookOpen className="w-4 h-4 mr-1" />
                {isSaving ? 'Saving...' : 'Save'}
              </Button>
            )}
            
            {showEditDelete && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditModalOpen(true)}
              >
                <Edit className="w-4 h-4 mr-1" />
                Edit
              </Button>
            )}
            
            {showEditDelete && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleDelete}
                disabled={isDeleting}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="w-4 h-4 mr-1" />
                {isDeleting ? 'Deleting...' : 'Delete'}
              </Button>
            )}
            
            {(isFromGeneratedRecipes || recipe.generated_recipe_id) && !isFromRecipeBook && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleShareToCommunity}
                disabled={isSharing}
              >
                <Share2 className="w-4 h-4 mr-1" />
                {isSharing ? 'Sharing...' : 'Share'}
              </Button>
            )}
            
            <Button
              variant="default"
              size="sm"
              onClick={() => onViewRecipe(recipe)}
              className={isFromRecipeBook ? 'col-span-2' : ''}
            >
              <Eye className="w-4 h-4 mr-1" />
              View
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Edit Modal - Now works for all recipe sources */}
      {showEditDelete && (
        <EditRecipeModal
          recipe={recipe}
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          onRecipeUpdate={async () => {
            setIsEditModalOpen(false);
            if (onRecipeUpdate) {
              await onRecipeUpdate();
            }
          }}
          source={getRecipeSource()}
        />
      )}
    </>
  );
};