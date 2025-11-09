import { useState, useEffect } from 'react';
import { mongoClient } from '@/lib/mongodb-client';
import { useAuth } from '@/hooks/useAuth';
import { CommunityRecipeCard, CommunityRecipe } from '@/components/CommunityRecipeCard';
import RecipeModal from '@/components/RecipeModal';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, BookOpen, Trash2, Download } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import jsPDF from 'jspdf';

const RecipeBook = () => {
  const { user } = useAuth();
  const [savedRecipes, setSavedRecipes] = useState<CommunityRecipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRecipe, setSelectedRecipe] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCuisine, setSelectedCuisine] = useState<string>('');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('');

  const cuisines = ['Italian', 'Asian', 'Mexican', 'Mediterranean', 'Indian', 'American'];
  const difficulties = ['Easy', 'Medium', 'Hard'];

  const fetchSavedRecipes = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await mongoClient.from('recipe_books').select();

      if (error) throw error;

      // Transform data to match CommunityRecipe interface
      let processedRecipes = data.map((item: any) => ({
        ...item.recipe_id,
        id: item.recipe_id?._id,
        likes_count: 0,
        dislikes_count: 0,
        user_like: false,
        user_dislike: false,
        is_saved: true,
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

      setSavedRecipes(processedRecipes);
    } catch (error) {
      console.error('Error fetching saved recipes:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSavedRecipes();
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
      fromDb: true,
      dbRecipeId: recipe.id,
    };
    setSelectedRecipe(modalRecipe);
    setIsModalOpen(true);
  };

  const handleRemoveFromBook = async (recipeId: string) => {
    if (!user) return;
    
    try {
      const { error } = await mongoClient
        .from('recipe_books')
        .delete()
        .eq('recipe_id', recipeId);

      if (error) throw error;

      setSavedRecipes(prev => prev.filter(recipe => recipe.id !== recipeId));
      toast({
        title: "Recipe removed",
        description: "Recipe removed from your book",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to remove recipe",
        variant: "destructive",
      });
    }
  };

  const handleCloseModal = () => {
    setSelectedRecipe(null);
    setIsModalOpen(false);
  };

  const handleDownloadPDF = async () => {
    if (savedRecipes.length === 0) {
      toast({
        title: "No recipes",
        description: "Add some recipes to your book first",
        variant: "destructive",
      });
      return;
    }

    try {
      const pdf = new jsPDF();
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 20;
      let yPosition = margin;

      // Title
      pdf.setFontSize(24);
      pdf.setFont('helvetica', 'bold');
      pdf.text('My Recipe Book', pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 15;

      // Add each recipe
      savedRecipes.forEach((recipe, index) => {
        // Check if we need a new page
        if (yPosition > pageHeight - 40) {
          pdf.addPage();
          yPosition = margin;
        }

        // Recipe title
        pdf.setFontSize(16);
        pdf.setFont('helvetica', 'bold');
        pdf.text(`${index + 1}. ${recipe.title}`, margin, yPosition);
        yPosition += 8;

        // Recipe details
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'normal');
        
        if (recipe.description) {
          const descLines = pdf.splitTextToSize(recipe.description, pageWidth - 2 * margin);
          pdf.text(descLines, margin, yPosition);
          yPosition += descLines.length * 5 + 3;
        }

        if (recipe.cooking_time || recipe.servings || recipe.difficulty) {
          const details = [];
          if (recipe.cooking_time) details.push(`Time: ${recipe.cooking_time} min`);
          if (recipe.servings) details.push(`Servings: ${recipe.servings}`);
          if (recipe.difficulty) details.push(`Difficulty: ${recipe.difficulty}`);
          pdf.text(details.join(' | '), margin, yPosition);
          yPosition += 7;
        }

        // Ingredients
        if (recipe.ingredients && recipe.ingredients.length > 0) {
          pdf.setFont('helvetica', 'bold');
          pdf.text('Ingredients:', margin, yPosition);
          yPosition += 5;
          pdf.setFont('helvetica', 'normal');
          
          recipe.ingredients.forEach((ing: any) => {
            if (yPosition > pageHeight - 20) {
              pdf.addPage();
              yPosition = margin;
            }
            const ingText = typeof ing === 'string' ? ing : `${ing.name || ''} ${ing.amount || ''} ${ing.unit || ''}`;
            pdf.text(`• ${ingText}`, margin + 5, yPosition);
            yPosition += 5;
          });
          yPosition += 3;
        }

        // Instructions
        if (recipe.instructions && recipe.instructions.length > 0) {
          pdf.setFont('helvetica', 'bold');
          pdf.text('Instructions:', margin, yPosition);
          yPosition += 5;
          pdf.setFont('helvetica', 'normal');
          
          recipe.instructions.forEach((inst: any, idx: number) => {
            if (yPosition > pageHeight - 20) {
              pdf.addPage();
              yPosition = margin;
            }
            const instText = typeof inst === 'string' ? inst : inst.step || inst.instruction || '';
            const lines = pdf.splitTextToSize(`${idx + 1}. ${instText}`, pageWidth - 2 * margin - 10);
            pdf.text(lines, margin + 5, yPosition);
            yPosition += lines.length * 5 + 2;
          });
        }

        yPosition += 10; // Space between recipes
      });

      // Save PDF
      pdf.save('my-recipe-book.pdf');
      
      toast({
        title: "Success",
        description: "Recipe book downloaded successfully",
      });
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast({
        title: "Error",
        description: "Failed to generate PDF",
        variant: "destructive",
      });
    }
  };

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <h1 className="text-3xl font-bold mb-4">Recipe Book</h1>
        <p className="text-muted-foreground">Please sign in to view your saved recipes.</p>
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
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
            Your Recipe Book
          </h1>
          {savedRecipes.length > 0 && (
            <Button onClick={handleDownloadPDF} variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Download PDF
            </Button>
          )}
        </div>
        
        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Search saved recipes..."
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

      {savedRecipes.length === 0 ? (
        <div className="text-center py-12">
          <BookOpen className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">
            {searchTerm || selectedCuisine || selectedDifficulty 
              ? 'No matching recipes found' 
              : 'Your recipe book is empty'
            }
          </h2>
          <p className="text-muted-foreground mb-4">
            {searchTerm || selectedCuisine || selectedDifficulty 
              ? 'Try adjusting your search or filters.'
              : 'Save recipes from the community feed to access them offline later.'
            }
          </p>
          {!searchTerm && !selectedCuisine && !selectedDifficulty && (
            <Button asChild>
              <a href="/feed">Browse Community Recipes</a>
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {savedRecipes.map((recipe) => (
            <div key={recipe.id} className="relative group">
              <CommunityRecipeCard
                recipe={recipe}
                onViewRecipe={handleViewRecipe}
                onRecipeUpdate={fetchSavedRecipes}
              />
              <Button
                variant="destructive"
                size="sm"
                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => handleRemoveFromBook(recipe.id)}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
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

export default RecipeBook;