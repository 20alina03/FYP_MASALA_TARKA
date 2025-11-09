import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload, X, Plus, Save, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { mongoClient } from '@/lib/mongodb-client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';

interface EditRecipeModalProps {
  recipe: any;
  isOpen: boolean;
  onClose: () => void;
  onRecipeUpdate: () => void;
}

const EditRecipeModal = ({ recipe, isOpen, onClose, onRecipeUpdate }: EditRecipeModalProps) => {
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  
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

  const difficulties = ['Easy', 'Medium', 'Hard'];
  const cuisines = ['Italian', 'Asian', 'Mexican', 'Mediterranean', 'Indian', 'American', 'Other'];

  // Populate form with recipe data when opened
  useEffect(() => {
    if (recipe && isOpen) {
      setTitle(recipe.title || '');
      setDescription(recipe.description || '');
      setIngredients(recipe.ingredients || ['']);
      setInstructions(recipe.instructions || ['']);
      setCookingTime(recipe.cooking_time ? recipe.cooking_time.toString() : '');
      setServings(recipe.servings ? recipe.servings.toString() : '4');
      setDifficulty(recipe.difficulty || '');
      setCuisine(recipe.cuisine || '');
      setCalories(recipe.calories ? recipe.calories.toString() : '');
      setImagePreview(recipe.image_url || '');
    }
  }, [recipe, isOpen]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const addIngredient = () => {
    setIngredients([...ingredients, '']);
  };

  const removeIngredient = (index: number) => {
    setIngredients(ingredients.filter((_, i) => i !== index));
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
    setInstructions(instructions.filter((_, i) => i !== index));
  };

  const updateInstruction = (index: number, value: string) => {
    const updated = [...instructions];
    updated[index] = value;
    setInstructions(updated);
  };

  const uploadImage = async (file: File) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${user!.id}-${Date.now()}.${fileExt}`;
    
    const { error: uploadError } = await supabase.storage
      .from('recipe-images')
      .upload(fileName, file);

    if (uploadError) throw uploadError;

    const { data } = supabase.storage
      .from('recipe-images')
      .getPublicUrl(fileName);

    return data.publicUrl;
  };

  const handleSave = async () => {
    if (!user || !recipe) return;

    setIsSubmitting(true);

    try {
      let imageUrl = imagePreview;
      
      if (imageFile) {
        imageUrl = await uploadImage(imageFile);
      }

      const updateData = {
        title,
        description,
        ingredients: ingredients.filter(i => i.trim()),
        instructions: instructions.filter(i => i.trim()),
        image_url: imageUrl,
        cooking_time: cookingTime ? parseInt(cookingTime) : null,
        servings: parseInt(servings),
        difficulty: difficulty || null,
        cuisine: cuisine || null,
        calories: calories ? parseInt(calories) : null,
      };

      const result = await mongoClient
        .from('recipes')
        .update(updateData);

      const { error } = await result.eq('_id', recipe.id);

      if (error) throw error;

      toast({
        title: "Recipe updated!",
        description: "Your recipe has been updated successfully.",
      });

      onRecipeUpdate();
      onClose();
    } catch (error: any) {
      toast({
        title: "Error updating recipe",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setImageFile(null);
    setImagePreview('');
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
                      setImagePreview('');
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
                </div>
              )}
            </div>
          </div>

          {/* Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="edit-title">Recipe Title</Label>
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
              />
            </div>

            <div className="space-y-2">
              <Label>Servings</Label>
              <Input
                type="number"
                value={servings}
                onChange={(e) => setServings(e.target.value)}
                min="1"
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
          </div>

          {/* Ingredients */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Ingredients</Label>
              <Button type="button" variant="outline" size="sm" onClick={addIngredient}>
                <Plus className="w-4 h-4 mr-1" />
                Add
              </Button>
            </div>
            <div className="space-y-2 max-h-32 overflow-y-auto">
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
              <Label>Instructions</Label>
              <Button type="button" variant="outline" size="sm" onClick={addInstruction}>
                <Plus className="w-4 h-4 mr-1" />
                Add Step
              </Button>
            </div>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {instructions.map((instruction, index) => (
                <div key={index} className="flex gap-2">
                  <div className="flex-shrink-0 w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center text-sm font-medium">
                    {index + 1}
                  </div>
                  <Textarea
                    value={instruction}
                    onChange={(e) => updateInstruction(index, e.target.value)}
                    placeholder={`Step ${index + 1} instructions`}
                    rows={1}
                    className="resize-none"
                  />
                  {instructions.length > 1 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => removeInstruction(index)}
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
          <Button variant="outline" onClick={handleClose} className="flex-1">
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