import { useState, useEffect } from 'react';
import { mongoClient } from '@/lib/mongodb-client';
import { CommunityRecipeCard, CommunityRecipe } from '@/components/CommunityRecipeCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, Filter } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import RecipeModal from '@/components/RecipeModal';

const Feed = () => {
  const { user } = useAuth();
  const [recipes, setRecipes] = useState<CommunityRecipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCuisine, setSelectedCuisine] = useState<string>('');
  const [selectedRecipe, setSelectedRecipe] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('');

  const cuisines = ['Italian', 'Asian', 'Mexican', 'Mediterranean', 'Indian', 'American'];
  const difficulties = ['Easy', 'Medium', 'Hard'];

  const fetchRecipes = async () => {
    try {
      const { data, error } = await mongoClient.from('recipes').select();
      
      if (error) throw error;

      let processedRecipes = data.map((recipe: any) => ({
        ...recipe,
        id: recipe._id,
        author_id: recipe.author_id,
        profiles: recipe.author_id,
        likes_count: 0,
        dislikes_count: 0,
        user_like: false,
        user_dislike: false,
        is_saved: false,
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

      setRecipes(processedRecipes);
    } catch (error) {
      console.error('Error fetching recipes:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecipes();
  }, [searchTerm, selectedCuisine, selectedDifficulty, user]);

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
      fromDb: true,
      dbRecipeId: recipe.id,
    };
    setSelectedRecipe(modalRecipe);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setSelectedRecipe(null);
    setIsModalOpen(false);
  };

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
          Recipe Community
        </h1>
        
        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Search recipes..."
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

      {/* Recipes Grid */}
      {recipes.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No recipes found. Be the first to share a recipe!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {recipes.map((recipe) => (
            <CommunityRecipeCard
              key={recipe.id}
              recipe={recipe}
              onViewRecipe={handleViewRecipe}
              onLikeUpdate={fetchRecipes}
              onRecipeUpdate={fetchRecipes}
            />
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

export default Feed;