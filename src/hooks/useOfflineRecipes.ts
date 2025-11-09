import { useState, useEffect } from 'react';

export interface OfflineRecipe {
  id: string;
  title: string;
  description?: string;
  ingredients: any[];
  instructions: any[];
  image?: string;
  cookingTime?: number;
  servings?: number;
  difficulty?: string;
  calories?: number;
  cuisine?: string;
  savedAt: string;
}

const OFFLINE_RECIPES_KEY = 'offline-recipes';

export const useOfflineRecipes = () => {
  const [offlineRecipes, setOfflineRecipes] = useState<OfflineRecipe[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem(OFFLINE_RECIPES_KEY);
    if (stored) {
      try {
        setOfflineRecipes(JSON.parse(stored));
      } catch (error) {
        console.error('Error parsing offline recipes:', error);
      }
    }
  }, []);

  const saveRecipeOffline = (recipe: Omit<OfflineRecipe, 'savedAt'>) => {
    const offlineRecipe: OfflineRecipe = {
      ...recipe,
      savedAt: new Date().toISOString(),
    };

    const updated = [...offlineRecipes.filter(r => r.id !== recipe.id), offlineRecipe];
    setOfflineRecipes(updated);
    localStorage.setItem(OFFLINE_RECIPES_KEY, JSON.stringify(updated));
    return true;
  };

  const removeOfflineRecipe = (recipeId: string) => {
    const updated = offlineRecipes.filter(r => r.id !== recipeId);
    setOfflineRecipes(updated);
    localStorage.setItem(OFFLINE_RECIPES_KEY, JSON.stringify(updated));
    return true;
  };

  const isRecipeSavedOffline = (recipeId: string) => {
    return offlineRecipes.some(r => r.id === recipeId);
  };

  const clearAllOfflineRecipes = () => {
    setOfflineRecipes([]);
    localStorage.removeItem(OFFLINE_RECIPES_KEY);
  };

  return {
    offlineRecipes,
    saveRecipeOffline,
    removeOfflineRecipe,
    isRecipeSavedOffline,
    clearAllOfflineRecipes,
  };
};