import { useState, useEffect } from 'react';
import { mongoClient } from '@/lib/mongodb-client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import RecipeModal from '@/components/RecipeModal';
import { Input } from '@/components/ui/input';
import { Search, Sparkles, Clock, Users, Eye, Trash2, BookOpen, Share2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface GeneratedRecipe {
  _id: string;
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
  user_id: string;
  generated_at: string;
}

const GeneratedRecipes = () => {
  const { user } = useAuth();
  const [generatedRecipes, setGeneratedRecipes] = useState<GeneratedRecipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRecipe, setSelectedRecipe] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCuisine, setSelectedCuisine] = useState<string>('');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('');

  const cuisines = ['Italian', 'Asian', 'Mexican', 'Mediterranean', 'Indian', 'American'];
  const difficulties = ['Easy', 'Medium', 'Hard'];

  const fetchGeneratedRecipes = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await mongoClient.from('generated_recipes').select();

      if (error) throw error;

      let processedRecipes = data || [];

      // Apply client-side filtering
      if (searchTerm) {
        processedRecipes = processedRecipes.filter((recipe: any) =>
          recipe.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          recipe.description?.toLowerCase().includes(searchTerm.toLowerCase())
        );
      }

      if (selectedCuisine) {
        processedRecipes = processedRecipes.filter((recipe: any) =>
          recipe.cuisine === selectedCuisine
        );
      }

      if (selectedDifficulty) {
        processedRecipes = processedRecipes.filter((recipe: any) =>
          recipe.difficulty === selectedDifficulty
        );
      }

      setGeneratedRecipes(processedRecipes);
    } catch (error) {
      console.error('Error fetching generated recipes:', error);
      toast({
        title: "Error",
        description: "Failed to load generated recipes",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGeneratedRecipes();
  }, [user, searchTerm, selectedCuisine, selectedDifficulty]);

  const handleViewRecipe = (recipe: GeneratedRecipe) => {
    const modalRecipe = {
      id: recipe._id,
      title: recipe.title,
      description: recipe.description,
      ingredients: recipe.ingredients || [],
      instructions: recipe.instructions || [],
      image: recipe.image_url,
      cookingTime: recipe.cooking_time,
      servings: recipe.servings,
      difficulty: recipe.difficulty,
      calories: recipe.calories,
      cuisine: recipe.cuisine,
      nutrition: recipe.nutrition,
      fromGeneratedRecipes: true,
      generatedRecipeId: recipe._id,
    };
    setSelectedRecipe(modalRecipe);
    setIsModalOpen(true);
  };

  const handleSaveToBook = async (recipe: GeneratedRecipe) => {
    if (!user) return;
    
    try {
      console.log('Saving generated recipe to book:', recipe._id);
      
      const { error } = await mongoClient
        .from('generated_recipe_books')
        .insert({
          generated_recipe_id: recipe._id,
          user_id: user.id,
          added_at: new Date().toISOString(),
        });
      
      if (error) {
        console.error('Insert error:', error);
        if (error.error?.includes('already in book') || error.code === 'duplicate_key' || error.code === '23505') {
          toast({
            title: "Already in Recipe Book",
            description: "This recipe is already in your book",
            variant: "destructive",
          });
          return;
        }
        throw error;
      }
      
      toast({
        title: "Saved to recipe book",
        description: "Recipe added to your collection",
      });
    } catch (error: any) {
      console.error('Save to book error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to save recipe",
        variant: "destructive",
      });
    }
  };

  const handleShareToCommunity = async (recipe: GeneratedRecipe) => {
    if (!user) return;
    
    try {
      console.log('Sharing generated recipe to community:', recipe._id);
      
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

      const { error } = await mongoClient
        .from('recipes')
        .insert(recipeData);

      if (error) {
        console.error('Share error:', error);
        if (error.code === '23505' || error.error?.includes('duplicate')) {
          toast({
            title: "Already Shared",
            description: "You've already shared this recipe to the community",
            variant: "destructive",
          });
          return;
        }
        throw error;
      }

      toast({
        title: "Shared to community",
        description: "Recipe is now available in the community feed",
      });
    } catch (error: any) {
      console.error('Share to community error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to share recipe",
        variant: "destructive",
      });
    }
  };

  const handleDeleteRecipe = async (recipe: GeneratedRecipe) => {
    if (!user) return;
    
    if (!confirm('Are you sure you want to delete this recipe?')) return;
    
    try {
      console.log('Deleting generated recipe:', recipe._id);
      
      const deleteResult = await mongoClient
        .from('generated_recipes')
        .delete();
      
      const { error } = await deleteResult.eq('_id', recipe._id);
      
      if (error) {
        console.error('Delete error:', error);
        throw error;
      }
      
      console.log('Generated recipe deleted successfully');
      
      // Remove from local state
      setGeneratedRecipes(prev => prev.filter(r => r._id !== recipe._id));
      
      toast({
        title: "Recipe deleted",
        description: "Recipe has been removed",
      });
    } catch (error: any) {
      console.error('Delete error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete recipe",
        variant: "destructive",
      });
    }
  };

  const handleCloseModal = () => {
    setSelectedRecipe(null);
    setIsModalOpen(false);
  };

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <h1 className="text-3xl font-bold mb-4">Generated Recipes</h1>
        <p className="text-muted-foreground">Please sign in to view your generated recipes.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="bg-muted h-48 rounded-t-lg"></div>
              <div className="p-4 space-y-2">
                <div className="bg-muted h-4 rounded"></div>
                <div className="bg-muted h-3 rounded w-2/3"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-6 bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
          Your Generated Recipes
        </h1>
        
        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Search generated recipes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <div className="flex gap-2 flex-wrap">
            <Button
              variant={selectedCuisine === '' && selectedDifficulty === '' ? 'default' : 'outline'}
              size="sm"
              onClick={() => {
                setSelectedCuisine('');
                setSelectedDifficulty('');
              }}
            >
              All
            </Button>
            {cuisines.map((cuisine) => (
              <Button
                key={cuisine}
                variant={selectedCuisine === cuisine ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedCuisine(cuisine)}
              >
                {cuisine}
              </Button>
            ))}
            {difficulties.map((difficulty) => (
              <Button
                key={difficulty}
                variant={selectedDifficulty === difficulty ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedDifficulty(difficulty)}
              >
                {difficulty}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {generatedRecipes.length === 0 ? (
        <div className="text-center py-12">
          <Sparkles className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">
            {searchTerm || selectedCuisine || selectedDifficulty 
              ? 'No matching recipes found' 
              : 'No generated recipes yet'
            }
          </h2>
          <p className="text-muted-foreground mb-4">
            {searchTerm || selectedCuisine || selectedDifficulty 
              ? 'Try adjusting your search or filters.'
              : 'Generate your first recipe using AI and it will appear here.'
            }
          </p>
          {!searchTerm && !selectedCuisine && !selectedDifficulty && (
            <Button asChild>
              <a href="/">Generate Recipe</a>
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {generatedRecipes.map((recipe) => (
            <Card key={recipe._id} className="h-full hover:shadow-lg transition-shadow">
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
                  <div className="flex flex-col gap-1">
                    {recipe.difficulty && (
                      <Badge variant="secondary" className="text-xs">
                        {recipe.difficulty}
                      </Badge>
                    )}
                    <Badge variant="outline" className="text-xs bg-primary/10 text-primary">
                      AI Generated
                    </Badge>
                  </div>
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
                
                {/* Action Buttons - NO EDIT BUTTON */}
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleSaveToBook(recipe)}
                  >
                    <BookOpen className="w-4 h-4 mr-1" />
                    Save
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDeleteRecipe(recipe)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="w-4 h-4 mr-1" />
                    Delete
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleShareToCommunity(recipe)}
                  >
                    <Share2 className="w-4 h-4 mr-1" />
                    Share
                  </Button>
                  
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => handleViewRecipe(recipe)}
                  >
                    <Eye className="w-4 h-4 mr-1" />
                    View
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Recipe Modal */}
      <RecipeModal
        recipe={selectedRecipe}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
      />
    </div>
  );
};

export default GeneratedRecipes;