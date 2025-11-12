import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { ChefHat, Sparkles, BookOpen, Clock, Users, Zap } from "lucide-react";
import RecipeGenerator from "@/components/RecipeGenerator";
import RecipeCard, { Recipe } from "@/components/RecipeCard";
import RecipeModal from "@/components/RecipeModal";
import { sampleRecipes } from "@/services/geminiAPI";
import { supabase } from "@/integrations/supabase/client";
import { mongoClient } from "@/lib/mongodb-client";
import { useAuth } from "@/hooks/useAuth";
import heroImage from "@/assets/hero-image.jpg";

const Home = () => {
  const { user } = useAuth();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleRecipeGenerate = async (params: any) => {
    setIsGenerating(true);
    try {
      const { data: functionData, error: functionError } = await supabase.functions.invoke('generate-recipe', {
        body: params
      });

      if (functionError) throw functionError;

      const generatedRecipes = functionData.recipes || [functionData.recipe];
      
      if (user && generatedRecipes.length > 0) {
        const recipesToInsert = generatedRecipes.map((recipe: Recipe) => ({
          title: recipe.title,
          description: recipe.description,
          ingredients: recipe.ingredients,
          instructions: recipe.instructions,
          cooking_time: recipe.cookingTime,
          servings: recipe.servings,
          difficulty: recipe.difficulty,
          cuisine: recipe.cuisine,
          calories: recipe.calories,
        }));

        for (const recipe of recipesToInsert) {
          await mongoClient.from('generated_recipes').insert(recipe);
        }
      }
      
      setRecipes(prev => [...generatedRecipes, ...prev]);
      toast.success(
        generatedRecipes.length > 1 
          ? `${generatedRecipes.length} recipes generated and saved!` 
          : "Recipe generated and saved!"
      );
    } catch (error) {
      console.error("Recipe generation failed:", error);
      toast.error("Failed to generate recipe. Please try again.");
      const sampleRecipe = { ...sampleRecipes[0], id: Date.now().toString() };
      setRecipes(prev => [sampleRecipe, ...prev]);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleViewRecipe = (recipe: Recipe) => {
    setSelectedRecipe(recipe);
  };

  const handleSaveToBook = () => {
    // This will trigger a re-fetch if needed
  };

  const loadSampleRecipe = () => {
    const sample = { ...sampleRecipes[0], id: Date.now().toString() };
    setRecipes(prev => [sample, ...prev]);
    toast.success("Sample recipe loaded!");
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-90"
          style={{ backgroundImage: `url(${heroImage})` }}
        />
        <div className="absolute inset-0 bg-black/60" />
        
        <div className="relative container mx-auto px-4 py-24">
          <div className="text-center text-white max-w-4xl mx-auto">
            <div className="flex justify-center mb-6">
              <div className="p-4 rounded-full bg-white/20 backdrop-blur-sm">
                <ChefHat className="h-16 w-16" />
              </div>
            </div>
            
            <h1 className="text-6xl md:text-8xl font-black mb-6 leading-tight animate-fade-in">
              Find-Out
              <span className="block bg-gradient-to-r from-white via-primary-glow to-accent bg-clip-text text-transparent animate-pulse" style={{ animationDuration: '3s' }}>
                Recipe
              </span>
            </h1>
            
            <p className="text-xl md:text-3xl mb-8 text-white/95 leading-relaxed font-medium">
              Transform your ingredients into <span className="text-accent font-bold">multiple amazing dishes</span> with AI-powered recipe generation
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Button 
                size="lg"
                className="bg-white text-primary hover:bg-white/90 hover:scale-110 shadow-glow hover:shadow-hover transition-all duration-500 px-8 py-6 text-lg font-bold"
                onClick={() => window.location.href = '/feed'}
              >
                <Sparkles className="mr-2 h-6 w-6 animate-pulse" />
                Discover Restaurants
              </Button>
              <Button 
                size="lg"
                variant="outline"
                className="border-2 border-white text-white bg-black/30 hover:bg-white/20 backdrop-blur-sm hover:scale-110 transition-all duration-500 px-8 py-6 text-lg font-bold shadow-xl"
                onClick={loadSampleRecipe}
              >
                <BookOpen className="mr-2 h-6 w-6" />
                Try Sample Recipe
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Recipe Generator Section */}
      <section id="recipe-generator" className="py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold mb-6 text-foreground">
                AI Recipe Generator
              </h2>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                Enter your ingredients and let our AI create delicious recipes tailored to what you have available
              </p>
            </div>
            
            <RecipeGenerator 
              onRecipeGenerate={handleRecipeGenerate}
              isLoading={isGenerating}
            />
          </div>
        </div>
      </section>

      {/* Generated Recipes Section */}
      {recipes.length > 0 && (
        <section className="py-20 bg-muted/10">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold mb-6 text-foreground">Your Recipes</h2>
              <div className="flex items-center justify-center gap-4 text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  <span>{recipes.length} {recipes.length === 1 ? 'recipe' : 'recipes'}</span>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl mx-auto">
              {recipes.map((recipe) => (
                <RecipeCard 
                  key={recipe.id}
                  recipe={recipe}
                  onViewDetails={handleViewRecipe}
                />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Features Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-6 text-foreground">Why Choose Us</h2>
            <p className="text-xl text-muted-foreground">
              Everything you need to create amazing meals
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            <Card className="p-8 text-center border hover:shadow-md transition-all duration-300 group">
              <div className="p-3 rounded-full bg-primary/10 w-fit mx-auto mb-6 group-hover:scale-110 transition-transform duration-300">
                <Zap className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-4 text-foreground">AI Powered</h3>
              <p className="text-muted-foreground">
                Generate multiple personalized recipes instantly using advanced AI technology
              </p>
            </Card>
            
            <Card className="p-8 text-center border hover:shadow-md transition-all duration-300 group">
              <div className="p-3 rounded-full bg-secondary/10 w-fit mx-auto mb-6 group-hover:scale-110 transition-transform duration-300">
                <Clock className="h-8 w-8 text-secondary" />
              </div>
              <h3 className="text-xl font-semibold mb-4 text-foreground">Save Time</h3>
              <p className="text-muted-foreground">
                Quick recipe generation based on ingredients you already have in your kitchen
              </p>
            </Card>
            
            <Card className="p-8 text-center border hover:shadow-md transition-all duration-300 group">
              <div className="p-3 rounded-full bg-accent/10 w-fit mx-auto mb-6 group-hover:scale-110 transition-transform duration-300">
                <ChefHat className="h-8 w-8 text-accent" />
              </div>
              <h3 className="text-xl font-semibold mb-4 text-foreground">Expert Quality</h3>
              <p className="text-muted-foreground">
                Professional-level recipes with detailed instructions and nutrition information
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-muted/20">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-6 text-foreground">
            Ready to Transform Your Cooking?
          </h2>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Start generating amazing recipes with the ingredients you have today
          </p>
          <Button 
            size="lg"
            className="bg-primary text-primary-foreground hover:bg-primary/90 px-8 py-6 text-lg"
            onClick={() => document.getElementById('recipe-generator')?.scrollIntoView({ behavior: 'smooth' })}
          >
            <Sparkles className="mr-2 h-6 w-6" />
            Generate Recipes Now
          </Button>
        </div>
      </section>

      {/* Recipe Modal */}
      <RecipeModal
        recipe={selectedRecipe}
        isOpen={!!selectedRecipe}
        onClose={() => setSelectedRecipe(null)}
        onSaveToBook={handleSaveToBook}
      />
    </div>
  );
};

export default Home;
