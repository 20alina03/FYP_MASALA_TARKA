-- Create generated_recipes table for AI-generated recipes
CREATE TABLE public.generated_recipes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  ingredients JSONB NOT NULL DEFAULT '[]'::jsonb,
  instructions JSONB NOT NULL DEFAULT '[]'::jsonb,
  cooking_time INTEGER,
  servings INTEGER DEFAULT 4,
  calories INTEGER,
  difficulty TEXT,
  cuisine TEXT,
  image_url TEXT,
  generated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.generated_recipes ENABLE ROW LEVEL SECURITY;

-- Create policies for generated recipes
CREATE POLICY "Users can view their own generated recipes" 
ON public.generated_recipes 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own generated recipes" 
ON public.generated_recipes 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own generated recipes" 
ON public.generated_recipes 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own generated recipes" 
ON public.generated_recipes 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_generated_recipes_updated_at
BEFORE UPDATE ON public.generated_recipes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();