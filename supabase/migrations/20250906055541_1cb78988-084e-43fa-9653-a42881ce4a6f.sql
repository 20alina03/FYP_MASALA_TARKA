-- Add unique constraint to prevent duplicate recipe saves per user
ALTER TABLE public.recipe_books
ADD CONSTRAINT recipe_books_user_recipe_unique UNIQUE (user_id, recipe_id);
