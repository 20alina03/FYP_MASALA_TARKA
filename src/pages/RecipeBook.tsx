import { useState, useEffect } from 'react';
import { mongoClient } from '@/lib/mongodb-client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import RecipeModal from '@/components/RecipeModal';
import EditRecipeModal from '@/components/EditRecipeModal';
import { Input } from '@/components/ui/input';
import { Search, BookOpen, Download, Clock, Users, Eye, Edit, Trash2, Share2, AlertCircle } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import jsPDF from 'jspdf';

interface RecipeBookEntry {
  _id: string;
  recipe_id?: any;
  generated_recipe_id?: any;
  user_id: string;
  added_at: string;
}

interface RecipeBookRecipe {
  id: string;
  bookEntryId: string;
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
  created_at?: string;
  isEmpty?: boolean;
  isGenerated?: boolean;
  originalRecipeId?: string; // Add this to track the actual recipe ID
}

const RecipeBook = () => {
  const { user } = useAuth();
  const [savedRecipes, setSavedRecipes] = useState<RecipeBookRecipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRecipe, setSelectedRecipe] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState<any>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCuisine, setSelectedCuisine] = useState<string>('');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('');

  const cuisines = ['Italian', 'Asian', 'Mexican', 'Mediterranean', 'Indian', 'American'];
  const difficulties = ['Easy', 'Medium', 'Hard'];

  const fetchSavedRecipes = async () => {
    if (!user) return;
    
    try {
      console.log('Fetching saved recipes for user:', user.id);
      
      // Fetch from both recipe_books and generated_recipe_books
      const [communityBooks, generatedBooks] = await Promise.all([
        mongoClient.from('recipe_books').select(),
        mongoClient.from('generated_recipe_books').select()
      ]);

      console.log('Community books:', communityBooks.data?.length);
      console.log('Generated books:', generatedBooks.data?.length);

      let allRecipes: RecipeBookRecipe[] = [];

      // Process community recipes
      if (communityBooks.data) {
        const communityRecipes = communityBooks.data.map((item: RecipeBookEntry) => {
          const isEmptyRecipe = !item.recipe_id || Object.keys(item.recipe_id).length === 0;
          
          if (isEmptyRecipe) {
            return {
              id: item._id,
              bookEntryId: item._id,
              title: 'Empty Recipe Card',
              description: 'This recipe no longer exists or was not properly saved.',
              isEmpty: true,
              isGenerated: false,
            };
          }

          // Log nutrition data for debugging
          console.log(`Community recipe ${item.recipe_id?.title} nutrition:`, item.recipe_id?.nutrition);

          return {
            ...item.recipe_id,
            id: item.recipe_id?._id || item._id,
            bookEntryId: item._id,
            originalRecipeId: item.recipe_id?._id, // Store the actual recipe ID
            author_id: item.recipe_id?.author_id,
            nutrition: item.recipe_id?.nutrition || null,
            isEmpty: false,
            isGenerated: false,
          };
        });
        allRecipes = [...allRecipes, ...communityRecipes];
      }

      // Process generated recipes
      if (generatedBooks.data) {
        const generatedRecipes = generatedBooks.data.map((item: RecipeBookEntry) => {
          const isEmptyRecipe = !item.generated_recipe_id || Object.keys(item.generated_recipe_id).length === 0;
          
          if (isEmptyRecipe) {
            return {
              id: item._id,
              bookEntryId: item._id,
              title: 'Empty Recipe Card',
              description: 'This recipe no longer exists or was not properly saved.',
              isEmpty: true,
              isGenerated: true,
            };
          }

          // Log nutrition data for debugging
          console.log(`Generated recipe ${item.generated_recipe_id?.title} nutrition:`, item.generated_recipe_id?.nutrition);

          return {
            ...item.generated_recipe_id,
            id: item.generated_recipe_id?._id || item._id,
            bookEntryId: item._id,
            originalRecipeId: item.generated_recipe_id?._id, // Store the actual recipe ID
            author_id: item.generated_recipe_id?.user_id,
            user_id: item.generated_recipe_id?.user_id,
            nutrition: item.generated_recipe_id?.nutrition || null,
            isEmpty: false,
            isGenerated: true,
          };
        });
        allRecipes = [...allRecipes, ...generatedRecipes];
      }

      console.log('Total recipes before filtering:', allRecipes.length);
      console.log('Recipes with nutrition:', allRecipes.filter(r => !r.isEmpty && r.nutrition).length);

      // Apply client-side filtering
      if (searchTerm) {
        allRecipes = allRecipes.filter((recipe: any) =>
          !recipe.isEmpty && (
            recipe.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            recipe.description?.toLowerCase().includes(searchTerm.toLowerCase())
          )
        );
      }

      if (selectedCuisine) {
        allRecipes = allRecipes.filter((recipe: any) =>
          !recipe.isEmpty && recipe.cuisine === selectedCuisine
        );
      }

      if (selectedDifficulty) {
        allRecipes = allRecipes.filter((recipe: any) =>
          !recipe.isEmpty && recipe.difficulty === selectedDifficulty
        );
      }

      console.log('Total recipes after filtering:', allRecipes.length);
      setSavedRecipes(allRecipes);
    } catch (error) {
      console.error('Error fetching saved recipes:', error);
      toast({
        title: "Error",
        description: "Failed to load saved recipes",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSavedRecipes();
  }, [user, searchTerm, selectedCuisine, selectedDifficulty]);

  const handleViewRecipe = (recipe: RecipeBookRecipe) => {
    if (recipe.isEmpty) {
      toast({
        title: "Cannot view recipe",
        description: "This recipe is empty or no longer exists",
        variant: "destructive",
      });
      return;
    }

    console.log('Opening modal with recipe nutrition:', recipe.nutrition);

    const modalRecipe = {
      id: recipe.originalRecipeId || recipe.id,
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
      fromDb: !recipe.isGenerated,
      fromGeneratedRecipes: recipe.isGenerated,
      dbRecipeId: recipe.originalRecipeId || recipe.id,
      generatedRecipeId: recipe.isGenerated ? (recipe.originalRecipeId || recipe.id) : undefined,
    };
    
    console.log('Modal recipe object:', modalRecipe);
    setSelectedRecipe(modalRecipe);
    setIsModalOpen(true);
  };

  const handleEditRecipe = (recipe: RecipeBookRecipe) => {
    if (recipe.isEmpty) {
      toast({
        title: "Cannot edit recipe",
        description: "This recipe is empty or no longer exists",
        variant: "destructive",
      });
      return;
    }

    console.log('Editing recipe:', {
      id: recipe.originalRecipeId || recipe.id,
      bookEntryId: recipe.bookEntryId,
      isGenerated: recipe.isGenerated,
      title: recipe.title
    });

    // Create a proper recipe object for editing with the ORIGINAL recipe ID
    const recipeToEdit = {
      ...recipe,
      id: recipe.originalRecipeId || recipe.id, // Use the actual recipe ID, not the book entry ID
    };

    setEditingRecipe(recipeToEdit);
    setIsEditModalOpen(true);
  };

  const handleShareToCommunity = async (recipe: RecipeBookRecipe) => {
    if (!user) return;

    if (recipe.isEmpty) {
      toast({
        title: "Cannot share recipe",
        description: "This recipe is empty or no longer exists",
        variant: "destructive",
      });
      return;
    }
    
    try {
      console.log('Sharing to community:', recipe.originalRecipeId || recipe.id);
      
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
        if (recipeError.code === '23505' || recipeError.error?.includes('duplicate')) {
          toast({
            title: "Already Shared",
            description: "This recipe is already shared to the community",
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
      console.error('Share error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to share recipe",
        variant: "destructive",
      });
    }
  };

  const handleDeleteRecipe = async (recipe: RecipeBookRecipe) => {
    if (!user) return;
    
    const confirmMessage = recipe.isEmpty 
      ? 'Are you sure you want to remove this empty card from your book?'
      : 'Are you sure you want to remove this recipe from your book?';
    
    if (!confirm(confirmMessage)) return;

    try {
      console.log('Deleting recipe from book:', {
        bookEntryId: recipe.bookEntryId,
        recipeId: recipe.originalRecipeId || recipe.id,
        isEmpty: recipe.isEmpty,
        isGenerated: recipe.isGenerated
      });
      
      // Use the appropriate table based on recipe type
      const tableName = recipe.isGenerated ? 'generated_recipe_books' : 'recipe_books';
      
      const deleteResult = await mongoClient
        .from(tableName)
        .delete();
      
      const { error } = await deleteResult.eq('_id', recipe.bookEntryId);

      if (error) {
        console.error('Delete error:', error);
        throw error;
      }

      console.log('Successfully deleted from recipe book');
      
      // Remove from local state
      setSavedRecipes(prev => prev.filter(r => r.bookEntryId !== recipe.bookEntryId));
      
      toast({
        title: "Recipe removed",
        description: recipe.isEmpty 
          ? "Empty card removed from your book" 
          : "Recipe removed from your book",
      });
    } catch (error: any) {
      console.error('Delete error details:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to remove recipe",
        variant: "destructive",
      });
    }
  };

  const handleCloseModal = () => {
    setSelectedRecipe(null);
    setIsModalOpen(false);
  };

  const handleDownloadPDF = async () => {
    // Filter out empty recipes for PDF generation
    const validRecipes = savedRecipes.filter(r => !r.isEmpty);
    
    if (validRecipes.length === 0) {
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
      validRecipes.forEach((recipe, index) => {
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
          if (recipe.calories) details.push(`Calories: ${recipe.calories}`);
          pdf.text(details.join(' | '), margin, yPosition);
          yPosition += 7;
        }

        // Nutrition info (if available)
        if (recipe.nutrition) {
          pdf.setFont('helvetica', 'bold');
          pdf.text('Nutrition per serving:', margin, yPosition);
          yPosition += 5;
          pdf.setFont('helvetica', 'normal');
          const nutritionInfo = [
            `Protein: ${recipe.nutrition.protein}`,
            `Carbs: ${recipe.nutrition.carbs}`,
            `Fat: ${recipe.nutrition.fat}`,
            `Fiber: ${recipe.nutrition.fiber}`
          ].join(' | ');
          pdf.text(nutritionInfo, margin + 5, yPosition);
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
          {savedRecipes.filter(r => !r.isEmpty).length > 0 && (
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
              : 'Save recipes from the community feed or generated recipes to access them here.'
            }
          </p>
          {!searchTerm && !selectedCuisine && !selectedDifficulty && (
            <div className="flex gap-4 justify-center">
              <Button asChild>
                <a href="/feed">Browse Community Recipes</a>
              </Button>
              <Button asChild variant="outline">
                <a href="/generated-recipes">View Generated Recipes</a>
              </Button>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {savedRecipes.map((recipe) => (
            <Card 
              key={recipe.bookEntryId} 
              className={`h-full hover:shadow-lg transition-shadow ${recipe.isEmpty ? 'border-destructive/50 bg-destructive/5' : ''}`}
            >
              {recipe.isEmpty ? (
                // Empty Recipe Card
                <div className="p-6">
                  <div className="flex items-center justify-center mb-4">
                    <AlertCircle className="w-16 h-16 text-destructive/50" />
                  </div>
                  <CardHeader className="pb-2 text-center">
                    <h3 className="font-semibold text-lg text-destructive">
                      {recipe.title}
                    </h3>
                    <p className="text-sm text-muted-foreground mt-2">
                      {recipe.description}
                    </p>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDeleteRecipe(recipe)}
                      className="w-full"
                    >
                      <Trash2 className="w-4 h-4 mr-1" />
                      Remove Empty Card
                    </Button>
                  </CardContent>
                </div>
              ) : (
                // Normal Recipe Card
                <>
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
                        {recipe.isGenerated && (
                          <Badge variant="outline" className="text-xs bg-primary/10 text-primary">
                            Generated
                          </Badge>
                        )}
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
                    
                    {/* Action Buttons - Always Visible */}
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditRecipe(recipe)}
                      >
                        <Edit className="w-4 h-4 mr-1" />
                        Edit
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
                </>
              )}
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

      {/* Edit Modal - FIXED WITH SOURCE DETECTION */}
      {editingRecipe && !editingRecipe.isEmpty && (
        <EditRecipeModal
          recipe={editingRecipe}
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            setEditingRecipe(null);
          }}
          onRecipeUpdate={async () => {
            setIsEditModalOpen(false);
            setEditingRecipe(null);
            await fetchSavedRecipes();
          }}
          source={editingRecipe.isGenerated ? 'generated' : 'community'}
        />
      )}
    </div>
  );
};

export default RecipeBook;