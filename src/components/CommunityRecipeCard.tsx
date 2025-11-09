import { useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Heart, Clock, Users, BookOpen, Eye, Edit, Trash2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { mongoClient } from '@/lib/mongodb-client';
import { toast } from '@/hooks/use-toast';
import EditRecipeModal from './EditRecipeModal';
import { RecipeComments } from './RecipeComments';

export interface CommunityRecipe {
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
  author_id: string;
  created_at: string;
  profiles?: {
    full_name: string;
  };
  recipe_likes?: {
    is_like: boolean;
  }[];
  likes_count: number;
  dislikes_count: number;
  user_like?: boolean;
  user_dislike?: boolean;
  is_saved?: boolean;
}

interface CommunityRecipeCardProps {
  recipe: CommunityRecipe;
  onViewRecipe: (recipe: CommunityRecipe) => void;
  onLikeUpdate?: () => void;
  onRecipeUpdate?: () => void;
}

export const CommunityRecipeCard = ({ recipe, onViewRecipe, onLikeUpdate, onRecipeUpdate }: CommunityRecipeCardProps) => {
  const { user } = useAuth();
  const [isLiking, setIsLiking] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [localLikes, setLocalLikes] = useState(recipe.likes_count);
  const [localDislikes, setLocalDislikes] = useState(recipe.dislikes_count);
  const [userLike, setUserLike] = useState(recipe.user_like);
  const [userDislike, setUserDislike] = useState(recipe.user_dislike);
  const [isSaved, setIsSaved] = useState(recipe.is_saved);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [showComments, setShowComments] = useState(false);

  const handleLike = async (isLike: boolean) => {
    if (!user || isLiking) return;
    
    setIsLiking(true);
    try {
      const { data, error } = await mongoClient
        .from('recipe_likes')
        .insert({ recipe_id: recipe.id, is_like: isLike });

      if (error) throw error;

      if (isLike) {
        setLocalLikes(prev => prev + 1);
        setUserLike(true);
        setUserDislike(false);
      } else {
        setLocalDislikes(prev => prev + 1);
        setUserDislike(true);
        setUserLike(false);
      }
      
      onLikeUpdate?.();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update like status",
        variant: "destructive",
      });
    } finally {
      setIsLiking(false);
    }
  };

  const handleSaveToBook = async () => {
    if (!user || isSaving) return;
    
    setIsSaving(true);
    try {
      if (isSaved) {
        // Remove from recipe book
        await mongoClient
          .from('recipe_books')
          .delete()
          .eq('recipe_id', recipe.id);
        
        setIsSaved(false);
        toast({
          title: "Removed from recipe book",
          description: "Recipe removed from your collection",
        });
      } else {
        // Add to recipe book
        const { error: insertError } = await mongoClient
          .from('recipe_books')
          .insert({ recipe_id: recipe.id });
        
        if (insertError) {
          if (insertError.code === '23505') {
            toast({
              title: "Already saved",
              description: "This recipe is already in your book",
              variant: "destructive",
            });
            setIsSaved(true);
            return;
          }
          throw insertError;
        }
        
        setIsSaved(true);
        toast({
          title: "Saved to recipe book",
          description: "Recipe added to your collection",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save recipe",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteRecipe = async () => {
    if (!user || isDeleting || user.id !== recipe.author_id) return;
    
    if (!confirm('Are you sure you want to delete this recipe?')) return;
    
    setIsDeleting(true);
    try {
      const { error } = await mongoClient
        .from('recipes')
        .delete()
        .eq('_id', recipe.id);
      
      if (error) throw error;
      
      toast({
        title: "Recipe deleted",
        description: "Your recipe has been removed from the community",
      });
      
      onRecipeUpdate?.();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete recipe",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const isOwner = user && user.id === recipe.author_id;

  return (
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
        <p className="text-sm text-muted-foreground">
          by {recipe.profiles?.full_name || (user?.id === recipe.author_id ? 'You' : 'Community Chef')}
        </p>
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
        </div>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleLike(true)}
              disabled={isLiking}
              className={userLike ? 'text-red-500 hover:text-red-600' : ''}
            >
              <Heart className={`w-4 h-4 ${userLike ? 'fill-current' : ''}`} />
              <span className="ml-1">{localLikes}</span>
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleLike(false)}
              disabled={isLiking}
              className={userDislike ? 'text-red-500 hover:text-red-600' : ''}
            >
              <Heart className={`w-4 h-4 rotate-180 ${userDislike ? 'fill-current' : ''}`} />
              <span className="ml-1">{localDislikes}</span>
            </Button>
          </div>
          
          <div className="flex items-center gap-2">
            {user && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSaveToBook}
                disabled={isSaving}
                className={isSaved ? 'text-primary' : ''}
              >
                <BookOpen className={`w-4 h-4 ${isSaved ? 'fill-current' : ''}`} />
              </Button>
            )}
            
            {isOwner && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsEditModalOpen(true)}
                  className="text-primary hover:text-primary"
                >
                  <Edit className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDeleteRecipe}
                  disabled={isDeleting}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </>
            )}
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowComments(!showComments)}
              title="Comments"
            >
              💬
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onViewRecipe(recipe)}
            >
              <Eye className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardContent>

      {showComments && (
        <CardContent className="pt-0 border-t">
          <RecipeComments recipeId={recipe.id} />
        </CardContent>
      )}

      {/* Edit Modal */}
      <EditRecipeModal
        recipe={recipe}
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onRecipeUpdate={() => {
          setIsEditModalOpen(false);
          onRecipeUpdate?.();
        }}
      />
    </Card>
  );
};