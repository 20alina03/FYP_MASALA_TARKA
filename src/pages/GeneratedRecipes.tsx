import { useState, useEffect } from 'react';
import { mongoClient } from '@/lib/mongodb-client';
import { useAuth } from '@/hooks/useAuth';
import { CommunityRecipeCard, CommunityRecipe } from '@/components/CommunityRecipeCard';
import RecipeModal from '@/components/RecipeModal';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Sparkles, Trash2, BookOpen, Share2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

const GeneratedRecipes = () => {
  const { user } = useAuth();
  const [generatedRecipes, setGeneratedRecipes] = useState<CommunityRecipe[]>([]);
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

      // Transform data to match CommunityRecipe interface
      let processedRecipes = data.map((recipe: any) => ({
        ...recipe,
        id: recipe._id,
        likes_count: 0,
        dislikes_count: 0,
        user_like: false,
        user_dislike: false,
        is_saved: false,
        created_at: recipe.generated_at,
        author_id: recipe.user_id,
      }));

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
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGeneratedRecipes();
  }, [user, searchTerm, selectedCuisine, selectedDifficulty]);

  const handleViewRecipe = (recipe: CommunityRecipe) => {
    // Convert community recipe format to modal format
    const modalRecipe = {
      id: recipe.id,
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
      fromGeneratedRecipes: true,
      generatedRecipeId: recipe.id,
    };
    setSelectedRecipe(modalRecipe);
    setIsModalOpen(true);
  };

  const handleAddToRecipeBook = async (recipeId: string) => {
    if (!user) return;
    
    try {
      // Get the generated recipe
      const generatedRecipes = await mongoClient.from('generated_recipes').select();
      const generatedRecipe = generatedRecipes.data?.find((r: any) => r._id === recipeId);
      
      if (!generatedRecipe) throw new Error('Recipe not found');

      // Add to recipes table (community) and recipe_books
      const recipeData = {
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
      };

      const { data: insertedRecipe, error: recipeError } = await mongoClient
        .from('recipes')
        .insert(recipeData);

      if (recipeError) {
        if (recipeError.code === '23505') {
          toast({
            title: "Already Shared",
            description: "This recipe is already shared to the community",
            variant: "destructive",
          });
        } else {
          throw recipeError;
        }
        return;
      }

      // Add to recipe books
      const { error: bookError } = await mongoClient
        .from('recipe_books')
        .insert({ recipe_id: insertedRecipe._id });

      if (bookError && bookError.code === '23505') {
        toast({
          title: "Already in Recipe Book",
          description: "This recipe is already in your recipe book",
          variant: "destructive",
        });
        return;
      }
      if (bookError) throw bookError;

      toast({
        title: "Success",
        description: "Recipe added to your recipe book",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to add recipe to book",
        variant: "destructive",
      });
    }
  };

  const handleShareToCommunity = async (recipeId: string) => {
    if (!user) return;
    
    try {
      // Get the generated recipe
      const generatedRecipes = await mongoClient.from('generated_recipes').select();
      const generatedRecipe = generatedRecipes.data?.find((r: any) => r._id === recipeId);
      
      if (!generatedRecipe) throw new Error('Recipe not found');

      // Add to recipes table (community)
      const recipeData = {
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
      };

      const { error: recipeError } = await mongoClient
        .from('recipes')
        .insert(recipeData);

      if (recipeError) {
        if (recipeError.code === '23505') {
          toast({
            title: "Already Shared",
            description: "You've already shared this recipe to the community",
            variant: "destructive",
          });
          return;
        }
        throw recipeError;
      }

      toast({
        title: "Success",
        description: "Recipe shared to community",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to share recipe",
        variant: "destructive",
      });
    }
  };

  const handleDeleteGenerated = async (recipeId: string) => {
    if (!user) return;
    
    try {
      const { error } = await mongoClient
        .from('generated_recipes')
        .delete()
        .eq('_id', recipeId);

      if (error) throw error;

      setGeneratedRecipes(prev => prev.filter(recipe => recipe.id !== recipeId));
      toast({
        title: "Recipe deleted",
        description: "Generated recipe deleted successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete recipe",
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
            <div key={recipe.id} className="relative group">
              <CommunityRecipeCard
                recipe={recipe}
                onViewRecipe={handleViewRecipe}
                onRecipeUpdate={fetchGeneratedRecipes}
              />
              
              {/* Action buttons */}
              <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  variant="secondary"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => handleAddToRecipeBook(recipe.id)}
                  title="Add to Recipe Book"
                >
                  <BookOpen className="w-4 h-4" />
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => handleShareToCommunity(recipe.id)}
                  title="Share to Community"
                >
                  <Share2 className="w-4 h-4" />
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => handleDeleteGenerated(recipe.id)}
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
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