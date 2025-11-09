-- Add foreign key from recipes to profiles
ALTER TABLE public.recipes
ADD CONSTRAINT recipes_author_id_fkey 
FOREIGN KEY (author_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;

-- Remove duplicate recipes (keep only the first one for each user/title/description combo)
DELETE FROM public.recipes a
USING public.recipes b
WHERE a.id > b.id
AND a.author_id = b.author_id
AND a.title = b.title
AND a.description = b.description;

-- Create unique index to prevent duplicate recipe shares
CREATE UNIQUE INDEX unique_recipe_share ON public.recipes(author_id, title, description) 
WHERE description IS NOT NULL;

-- Create unique index to prevent duplicate recipe book entries
CREATE UNIQUE INDEX unique_recipe_book_entry ON public.recipe_books(user_id, recipe_id);

-- Create comments table for recipe comments
CREATE TABLE public.recipe_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  recipe_id UUID NOT NULL REFERENCES public.recipes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  comment TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on comments table
ALTER TABLE public.recipe_comments ENABLE ROW LEVEL SECURITY;

-- RLS policies for comments
CREATE POLICY "Everyone can view comments"
ON public.recipe_comments
FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can create comments"
ON public.recipe_comments
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own comments"
ON public.recipe_comments
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own comments"
ON public.recipe_comments
FOR DELETE
USING (auth.uid() = user_id);

-- Create trigger for updating comments timestamp
CREATE TRIGGER update_recipe_comments_updated_at
BEFORE UPDATE ON public.recipe_comments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();