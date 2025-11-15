import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload, X, Plus, Save, Loader2, AlertCircle } from 'lucide-react';
import { mongoClient } from '@/lib/mongodb-client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface EditRecipeModalProps {
  recipe: any;
  isOpen: boolean;
  onClose: () => void;
  onRecipeUpdate: () => void;
  source?: 'community' | 'generated' | 'recipe_book';
}

const EditRecipeModal = ({ recipe, isOpen, onClose, onRecipeUpdate, source = 'community' }: EditRecipeModalProps) => {
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [imageWarning, setImageWarning] = useState<string>('');
  
  // Form data
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [ingredients, setIngredients] = useState<string[]>(['']);
  const [instructions, setInstructions] = useState<string[]>(['']);
  const [cookingTime, setCookingTime] = useState('');
  const [servings, setServings] = useState('4');
  const [difficulty, setDifficulty] = useState<string>('');
  const [cuisine, setCuisine] = useState<string>('');
  const [calories, setCalories] = useState('');
  const [nutrition, setNutrition] = useState({
    protein: '',
    carbs: '',
    fat: '',
    fiber: ''
  });

  const difficulties = ['Easy', 'Medium', 'Hard'];
  const cuisines = ['Italian', 'Asian', 'Mexican', 'Mediterranean', 'Indian', 'American', 'Other'];

  // Populate form with recipe data when opened
  useEffect(() => {
    if (recipe && isOpen) {
      console.log('Populating edit form with recipe:', recipe);
      console.log('Recipe ID:', recipe.id || recipe._id);
      console.log('Recipe source:', source);
      
      setTitle(recipe.title || '');
      setDescription(recipe.description || '');
      
      // Handle ingredients
      const recipeIngredients = recipe.ingredients || [];
      setIngredients(recipeIngredients.length > 0 ? recipeIngredients : ['']);
      
      // Handle instructions
      const recipeInstructions = recipe.instructions || [];
      setInstructions(recipeInstructions.length > 0 ? recipeInstructions : ['']);
      
      setCookingTime(recipe.cooking_time ? recipe.cooking_time.toString() : '');
      setServings(recipe.servings ? recipe.servings.toString() : '4');
      setDifficulty(recipe.difficulty || '');
      setCuisine(recipe.cuisine || '');
      setCalories(recipe.calories ? recipe.calories.toString() : '');
      setNutrition(recipe.nutrition || { protein: '', carbs: '', fat: '', fiber: '' });
      setImagePreview(recipe.image_url || '');
      setImageFile(null);
      setImageWarning('');
    }
  }, [recipe, isOpen, source]);

  const compressImage = (file: File, maxWidth: number = 800, maxHeight: number = 600, quality: number = 0.7): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          // Calculate new dimensions
          if (width > height) {
            if (width > maxWidth) {
              height *= maxWidth / width;
              width = maxWidth;
            }
          } else {
            if (height > maxHeight) {
              width *= maxHeight / height;
              height = maxHeight;
            }
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);

          // Convert to base64 with compression
          const compressedBase64 = canvas.toDataURL('image/jpeg', quality);
          
          // Check if still too large (> 500KB base64)
          if (compressedBase64.length > 500000) {
            // Try with lower quality
            const moreCompressed = canvas.toDataURL('image/jpeg', 0.5);
            resolve(moreCompressed);
          } else {
            resolve(compressedBase64);
          }
        };
        img.onerror = reject;
        img.src = e.target?.result as string;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageWarning('');
      
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Please select an image smaller than 10MB",
          variant: "destructive",
        });
        return;
      }

      if (!file.type.startsWith('image/')) {
        toast({
          title: "Invalid file type",
          description: "Please select an image file",
          variant: "destructive",
        });
        return;
      }

      try {
        setImageFile(file);
        // Show warning if file is large
        if (file.size > 2 * 1024 * 1024) {
          setImageWarning('Large image detected. It will be compressed to reduce upload size.');
        }
        
        // Create preview (compressed)
        const compressed = await compressImage(file);
        setImagePreview(compressed);
      } catch (error) {
        console.error('Error processing image:', error);
        toast({
          title: "Error",
          description: "Failed to process image",
          variant: "destructive",
        });
      }
    }
  };

  const addIngredient = () => {
    setIngredients([...ingredients, '']);
  };

  const removeIngredient = (index: number) => {
    if (ingredients.length > 1) {
      setIngredients(ingredients.filter((_, i) => i !== index));
    }
  };

  const updateIngredient = (index: number, value: string) => {
    const updated = [...ingredients];
    updated[index] = value;
    setIngredients(updated);
  };

  const addInstruction = () => {
    setInstructions([...instructions, '']);
  };

  const removeInstruction = (index: number) => {
    if (instructions.length > 1) {
      setInstructions(instructions.filter((_, i) => i !== index));
    }
  };

  const updateInstruction = (index: number, value: string) => {
    const updated = [...instructions];
    updated[index] = value;
    setInstructions(updated);
  };

  const handleSave = async () => {
    if (!user || !recipe) return;

    // Validation
    const filteredIngredients = ingredients.filter(i => i.trim());
    const filteredInstructions = instructions.filter(i => i.trim());

    if (!title.trim()) {
      toast({
        title: "Validation error",
        description: "Please enter a recipe title",
        variant: "destructive",
      });
      return;
    }

    if (filteredIngredients.length === 0) {
      toast({
        title: "Validation error",
        description: "Please add at least one ingredient",
        variant: "destructive",
      });
      return;
    }

    if (filteredInstructions.length === 0) {
      toast({
        title: "Validation error",
        description: "Please add at least one instruction",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      let imageUrl = recipe.image_url || '';
      
      // Only update image if a new one was selected
      if (imageFile) {
        try {
          console.log('Compressing and converting new image...');
          imageUrl = await compressImage(imageFile, 800, 600, 0.7);
          console.log('Image compressed. Size:', Math.round(imageUrl.length / 1024), 'KB');
          
          // Final check - if still too large, use existing image
          if (imageUrl.length > 800000) { // 800KB limit
            console.warn('Compressed image still too large, keeping original');
            toast({
              title: "Image too large",
              description: "Using existing image. Please use a smaller image file.",
              variant: "default",
            });
            imageUrl = recipe.image_url;
          }
        } catch (error) {
          console.error('Error processing image:', error);
          toast({
            title: "Image processing failed",
            description: "Using existing image.",
            variant: "default",
          });
          imageUrl = recipe.image_url;
        }
      }

      const updateData = {
        title: title.trim(),
        description: description.trim(),
        ingredients: filteredIngredients,
        instructions: filteredInstructions,
        image_url: imageUrl || null,
        cooking_time: cookingTime ? parseInt(cookingTime) : null,
        servings: servings ? parseInt(servings) : 4,
        difficulty: difficulty || null,
        cuisine: cuisine || null,
        calories: calories ? parseInt(calories) : null,
        nutrition: nutrition,
        updated_at: new Date().toISOString(),
      };

      // Determine the recipe ID to use
      const recipeId = recipe.id || recipe._id || recipe.originalRecipeId;
      
      console.log('=== EDIT RECIPE DEBUG ===');
      console.log('Recipe ID:', recipeId);
      console.log('Source:', source);
      console.log('Update data size:', JSON.stringify(updateData).length, 'bytes');

      // Determine which table to update based on source
      let tableName = 'recipes'; // default for community recipes
      
      if (source === 'generated') {
        tableName = 'generated_recipes';
      } else if (source === 'recipe_book') {
        // For recipe_book, check if it's a generated recipe
        if (recipe.isGenerated || recipe.generated_recipe_id) {
          tableName = 'generated_recipes';
        } else {
          tableName = 'recipes';
        }
      }

      console.log('Table name:', tableName);
      console.log('Updating recipe with ID:', recipeId);

      // Perform the update
      const result = await mongoClient
        .from(tableName)
        .update(updateData);

      const { error } = await result.eq('_id', recipeId);

      if (error) {
        console.error('Update error:', error);
        throw new Error(error.error || error.message || 'Failed to update recipe');
      }

      console.log('Recipe updated successfully');

      toast({
        title: "Recipe updated!",
        description: "Your recipe has been updated successfully.",
      });

      onRecipeUpdate();
      onClose();
    } catch (error: any) {
      console.error('Failed to update recipe:', error);
      toast({
        title: "Error updating recipe",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setImageFile(null);
    setImageWarning('');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Recipe</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          {/* Image Upload */}
          <div className="space-y-2">
            <Label>Recipe Image</Label>
            {imageWarning && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{imageWarning}</AlertDescription>
              </Alert>
            )}
            <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-4">
              {imagePreview ? (
                <div className="relative">
                  <img
                    src={imagePreview}
                    alt="Recipe preview"
                    className="w-full h-32 object-cover rounded-lg"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    className="absolute top-2 right-2"
                    onClick={() => {
                      setImageFile(null);
                      setImagePreview(recipe.image_url || '');
                      setImageWarning('');
                    }}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <div className="text-center">
                  <Upload className="mx-auto h-8 w-8 text-muted-foreground" />
                  <div className="mt-2">
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="hidden"
                      id="edit-image-upload"
                    />
                    <Label
                      htmlFor="edit-image-upload"
                      className="cursor-pointer inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 px-3"
                    >
                      Choose Image
                    </Label>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Max 10MB • Images will be compressed • PNG, JPG, WEBP
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="edit-title">Recipe Title *</Label>
              <Input
                id="edit-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter recipe title"
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description of your recipe"
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label>Cooking Time (minutes)</Label>
              <Input
                type="number"
                value={cookingTime}
                onChange={(e) => setCookingTime(e.target.value)}
                placeholder="30"
                min="1"
              />
            </div>

            <div className="space-y-2">
              <Label>Servings *</Label>
              <Input
                type="number"
                value={servings}
                onChange={(e) => setServings(e.target.value)}
                min="1"
                max="50"
              />
            </div>

            <div className="space-y-2">
              <Label>Difficulty</Label>
              <Select value={difficulty} onValueChange={setDifficulty}>
                <SelectTrigger>
                  <SelectValue placeholder="Select difficulty" />
                </SelectTrigger>
                <SelectContent>
                  {difficulties.map((diff) => (
                    <SelectItem key={diff} value={diff}>
                      {diff}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Cuisine</Label>
              <Select value={cuisine} onValueChange={setCuisine}>
                <SelectTrigger>
                  <SelectValue placeholder="Select cuisine" />
                </SelectTrigger>
                <SelectContent>
                  {cuisines.map((cuis) => (
                    <SelectItem key={cuis} value={cuis}>
                      {cuis}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Calories (per serving)</Label>
              <Input
                type="number"
                value={calories}
                onChange={(e) => setCalories(e.target.value)}
                placeholder="300"
                min="0"
              />
            </div>
          </div>

          {/* Ingredients */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Ingredients *</Label>
              <Button type="button" variant="outline" size="sm" onClick={addIngredient}>
                <Plus className="w-4 h-4 mr-1" />
                Add
              </Button>
            </div>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {ingredients.map((ingredient, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    value={ingredient}
                    onChange={(e) => updateIngredient(index, e.target.value)}
                    placeholder={`Ingredient ${index + 1}`}
                  />
                  {ingredients.length > 1 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => removeIngredient(index)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Instructions */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Instructions *</Label>
              <Button type="button" variant="outline" size="sm" onClick={addInstruction}>
                <Plus className="w-4 h-4 mr-1" />
                Add Step
              </Button>
            </div>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {instructions.map((instruction, index) => (
                <div key={index} className="flex gap-2">
                  <div className="flex-shrink-0 w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center text-sm font-medium mt-2">
                    {index + 1}
                  </div>
                  <Textarea
                    value={instruction}
                    onChange={(e) => updateInstruction(index, e.target.value)}
                    placeholder={`Step ${index + 1} instructions`}
                    rows={2}
                    className="resize-none"
                  />
                  {instructions.length > 1 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => removeInstruction(index)}
                      className="mt-2"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-4 border-t">
          <Button 
            variant="outline" 
            onClick={handleClose} 
            className="flex-1"
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={isSubmitting || !title.trim()}
            className="flex-1"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EditRecipeModal;