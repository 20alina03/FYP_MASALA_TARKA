import { Recipe } from "@/components/RecipeCard";

interface RecipeParams {
  ingredients: string[];
  cuisine: string;
  maxCalories?: number;
  servings: number;
  difficulty: string;
}

interface GeminiResponse {
  candidates: Array<{
    content: {
      parts: Array<{
        text: string;
      }>;
    };
  }>;
}

export class GeminiAPIService {
  // Keep constructor signature for compatibility, but no key is needed
  constructor(_apiKey?: string) {}

  async generateRecipe(params: RecipeParams): Promise<Recipe> {
    try {
      const { supabase } = await import("@/integrations/supabase/client");
      const { data, error } = await supabase.functions.invoke('generate-recipe', {
        body: params,
      });

      if (error) {
        console.error('Edge function error:', error);
        throw new Error(error.message || 'Failed to generate recipe. Please try again.');
      }

      const recipe = (data as any)?.recipe as Recipe | undefined;
      if (!recipe) {
        const serverError = (data as any)?.error as string | undefined;
        throw new Error(serverError || 'Invalid recipe returned by AI');
      }
      return recipe;
    } catch (error) {
      console.error('Error generating recipe:', error);
      throw new Error('Failed to generate recipe. Please try again.');
    }
  }
}

// Fallback sample recipes for demo purposes
export const sampleRecipes: Recipe[] = [
  {
    id: "sample-1",
    title: "Mediterranean Pasta Salad",
    description: "A fresh and vibrant pasta salad with Mediterranean flavors",
    ingredients: [
      "300g pasta shells",
      "200g cherry tomatoes, halved",
      "150g feta cheese, cubed",
      "100g black olives",
      "1 cucumber, diced",
      "1/2 red onion, sliced",
      "3 tbsp olive oil",
      "2 tbsp lemon juice",
      "Fresh basil leaves"
    ],
    instructions: [
      "Cook pasta according to package instructions, drain and cool",
      "Halve cherry tomatoes and dice cucumber",
      "Slice red onion thinly and cube feta cheese",
      "In a large bowl, combine pasta with all vegetables",
      "Whisk olive oil and lemon juice together",
      "Pour dressing over pasta and toss gently",
      "Add feta cheese and olives",
      "Garnish with fresh basil and serve chilled"
    ],
    cookingTime: 20,
    servings: 4,
    difficulty: "Easy",
    cuisine: "Mediterranean",
    calories: 420,
    nutrition: {
      protein: "15g",
      carbs: "45g",
      fat: "18g",
      fiber: "6g"
    }
  }
];