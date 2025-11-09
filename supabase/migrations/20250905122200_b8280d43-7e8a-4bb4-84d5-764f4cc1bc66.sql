-- Create recipes table for community posts
CREATE TABLE public.recipes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  ingredients JSONB NOT NULL,
  instructions JSONB NOT NULL,
  image_url TEXT,
  cooking_time INTEGER,
  servings INTEGER DEFAULT 4,
  difficulty TEXT CHECK (difficulty IN ('Easy', 'Medium', 'Hard')),
  calories INTEGER,
  cuisine TEXT,
  author_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create recipe_books table for saved recipes
CREATE TABLE public.recipe_books (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  recipe_id UUID NOT NULL REFERENCES public.recipes(id) ON DELETE CASCADE,
  added_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, recipe_id)
);

-- Create recipe_likes table for likes/dislikes
CREATE TABLE public.recipe_likes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  recipe_id UUID NOT NULL REFERENCES public.recipes(id) ON DELETE CASCADE,
  is_like BOOLEAN NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, recipe_id)
);

-- Enable Row Level Security
ALTER TABLE public.recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipe_books ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipe_likes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for recipes (public read, authenticated write)
CREATE POLICY "Everyone can view recipes" 
ON public.recipes 
FOR SELECT 
USING (true);

CREATE POLICY "Authenticated users can create recipes" 
ON public.recipes 
FOR INSERT 
WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Users can update their own recipes" 
ON public.recipes 
FOR UPDATE 
USING (auth.uid() = author_id);

CREATE POLICY "Users can delete their own recipes" 
ON public.recipes 
FOR DELETE 
USING (auth.uid() = author_id);

-- RLS Policies for recipe_books
CREATE POLICY "Users can view their own recipe book" 
ON public.recipe_books 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can add to their own recipe book" 
ON public.recipe_books 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove from their own recipe book" 
ON public.recipe_books 
FOR DELETE 
USING (auth.uid() = user_id);

-- RLS Policies for recipe_likes
CREATE POLICY "Everyone can view likes" 
ON public.recipe_likes 
FOR SELECT 
USING (true);

CREATE POLICY "Authenticated users can like recipes" 
ON public.recipe_likes 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own likes" 
ON public.recipe_likes 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can remove their own likes" 
ON public.recipe_likes 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create storage bucket for recipe images
INSERT INTO storage.buckets (id, name, public) VALUES ('recipe-images', 'recipe-images', true);

-- Storage policies for recipe images
CREATE POLICY "Anyone can view recipe images" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'recipe-images');

CREATE POLICY "Authenticated users can upload recipe images" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'recipe-images' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can update their own recipe images" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'recipe-images' AND auth.uid() IS NOT NULL);

-- Trigger for updating timestamps
CREATE TRIGGER update_recipes_updated_at
BEFORE UPDATE ON public.recipes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();