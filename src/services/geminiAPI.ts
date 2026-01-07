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
    title: "Chicken Alfredo Pasta",
    description: "Creamy and rich Italian pasta with tender chicken",
    ingredients: [
      "400g fettuccine pasta",
      "500g chicken breast, sliced",
      "2 cups heavy cream",
      "1 cup parmesan cheese, grated",
      "4 cloves garlic, minced",
      "3 tbsp butter",
      "Salt and black pepper to taste",
      "Fresh parsley for garnish"
    ],
    instructions: [
      "Cook fettuccine according to package instructions",
      "Season chicken with salt and pepper, cook in butter until golden",
      "Remove chicken and set aside",
      "In the same pan, sauté garlic in remaining butter",
      "Add heavy cream and bring to simmer",
      "Stir in parmesan cheese until melted",
      "Add cooked chicken back to the sauce",
      "Toss pasta with sauce and serve hot with parsley"
    ],
    cookingTime: 30,
    servings: 4,
    difficulty: "Medium",
    cuisine: "Italian",
    calories: 650,
    nutrition: {
      protein: "35g",
      carbs: "55g",
      fat: "32g",
      fiber: "3g"
    }
  },
  {
    id: "sample-2",
    title: "Chicken Biryani",
    description: "Aromatic Indian rice dish with spiced chicken",
    ingredients: [
      "500g basmati rice",
      "750g chicken pieces",
      "2 onions, sliced",
      "1 cup yogurt",
      "4 tomatoes, chopped",
      "Biryani masala - 2 tbsp",
      "Saffron strands in milk",
      "Mint and coriander leaves",
      "Whole spices (bay leaf, cardamom, cinnamon)",
      "Ghee - 4 tbsp"
    ],
    instructions: [
      "Marinate chicken in yogurt and biryani masala for 30 minutes",
      "Soak rice in water for 20 minutes, then parboil",
      "Fry onions until golden brown",
      "Cook marinated chicken with tomatoes and spices",
      "Layer rice over chicken in a heavy pot",
      "Sprinkle fried onions, saffron milk, mint, and ghee",
      "Cover and cook on low heat for 25 minutes (dum)",
      "Let it rest for 5 minutes before serving"
    ],
    cookingTime: 90,
    servings: 6,
    difficulty: "Hard",
    cuisine: "Indian",
    calories: 580,
    nutrition: {
      protein: "28g",
      carbs: "68g",
      fat: "20g",
      fiber: "4g"
    }
  },
  {
    id: "sample-3",
    title: "Chicken Chow Mein",
    description: "Classic Chinese stir-fried noodles with vegetables",
    ingredients: [
      "400g egg noodles",
      "300g chicken breast, sliced",
      "2 cups mixed vegetables (cabbage, carrots, bell peppers)",
      "3 tbsp soy sauce",
      "2 tbsp oyster sauce",
      "2 cloves garlic, minced",
      "1 inch ginger, minced",
      "3 tbsp vegetable oil",
      "Green onions for garnish"
    ],
    instructions: [
      "Cook noodles according to package, drain and set aside",
      "Heat oil in a wok, stir-fry chicken until cooked",
      "Remove chicken and set aside",
      "Stir-fry garlic, ginger, and vegetables until crisp-tender",
      "Add cooked noodles and chicken back to wok",
      "Pour soy sauce and oyster sauce over everything",
      "Toss everything together on high heat",
      "Garnish with green onions and serve hot"
    ],
    cookingTime: 25,
    servings: 4,
    difficulty: "Easy",
    cuisine: "Chinese",
    calories: 480,
    nutrition: {
      protein: "25g",
      carbs: "58g",
      fat: "15g",
      fiber: "5g"
    }
  },
  {
    id: "sample-4",
    title: "Margherita Pizza",
    description: "Classic Italian pizza with tomato, mozzarella, and basil",
    ingredients: [
      "Pizza dough - 500g",
      "Tomato sauce - 1 cup",
      "Fresh mozzarella - 300g, sliced",
      "Fresh basil leaves",
      "Olive oil - 2 tbsp",
      "Salt to taste",
      "Garlic powder - 1 tsp"
    ],
    instructions: [
      "Preheat oven to 475°F (245°C)",
      "Roll out pizza dough on a floured surface",
      "Spread tomato sauce evenly over dough",
      "Arrange mozzarella slices on top",
      "Drizzle with olive oil and sprinkle garlic powder",
      "Bake for 12-15 minutes until crust is golden",
      "Remove from oven and top with fresh basil",
      "Slice and serve immediately"
    ],
    cookingTime: 25,
    servings: 4,
    difficulty: "Medium",
    cuisine: "Italian",
    calories: 520,
    nutrition: {
      protein: "22g",
      carbs: "62g",
      fat: "18g",
      fiber: "3g"
    }
  },
  {
    id: "sample-5",
    title: "Chicken Tikka Masala",
    description: "Creamy tomato-based curry with grilled chicken",
    ingredients: [
      "600g chicken breast, cubed",
      "1 cup yogurt",
      "2 tbsp tikka masala spice",
      "3 tomatoes, pureed",
      "1 cup heavy cream",
      "2 onions, chopped",
      "4 cloves garlic, minced",
      "1 inch ginger, grated",
      "3 tbsp oil",
      "Fresh cilantro"
    ],
    instructions: [
      "Marinate chicken in yogurt and tikka masala for 2 hours",
      "Grill or bake marinated chicken until cooked",
      "Sauté onions, garlic, and ginger in oil",
      "Add tomato puree and cook for 10 minutes",
      "Add grilled chicken to the sauce",
      "Pour in cream and simmer for 15 minutes",
      "Season with salt and add more spices if needed",
      "Garnish with cilantro and serve with naan or rice"
    ],
    cookingTime: 45,
    servings: 4,
    difficulty: "Medium",
    cuisine: "Indian",
    calories: 485,
    nutrition: {
      protein: "38g",
      carbs: "18g",
      fat: "28g",
      fiber: "4g"
    }
  },
  {
    id: "sample-6",
    title: "Beef Tacos",
    description: "Mexican street-style tacos with seasoned beef",
    ingredients: [
      "500g ground beef",
      "8 small tortillas",
      "1 onion, diced",
      "2 tomatoes, diced",
      "Lettuce, shredded",
      "Cheddar cheese, grated",
      "Sour cream",
      "Taco seasoning - 2 tbsp",
      "Lime wedges"
    ],
    instructions: [
      "Brown ground beef in a pan over medium heat",
      "Add taco seasoning and a splash of water",
      "Simmer until beef is well coated and cooked through",
      "Warm tortillas in a dry pan or microwave",
      "Fill each tortilla with seasoned beef",
      "Top with lettuce, tomatoes, onions, and cheese",
      "Add a dollop of sour cream",
      "Serve with lime wedges on the side"
    ],
    cookingTime: 20,
    servings: 4,
    difficulty: "Easy",
    cuisine: "Mexican",
    calories: 420,
    nutrition: {
      protein: "28g",
      carbs: "35g",
      fat: "18g",
      fiber: "5g"
    }
  },
  {
    id: "sample-7",
    title: "Pad Thai",
    description: "Thai stir-fried rice noodles with shrimp and peanuts",
    ingredients: [
      "300g rice noodles",
      "300g shrimp, peeled",
      "2 eggs",
      "3 tbsp fish sauce",
      "2 tbsp tamarind paste",
      "2 tbsp sugar",
      "Bean sprouts - 1 cup",
      "Crushed peanuts - 1/2 cup",
      "Lime wedges",
      "Green onions, chopped"
    ],
    instructions: [
      "Soak rice noodles in warm water until soft",
      "Heat oil in wok, scramble eggs and set aside",
      "Stir-fry shrimp until pink",
      "Add drained noodles to the wok",
      "Mix fish sauce, tamarind, and sugar, pour over noodles",
      "Toss everything together with eggs",
      "Add bean sprouts and stir briefly",
      "Serve topped with peanuts, lime, and green onions"
    ],
    cookingTime: 25,
    servings: 4,
    difficulty: "Medium",
    cuisine: "Thai",
    calories: 445,
    nutrition: {
      protein: "24g",
      carbs: "52g",
      fat: "16g",
      fiber: "3g"
    }
  },
  {
    id: "sample-8",
    title: "Caesar Salad",
    description: "Classic salad with romaine, croutons, and Caesar dressing",
    ingredients: [
      "1 large head romaine lettuce",
      "1 cup croutons",
      "1/2 cup parmesan cheese, shaved",
      "Caesar dressing - 1/2 cup",
      "2 cloves garlic, minced",
      "2 anchovy fillets (optional)",
      "Lemon juice - 2 tbsp",
      "Black pepper to taste"
    ],
    instructions: [
      "Wash and chop romaine lettuce into bite-sized pieces",
      "Toast bread cubes with olive oil for homemade croutons",
      "Prepare dressing with garlic, anchovies, lemon, and mayo",
      "Place lettuce in a large bowl",
      "Drizzle Caesar dressing over lettuce",
      "Toss well to coat evenly",
      "Add croutons and parmesan cheese",
      "Serve immediately with extra cheese and pepper"
    ],
    cookingTime: 15,
    servings: 4,
    difficulty: "Easy",
    cuisine: "American",
    calories: 280,
    nutrition: {
      protein: "12g",
      carbs: "18g",
      fat: "18g",
      fiber: "4g"
    }
  },
  {
    id: "sample-9",
    title: "Fried Rice",
    description: "Asian-style fried rice with vegetables and egg",
    ingredients: [
      "4 cups cooked rice, day-old",
      "2 eggs, beaten",
      "1 cup mixed vegetables (peas, carrots, corn)",
      "3 tbsp soy sauce",
      "2 cloves garlic, minced",
      "2 green onions, chopped",
      "3 tbsp vegetable oil",
      "Sesame oil - 1 tsp",
      "White pepper to taste"
    ],
    instructions: [
      "Heat oil in a large wok or pan",
      "Scramble eggs and set aside",
      "Stir-fry garlic and mixed vegetables",
      "Add day-old rice and break up any clumps",
      "Pour soy sauce over rice and mix well",
      "Add scrambled eggs back to the pan",
      "Drizzle with sesame oil and sprinkle white pepper",
      "Garnish with green onions and serve hot"
    ],
    cookingTime: 15,
    servings: 4,
    difficulty: "Easy",
    cuisine: "Asian",
    calories: 340,
    nutrition: {
      protein: "10g",
      carbs: "54g",
      fat: "10g",
      fiber: "3g"
    }
  },
  {
    id: "sample-10",
    title: "Spaghetti Carbonara",
    description: "Creamy Italian pasta with bacon and egg",
    ingredients: [
      "400g spaghetti",
      "200g bacon or pancetta, diced",
      "3 egg yolks",
      "1 cup parmesan cheese, grated",
      "2 cloves garlic, minced",
      "Black pepper, freshly ground",
      "Salt to taste",
      "Fresh parsley"
    ],
    instructions: [
      "Cook spaghetti in salted boiling water until al dente",
      "Fry bacon until crispy, add garlic briefly",
      "Beat egg yolks with parmesan and black pepper",
      "Drain pasta, reserving 1 cup pasta water",
      "Toss hot pasta with bacon in the pan",
      "Remove from heat, add egg mixture quickly",
      "Toss vigorously, adding pasta water to create creamy sauce",
      "Serve immediately with extra parmesan and parsley"
    ],
    cookingTime: 20,
    servings: 4,
    difficulty: "Medium",
    cuisine: "Italian",
    calories: 580,
    nutrition: {
      protein: "26g",
      carbs: "62g",
      fat: "24g",
      fiber: "3g"
    }
  },
  {
    id: "sample-11",
    title: "Beef Burger",
    description: "Juicy homemade burger with classic toppings",
    ingredients: [
      "500g ground beef",
      "4 burger buns",
      "4 slices cheese",
      "Lettuce leaves",
      "Tomato slices",
      "Onion slices",
      "Pickles",
      "Ketchup and mustard",
      "Salt and pepper"
    ],
    instructions: [
      "Season ground beef with salt and pepper",
      "Form into 4 equal patties",
      "Heat grill or pan to medium-high heat",
      "Cook patties for 4-5 minutes per side",
      "Add cheese in the last minute to melt",
      "Toast burger buns lightly",
      "Assemble burgers with lettuce, tomato, onion, and pickles",
      "Add condiments and serve immediately"
    ],
    cookingTime: 20,
    servings: 4,
    difficulty: "Easy",
    cuisine: "American",
    calories: 520,
    nutrition: {
      protein: "32g",
      carbs: "38g",
      fat: "24g",
      fiber: "3g"
    }
  },
  {
    id: "sample-12",
    title: "Tom Yum Soup",
    description: "Spicy and sour Thai soup with shrimp",
    ingredients: [
      "500g shrimp, peeled",
      "4 cups chicken broth",
      "3 stalks lemongrass, bruised",
      "5 kaffir lime leaves",
      "4 Thai chilies",
      "200g mushrooms, sliced",
      "3 tbsp fish sauce",
      "2 tbsp lime juice",
      "Fresh cilantro"
    ],
    instructions: [
      "Bring chicken broth to a boil",
      "Add lemongrass, lime leaves, and chilies",
      "Simmer for 10 minutes to infuse flavors",
      "Add mushrooms and cook for 5 minutes",
      "Add shrimp and cook until pink",
      "Season with fish sauce",
      "Remove from heat and add lime juice",
      "Garnish with cilantro and serve hot"
    ],
    cookingTime: 30,
    servings: 4,
    difficulty: "Medium",
    cuisine: "Thai",
    calories: 180,
    nutrition: {
      protein: "22g",
      carbs: "8g",
      fat: "6g",
      fiber: "2g"
    }
  },
  {
    id: "sample-13",
    title: "Chicken Quesadilla",
    description: "Cheesy Mexican tortilla with seasoned chicken",
    ingredients: [
      "4 large flour tortillas",
      "300g cooked chicken, shredded",
      "2 cups cheddar cheese, grated",
      "1 bell pepper, diced",
      "1 onion, diced",
      "1 tsp cumin",
      "Sour cream for serving",
      "Salsa for serving",
      "2 tbsp oil"
    ],
    instructions: [
      "Sauté onions and bell peppers until soft",
      "Add chicken and cumin, cook for 2 minutes",
      "Heat a large pan and place one tortilla",
      "Sprinkle half with cheese, then chicken mixture",
      "Top with more cheese and fold tortilla in half",
      "Cook until golden brown on both sides",
      "Repeat with remaining tortillas",
      "Cut into wedges and serve with sour cream and salsa"
    ],
    cookingTime: 20,
    servings: 4,
    difficulty: "Easy",
    cuisine: "Mexican",
    calories: 460,
    nutrition: {
      protein: "28g",
      carbs: "42g",
      fat: "20g",
      fiber: "4g"
    }
  },
  {
    id: "sample-14",
    title: "Butter Chicken",
    description: "Rich and creamy Indian curry with tender chicken",
    ingredients: [
      "600g chicken thighs, cubed",
      "1/2 cup yogurt",
      "4 tomatoes, pureed",
      "1 cup heavy cream",
      "4 tbsp butter",
      "2 onions, chopped",
      "Garam masala - 2 tsp",
      "Kashmiri chili powder - 1 tsp",
      "Honey - 1 tbsp",
      "Fresh fenugreek leaves"
    ],
    instructions: [
      "Marinate chicken in yogurt and spices for 1 hour",
      "Grill or pan-fry chicken until lightly charred",
      "Melt butter and sauté onions until golden",
      "Add tomato puree and cook for 15 minutes",
      "Add garam masala and chili powder",
      "Add grilled chicken and cream",
      "Simmer for 20 minutes until thick",
      "Add honey and fenugreek leaves before serving"
    ],
    cookingTime: 60,
    servings: 4,
    difficulty: "Medium",
    cuisine: "Indian",
    calories: 520,
    nutrition: {
      protein: "35g",
      carbs: "16g",
      fat: "35g",
      fiber: "3g"
    }
  },
  {
    id: "sample-15",
    title: "Greek Salad",
    description: "Fresh Mediterranean salad with feta and olives",
    ingredients: [
      "4 tomatoes, chopped",
      "1 cucumber, sliced",
      "1 red onion, sliced",
      "1 cup black olives",
      "200g feta cheese, cubed",
      "1/4 cup olive oil",
      "2 tbsp red wine vinegar",
      "1 tsp oregano",
      "Salt and pepper"
    ],
    instructions: [
      "Chop tomatoes and cucumber into bite-sized pieces",
      "Slice onion thinly",
      "Combine vegetables and olives in a large bowl",
      "Whisk olive oil, vinegar, oregano, salt, and pepper",
      "Pour dressing over salad and toss gently",
      "Top with feta cheese cubes",
      "Let sit for 10 minutes before serving",
      "Serve chilled or at room temperature"
    ],
    cookingTime: 15,
    servings: 4,
    difficulty: "Easy",
    cuisine: "Greek",
    calories: 280,
    nutrition: {
      protein: "10g",
      carbs: "14g",
      fat: "22g",
      fiber: "4g"
    }
  },
  {
    id: "sample-16",
    title: "Beef Stir Fry",
    description: "Quick Asian beef and vegetable stir fry",
    ingredients: [
      "500g beef sirloin, sliced thin",
      "2 cups mixed vegetables (broccoli, carrots, snap peas)",
      "3 tbsp soy sauce",
      "2 tbsp oyster sauce",
      "1 tbsp cornstarch",
      "3 cloves garlic, minced",
      "1 inch ginger, minced",
      "3 tbsp vegetable oil",
      "Sesame seeds for garnish"
    ],
    instructions: [
      "Slice beef thinly against the grain",
      "Marinate beef with cornstarch and 1 tbsp soy sauce",
      "Heat oil in wok on high heat",
      "Stir-fry beef quickly until browned, remove",
      "Stir-fry vegetables with garlic and ginger",
      "Return beef to wok",
      "Add remaining soy sauce and oyster sauce",
      "Toss everything together and garnish with sesame seeds"
    ],
    cookingTime: 20,
    servings: 4,
    difficulty: "Easy",
    cuisine: "Asian",
    calories: 380,
    nutrition: {
      protein: "32g",
      carbs: "18g",
      fat: "20g",
      fiber: "4g"
    }
  },
  {
    id: "sample-17",
    title: "Chicken Fajitas",
    description: "Sizzling Mexican chicken with peppers and onions",
    ingredients: [
      "600g chicken breast, sliced",
      "3 bell peppers, sliced",
      "2 onions, sliced",
      "8 flour tortillas",
      "2 tbsp fajita seasoning",
      "3 tbsp oil",
      "Lime wedges",
      "Sour cream and guacamole for serving",
      "Fresh cilantro"
    ],
    instructions: [
      "Slice chicken, peppers, and onions into strips",
      "Toss chicken with fajita seasoning",
      "Heat oil in a large skillet over high heat",
      "Cook chicken until browned, remove and set aside",
      "Sauté peppers and onions until charred and tender",
      "Return chicken to pan and toss together",
      "Warm tortillas in a dry pan",
      "Serve chicken mixture in tortillas with toppings"
    ],
    cookingTime: 25,
    servings: 4,
    difficulty: "Easy",
    cuisine: "Mexican",
    calories: 450,
    nutrition: {
      protein: "35g",
      carbs: "48g",
      fat: "12g",
      fiber: "5g"
    }
  },
  {
    id: "sample-18",
    title: "Lasagna",
    description: "Classic Italian layered pasta with meat sauce",
    ingredients: [
      "12 lasagna noodles",
      "500g ground beef",
      "3 cups marinara sauce",
      "2 cups ricotta cheese",
      "3 cups mozzarella cheese, shredded",
      "1 cup parmesan cheese",
      "2 eggs",
      "1 onion, chopped",
      "4 cloves garlic, minced",
      "Italian herbs"
    ],
    instructions: [
      "Cook lasagna noodles according to package",
      "Brown ground beef with onions and garlic",
      "Add marinara sauce to meat and simmer",
      "Mix ricotta with eggs and half the parmesan",
      "Layer sauce, noodles, ricotta mixture, and mozzarella",
      "Repeat layers, ending with mozzarella and parmesan",
      "Cover with foil and bake at 375°F for 45 minutes",
      "Remove foil and bake 15 more minutes until golden"
    ],
    cookingTime: 90,
    servings: 8,
    difficulty: "Medium",
    cuisine: "Italian",
    calories: 620,
    nutrition: {
      protein: "38g",
      carbs: "48g",
      fat: "28g",
      fiber: "4g"
    }
  },
  {
    id: "sample-19",
    title: "Pho",
    description: "Vietnamese beef noodle soup with herbs",
    ingredients: [
      "400g rice noodles",
      "400g beef sirloin, thinly sliced",
      "8 cups beef broth",
      "2 onions, charred",
      "3 inch ginger, charred",
      "Star anise - 3 pieces",
      "Cinnamon stick",
      "Fish sauce - 3 tbsp",
      "Bean sprouts, basil, lime, chilies for serving"
    ],
    instructions: [
      "Char onions and ginger over flame",
      "Simmer broth with onions, ginger, star anise, and cinnamon for 1 hour",
      "Strain broth and season with fish sauce",
      "Cook rice noodles according to package",
      "Place noodles in bowls",
      "Top with raw beef slices",
      "Pour boiling broth over to cook the beef",
      "Serve with bean sprouts, herbs, lime, and chilies"
    ],
    cookingTime: 90,
    servings: 4,
    difficulty: "Medium",
    cuisine: "Vietnamese",
    calories: 420,
    nutrition: {
      protein: "28g",
      carbs: "58g",
      fat: "8g",
      fiber: "3g"
    }
  },
  {
    id: "sample-20",
    title: "Fish and Chips",
    description: "British classic with crispy battered fish",
    ingredients: [
      "4 white fish fillets (cod or haddock)",
      "4 large potatoes, cut into chips",
      "1 cup flour",
      "1 cup beer",
      "1 tsp baking powder",
      "Oil for deep frying",
      "Salt and pepper",
      "Malt vinegar",
      "Tartar sauce"
    ],
    instructions: [
      "Cut potatoes into thick chips and soak in water",
      "Make batter with flour, beer, and baking powder",
      "Heat oil to 350°F",
      "Dry chips and fry until golden, remove and set aside",
      "Coat fish in batter and deep fry until golden brown",
      "Fry chips again at higher temperature for extra crispiness",
      "Drain on paper towels and season with salt",
      "Serve with malt vinegar and tartar sauce"
    ],
    cookingTime: 40,
    servings: 4,
    difficulty: "Medium",
    cuisine: "British",
    calories: 680,
    nutrition: {
      protein: "35g",
      carbs: "72g",
      fat: "28g",
      fiber: "6g"
    }
  },
  {
    id: "sample-21",
    title: "Chicken Korma",
    description: "Mild and creamy Indian curry with nuts",
    ingredients: [
      "600g chicken, cubed",
      "1 cup yogurt",
      "1/2 cup cashews, soaked",
      "1 cup cream",
      "2 onions, chopped",
      "4 cloves garlic",
      "1 inch ginger",
      "2 tsp garam masala",
      "1 tsp turmeric",
      "3 tbsp oil"
    ],
    instructions: [
      "Blend cashews with water to make a paste",
      "Marinate chicken in yogurt and spices",
      "Sauté onions, garlic, and ginger until golden",
      "Add marinated chicken and cook until sealed",
      "Add cashew paste and simmer",
      "Pour in cream and cook for 20 minutes",
      "Adjust seasoning with salt and garam masala",
      "Garnish with sliced almonds and serve with rice"
    ],
    cookingTime: 50,
    servings: 4,
    difficulty: "Medium",
    cuisine: "Indian",
    calories: 540,
    nutrition: {
      protein: "36g",
      carbs: "18g",
      fat: "38g",
      fiber: "3g"
    }
  },
  {
    id: "sample-22",
    title: "Sushi Rolls",
    description: "Japanese rice rolls with fresh fish and vegetables",
    ingredients: [
      "2 cups sushi rice",
      "4 nori sheets",
      "200g fresh salmon or tuna",
      "1 cucumber, julienned",
      "1 avocado, sliced",
      "Rice vinegar - 3 tbsp",
      "Soy sauce for serving",
      "Wasabi and pickled ginger",
      "Sesame seeds"
    ],
    instructions: [
      "Cook sushi rice and mix with rice vinegar",
      "Let rice cool to room temperature",
      "Place nori on bamboo mat, shiny side down",
      "Spread thin layer of rice, leaving 1 inch at top",
      "Place fish, cucumber, and avocado in a line",
      "Roll tightly using the mat",
      "Slice with a wet knife into 8 pieces",
      "Serve with soy sauce, wasabi, and ginger"
    ],
    cookingTime: 45,
    servings: 4,
    difficulty: "Hard",
    cuisine: "Japanese",
    calories: 320,
    nutrition: {
      protein: "18g",
      carbs: "52g",
      fat: "8g",
      fiber: "4g"
    }
  },
  {
    id: "sample-23",
    title: "Chicken Shawarma",
    description: "Middle Eastern spiced chicken wrap",
    ingredients: [
      "600g chicken thighs, sliced",
      "4 pita breads",
      "1 cup tahini sauce",
      "2 tsp cumin",
      "2 tsp paprika",
      "1 tsp turmeric",
      "Lettuce, tomatoes, cucumbers",
      "Pickled vegetables",
      "3 tbsp lemon juice",
      "4 cloves garlic"
    ],
    instructions: [
      "Marinate chicken with spices, garlic, and lemon juice",
      "Let sit for at least 2 hours or overnight",
      "Grill or pan-fry chicken until charred and cooked",
      "Warm pita breads",
      "Slice chicken into strips",
      "Fill pita with chicken, vegetables, and pickles",
      "Drizzle generously with tahini sauce",
      "Wrap and serve immediately"
    ],
    cookingTime: 30,
    servings: 4,
    difficulty: "Easy",
    cuisine: "Middle Eastern",
    calories: 480,
    nutrition: {
      protein: "36g",
      carbs: "42g",
      fat: "18g",
      fiber: "6g"
    }
  },
  {
    id: "sample-24",
    title: "Beef Stew",
    description: "Hearty slow-cooked beef with vegetables",
    ingredients: [
      "800g beef chuck, cubed",
      "4 potatoes, cubed",
      "3 carrots, chopped",
      "2 onions, chopped",
      "4 cups beef broth",
      "2 tbsp tomato paste",
      "3 tbsp flour",
      "Bay leaves",
      "Thyme",
      "3 tbsp oil"
    ],
    instructions: [
      "Season beef with salt and pepper, coat with flour",
      "Brown beef in batches in hot oil",
      "Remove beef and sauté onions until soft",
      "Add tomato paste and cook for 2 minutes",
      "Return beef to pot with broth, bay leaves, and thyme",
      "Simmer covered for 1.5 hours",
      "Add potatoes and carrots, cook for 30 more minutes",
      "Adjust seasoning and serve hot with bread"
    ],
    cookingTime: 150,
    servings: 6,
    difficulty: "Easy",
    cuisine: "American",
    calories: 420,
    nutrition: {
      protein: "35g",
      carbs: "32g",
      fat: "16g",
      fiber: "5g"
    }
  },
  {
    id: "sample-25",
    title: "Chicken Teriyaki",
    description: "Sweet and savory Japanese glazed chicken",
    ingredients: [
      "600g chicken thighs",
      "1/2 cup soy sauce",
      "1/4 cup mirin",
      "1/4 cup sake",
      "3 tbsp sugar",
      "2 cloves garlic, minced",
      "1 inch ginger, grated",
      "Sesame seeds",
      "Green onions, sliced",
      "2 tbsp oil"
    ],
    instructions: [
      "Mix soy sauce, mirin, sake, and sugar for teriyaki sauce",
      "Marinate chicken in half the sauce for 30 minutes",
      "Heat oil in pan and cook chicken skin-side down",
      "Flip and cook until almost done",
      "Add remaining sauce, garlic, and ginger to pan",
      "Simmer until sauce thickens and glazes chicken",
      "Slice chicken and drizzle with sauce",
      "Garnish with sesame seeds and green onions"
    ],
    cookingTime: 25,
    servings: 4,
    difficulty: "Easy",
    cuisine: "Japanese",
    calories: 380,
    nutrition: {
      protein: "34g",
      carbs: "22g",
      fat: "16g",
      fiber: "1g"
    }
  },
  {
    id: "sample-26",
    title: "Enchiladas",
    description: "Mexican tortillas rolled with filling and sauce",
    ingredients: [
      "8 corn tortillas",
      "500g cooked chicken, shredded",
      "2 cups enchilada sauce",
      "2 cups cheddar cheese, shredded",
      "1 onion, diced",
      "1 cup sour cream",
      "1 can black beans",
      "Fresh cilantro",
      "Lime wedges"
    ],
    instructions: [
      "Preheat oven to 375°F",
      "Mix chicken with beans, onions, and half the cheese",
      "Pour a thin layer of enchilada sauce in baking dish",
      "Fill each tortilla with chicken mixture",
      "Roll and place seam-side down in dish",
      "Pour remaining sauce over enchiladas",
      "Top with remaining cheese",
      "Bake for 25 minutes until bubbly, serve with sour cream"
    ],
    cookingTime: 40,
    servings: 4,
    difficulty: "Medium",
    cuisine: "Mexican",
    calories: 540,
    nutrition: {
      protein: "38g",
      carbs: "48g",
      fat: "22g",
      fiber: "8g"
    }
  },
  {
    id: "sample-27",
    title: "Ramen",
    description: "Japanese noodle soup with rich broth",
    ingredients: [
      "4 packs ramen noodles",
      "6 cups chicken or pork broth",
      "4 soft-boiled eggs",
      "200g pork belly, sliced",
      "2 cups bok choy",
      "4 sheets nori",
      "Green onions, sliced",
      "3 tbsp soy sauce",
      "2 tbsp miso paste",
      "Sesame oil"
    ],
    instructions: [
      "Simmer broth with soy sauce and miso paste",
      "Cook ramen noodles according to package",
      "Pan-fry pork belly until crispy",
      "Soft-boil eggs for 6.5 minutes, peel and halve",
      "Blanch bok choy in boiling water",
      "Divide noodles among bowls",
      "Pour hot broth over noodles",
      "Top with pork, eggs, bok choy, nori, and green onions"
    ],
    cookingTime: 40,
    servings: 4,
    difficulty: "Medium",
    cuisine: "Japanese",
    calories: 520,
    nutrition: {
      protein: "28g",
      carbs: "58g",
      fat: "20g",
      fiber: "4g"
    }
  },
  {
    id: "sample-28",
    title: "Pulled Pork Sandwich",
    description: "Slow-cooked shredded pork with BBQ sauce",
    ingredients: [
      "1.5kg pork shoulder",
      "2 cups BBQ sauce",
      "6 burger buns",
      "1 onion, sliced",
      "Coleslaw for topping",
      "2 tbsp paprika",
      "1 tbsp brown sugar",
      "1 tbsp garlic powder",
      "Salt and pepper",
      "Pickles"
    ],
    instructions: [
      "Rub pork with paprika, brown sugar, garlic powder, salt, and pepper",
      "Slow cook at 300°F for 6 hours until tender",
      "Alternatively use slow cooker on low for 8 hours",
      "Shred pork with two forks",
      "Mix shredded pork with BBQ sauce",
      "Toast burger buns",
      "Pile pork high on buns",
      "Top with coleslaw and pickles, serve hot"
    ],
    cookingTime: 360,
    servings: 6,
    difficulty: "Easy",
    cuisine: "American",
    calories: 620,
    nutrition: {
      protein: "42g",
      carbs: "52g",
      fat: "26g",
      fiber: "3g"
    }
  },
  {
    id: "sample-29",
    title: "Chicken Parmesan",
    description: "Breaded chicken with marinara and cheese",
    ingredients: [
      "4 chicken breasts, pounded thin",
      "2 cups breadcrumbs",
      "2 eggs, beaten",
      "1 cup flour",
      "2 cups marinara sauce",
      "2 cups mozzarella, shredded",
      "1/2 cup parmesan cheese",
      "Italian seasoning",
      "Oil for frying",
      "Fresh basil"
    ],
    instructions: [
      "Set up breading station: flour, eggs, breadcrumbs with Italian seasoning",
      "Coat chicken in flour, then egg, then breadcrumbs",
      "Fry chicken in oil until golden on both sides",
      "Place chicken in baking dish",
      "Top each piece with marinara sauce",
      "Cover with mozzarella and parmesan",
      "Bake at 400°F for 15 minutes until cheese melts",
      "Garnish with fresh basil and serve with pasta"
    ],
    cookingTime: 40,
    servings: 4,
    difficulty: "Medium",
    cuisine: "Italian",
    calories: 580,
    nutrition: {
      protein: "48g",
      carbs: "42g",
      fat: "22g",
      fiber: "4g"
    }
  },
  {
    id: "sample-30",
    title: "Vegetable Curry",
    description: "Flavorful Indian vegetable curry",
    ingredients: [
      "2 potatoes, cubed",
      "1 cauliflower, florets",
      "2 carrots, sliced",
      "1 cup peas",
      "2 onions, chopped",
      "3 tomatoes, pureed",
      "1 can coconut milk",
      "3 tbsp curry powder",
      "4 cloves garlic",
      "1 inch ginger",
      "3 tbsp oil"
    ],
    instructions: [
      "Sauté onions, garlic, and ginger in oil",
      "Add curry powder and cook for 1 minute",
      "Add tomato puree and cook for 5 minutes",
      "Add potatoes and carrots with 1 cup water",
      "Simmer covered for 15 minutes",
      "Add cauliflower and peas",
      "Pour in coconut milk and simmer for 10 more minutes",
      "Serve hot with rice or naan"
    ],
    cookingTime: 45,
    servings: 4,
    difficulty: "Easy",
    cuisine: "Indian",
    calories: 320,
    nutrition: {
      protein: "8g",
      carbs: "42g",
      fat: "14g",
      fiber: "10g"
    }
  },
  {
    id: "sample-31",
    title: "Beef Tacos al Pastor",
    description: "Mexican tacos with marinated beef",
    ingredients: [
      "600g beef, thinly sliced",
      "3 tbsp adobo sauce",
      "2 tbsp pineapple juice",
      "8 small corn tortillas",
      "1 cup pineapple, diced",
      "1 onion, diced",
      "Fresh cilantro",
      "Lime wedges",
      "Salsa verde",
      "2 tsp cumin"
    ],
    instructions: [
      "Marinate beef in adobo sauce, pineapple juice, and cumin for 2 hours",
      "Grill or pan-fry beef until charred",
      "Warm tortillas on a dry griddle",
      "Slice beef into strips",
      "Fill tortillas with beef",
      "Top with pineapple, onions, and cilantro",
      "Add salsa verde",
      "Serve with lime wedges"
    ],
    cookingTime: 25,
    servings: 4,
    difficulty: "Easy",
    cuisine: "Mexican",
    calories: 420,
    nutrition: {
      protein: "32g",
      carbs: "38g",
      fat: "14g",
      fiber: "6g"
    }
  },
  {
    id: "sample-32",
    title: "Mushroom Risotto",
    description: "Creamy Italian rice with mushrooms",
    ingredients: [
      "2 cups arborio rice",
      "400g mushrooms, sliced",
      "6 cups vegetable broth, warm",
      "1 onion, finely chopped",
      "1 cup white wine",
      "1 cup parmesan cheese, grated",
      "4 tbsp butter",
      "2 tbsp olive oil",
      "Fresh parsley",
      "Black pepper"
    ],
    instructions: [
      "Sauté mushrooms in butter until golden, set aside",
      "In same pot, sauté onion in olive oil until soft",
      "Add rice and stir for 2 minutes until translucent",
      "Pour in wine and stir until absorbed",
      "Add broth one ladle at a time, stirring constantly",
      "Continue until rice is creamy and al dente (20-25 min)",
      "Stir in mushrooms, parmesan, and remaining butter",
      "Garnish with parsley and serve immediately"
    ],
    cookingTime: 35,
    servings: 4,
    difficulty: "Medium",
    cuisine: "Italian",
    calories: 480,
    nutrition: {
      protein: "14g",
      carbs: "68g",
      fat: "16g",
      fiber: "3g"
    }
  },
  {
    id: "sample-33",
    title: "BBQ Ribs",
    description: "Tender slow-cooked ribs with BBQ glaze",
    ingredients: [
      "1.5kg pork ribs",
      "2 cups BBQ sauce",
      "2 tbsp brown sugar",
      "1 tbsp paprika",
      "1 tbsp garlic powder",
      "1 tbsp onion powder",
      "1 tsp cayenne pepper",
      "Salt and black pepper",
      "Apple cider vinegar - 1/4 cup"
    ],
    instructions: [
      "Remove membrane from back of ribs",
      "Mix dry rub with brown sugar, paprika, garlic, onion powder, cayenne, salt, pepper",
      "Coat ribs generously with rub",
      "Wrap in foil and bake at 275°F for 3 hours",
      "Unwrap and brush with BBQ sauce",
      "Broil or grill for 5 minutes per side until caramelized",
      "Brush with more sauce",
      "Cut into individual ribs and serve"
    ],
    cookingTime: 200,
    servings: 4,
    difficulty: "Medium",
    cuisine: "American",
    calories: 680,
    nutrition: {
      protein: "42g",
      carbs: "35g",
      fat: "42g",
      fiber: "2g"
    }
  },
  {
    id: "sample-34",
    title: "Shrimp Scampi",
    description: "Garlic butter shrimp with white wine",
    ingredients: [
      "600g large shrimp, peeled",
      "400g linguine pasta",
      "6 cloves garlic, minced",
      "1/2 cup white wine",
      "1/2 cup butter",
      "1/4 cup lemon juice",
      "Red pepper flakes",
      "Fresh parsley, chopped",
      "Parmesan cheese",
      "Salt and pepper"
    ],
    instructions: [
      "Cook linguine according to package directions",
      "Melt butter in large pan over medium heat",
      "Add garlic and red pepper flakes, sauté for 1 minute",
      "Add shrimp and cook until pink (3-4 minutes)",
      "Pour in white wine and lemon juice",
      "Simmer for 2 minutes",
      "Toss cooked pasta with shrimp and sauce",
      "Garnish with parsley and parmesan, serve immediately"
    ],
    cookingTime: 20,
    servings: 4,
    difficulty: "Easy",
    cuisine: "Italian",
    calories: 520,
    nutrition: {
      protein: "32g",
      carbs: "52g",
      fat: "18g",
      fiber: "3g"
    }
  },
  {
    id: "sample-35",
    title: "Pork Schnitzel",
    description: "Crispy breaded pork cutlet",
    ingredients: [
      "4 pork cutlets, pounded thin",
      "2 cups breadcrumbs",
      "2 eggs, beaten",
      "1 cup flour",
      "Lemon wedges",
      "Vegetable oil for frying",
      "Salt and pepper",
      "Paprika",
      "Fresh parsley"
    ],
    instructions: [
      "Season pork cutlets with salt, pepper, and paprika",
      "Set up breading station: flour, beaten eggs, breadcrumbs",
      "Coat each cutlet in flour, then egg, then breadcrumbs",
      "Heat 1/2 inch oil in large skillet",
      "Fry cutlets for 3-4 minutes per side until golden",
      "Drain on paper towels",
      "Garnish with parsley",
      "Serve with lemon wedges and potato salad"
    ],
    cookingTime: 25,
    servings: 4,
    difficulty: "Easy",
    cuisine: "German",
    calories: 520,
    nutrition: {
      protein: "38g",
      carbs: "42g",
      fat: "22g",
      fiber: "2g"
    }
  },
  {
    id: "sample-36",
    title: "Chicken Noodle Soup",
    description: "Comforting homemade soup with chicken",
    ingredients: [
      "500g chicken breast",
      "300g egg noodles",
      "8 cups chicken broth",
      "3 carrots, sliced",
      "3 celery stalks, chopped",
      "1 onion, diced",
      "4 cloves garlic, minced",
      "Bay leaves",
      "Fresh thyme",
      "Salt and pepper",
      "Fresh parsley"
    ],
    instructions: [
      "Bring broth to boil with chicken breast",
      "Simmer for 20 minutes until chicken is cooked",
      "Remove chicken, shred, and set aside",
      "Add carrots, celery, onion, and garlic to broth",
      "Add bay leaves and thyme, simmer for 15 minutes",
      "Add noodles and cook until tender",
      "Return shredded chicken to pot",
      "Season with salt and pepper, garnish with parsley"
    ],
    cookingTime: 50,
    servings: 6,
    difficulty: "Easy",
    cuisine: "American",
    calories: 280,
    nutrition: {
      protein: "24g",
      carbs: "32g",
      fat: "6g",
      fiber: "3g"
    }
  },
  {
    id: "sample-37",
    title: "Beef Burritos",
    description: "Hearty Mexican wrapped meal",
    ingredients: [
      "500g ground beef",
      "4 large flour tortillas",
      "2 cups cooked rice",
      "1 can refried beans",
      "2 cups cheddar cheese, shredded",
      "Lettuce, shredded",
      "Tomatoes, diced",
      "Sour cream",
      "Salsa",
      "Taco seasoning - 2 tbsp"
    ],
    instructions: [
      "Brown ground beef with taco seasoning",
      "Warm refried beans in a pot",
      "Warm tortillas in microwave for 20 seconds",
      "Layer rice, beans, and beef down center of tortilla",
      "Add cheese, lettuce, and tomatoes",
      "Fold in sides and roll tightly",
      "Optional: grill burrito seam-side down for crispy exterior",
      "Serve with sour cream and salsa"
    ],
    cookingTime: 25,
    servings: 4,
    difficulty: "Easy",
    cuisine: "Mexican",
    calories: 680,
    nutrition: {
      protein: "36g",
      carbs: "72g",
      fat: "26g",
      fiber: "8g"
    }
  },
  {
    id: "sample-38",
    title: "Kung Pao Chicken",
    description: "Spicy Szechuan chicken with peanuts",
    ingredients: [
      "600g chicken breast, cubed",
      "1 cup roasted peanuts",
      "3 bell peppers, cubed",
      "6 dried red chilies",
      "4 tbsp soy sauce",
      "2 tbsp rice vinegar",
      "2 tbsp sugar",
      "1 tbsp cornstarch",
      "4 cloves garlic, minced",
      "1 inch ginger, minced",
      "Sesame oil"
    ],
    instructions: [
      "Mix soy sauce, vinegar, sugar, and cornstarch for sauce",
      "Marinate chicken in half the sauce for 15 minutes",
      "Heat oil in wok, stir-fry dried chilies for 30 seconds",
      "Add chicken and cook until browned",
      "Add garlic, ginger, and bell peppers",
      "Pour remaining sauce and toss everything together",
      "Add peanuts and drizzle sesame oil",
      "Serve hot with steamed rice"
    ],
    cookingTime: 25,
    servings: 4,
    difficulty: "Medium",
    cuisine: "Chinese",
    calories: 450,
    nutrition: {
      protein: "38g",
      carbs: "24g",
      fat: "22g",
      fiber: "4g"
    }
  },
  {
    id: "sample-39",
    title: "Clam Chowder",
    description: "Creamy New England-style soup",
    ingredients: [
      "500g fresh clams or 2 cans clam meat",
      "4 potatoes, diced",
      "3 strips bacon, chopped",
      "1 onion, diced",
      "2 celery stalks, diced",
      "3 cups clam juice or broth",
      "2 cups heavy cream",
      "3 tbsp flour",
      "Bay leaf",
      "Fresh thyme",
      "Oyster crackers"
    ],
    instructions: [
      "Cook bacon until crispy, remove and set aside",
      "Sauté onion and celery in bacon fat",
      "Sprinkle flour and cook for 2 minutes",
      "Gradually add clam juice while stirring",
      "Add potatoes, bay leaf, and thyme",
      "Simmer until potatoes are tender",
      "Add clams and cream, heat through",
      "Serve with bacon crumbles and oyster crackers"
    ],
    cookingTime: 40,
    servings: 6,
    difficulty: "Medium",
    cuisine: "American",
    calories: 420,
    nutrition: {
      protein: "18g",
      carbs: "32g",
      fat: "26g",
      fiber: "3g"
    }
  },
  {
    id: "sample-40",
    title: "Chicken Curry",
    description: "Aromatic curry with tender chicken",
    ingredients: [
      "700g chicken thighs, cubed",
      "2 onions, chopped",
      "4 tomatoes, pureed",
      "1 can coconut milk",
      "3 tbsp curry powder",
      "1 tbsp garam masala",
      "4 cloves garlic, minced",
      "1 inch ginger, grated",
      "Fresh cilantro",
      "3 tbsp oil",
      "Salt to taste"
    ],
    instructions: [
      "Heat oil and sauté onions until golden",
      "Add garlic and ginger, cook for 1 minute",
      "Add curry powder and garam masala, stir for 30 seconds",
      "Add tomato puree and cook for 10 minutes",
      "Add chicken and coat with sauce",
      "Pour in coconut milk and simmer for 25 minutes",
      "Season with salt",
      "Garnish with cilantro and serve with rice or naan"
    ],
    cookingTime: 50,
    servings: 4,
    difficulty: "Medium",
    cuisine: "Indian",
    calories: 480,
    nutrition: {
      protein: "36g",
      carbs: "18g",
      fat: "30g",
      fiber: "5g"
    }
  },
  {
    id: "sample-41",
    title: "Beef Stroganoff",
    description: "Russian beef in creamy mushroom sauce",
    ingredients: [
      "600g beef sirloin, sliced",
      "300g mushrooms, sliced",
      "1 onion, chopped",
      "2 cups sour cream",
      "2 cups beef broth",
      "3 tbsp flour",
      "2 tbsp Dijon mustard",
      "400g egg noodles",
      "4 tbsp butter",
      "Fresh parsley",
      "Salt and pepper"
    ],
    instructions: [
      "Season beef with salt and pepper, toss with flour",
      "Brown beef in butter, remove and set aside",
      "Sauté onions and mushrooms in same pan",
      "Add beef broth and bring to simmer",
      "Return beef to pan",
      "Stir in sour cream and mustard",
      "Cook egg noodles according to package",
      "Serve beef stroganoff over noodles, garnish with parsley"
    ],
    cookingTime: 35,
    servings: 4,
    difficulty: "Medium",
    cuisine: "Russian",
    calories: 620,
    nutrition: {
      protein: "38g",
      carbs: "52g",
      fat: "28g",
      fiber: "4g"
    }
  },
  {
    id: "sample-42",
    title: "Chicken Caesar Wrap",
    description: "Grilled chicken wrap with Caesar dressing",
    ingredients: [
      "4 large flour tortillas",
      "500g chicken breast, grilled",
      "Romaine lettuce, chopped",
      "1/2 cup Caesar dressing",
      "1/2 cup parmesan cheese, shaved",
      "1 cup croutons, crushed",
      "2 tomatoes, diced",
      "Black pepper",
      "Lemon juice"
    ],
    instructions: [
      "Grill chicken breast and slice into strips",
      "Warm tortillas briefly",
      "Spread Caesar dressing on each tortilla",
      "Layer lettuce, chicken, tomatoes, and parmesan",
      "Sprinkle crushed croutons on top",
      "Season with black pepper and lemon juice",
      "Roll tightly, tucking in sides",
      "Cut in half diagonally and serve"
    ],
    cookingTime: 20,
    servings: 4,
    difficulty: "Easy",
    cuisine: "American",
    calories: 480,
    nutrition: {
      protein: "38g",
      carbs: "42g",
      fat: "18g",
      fiber: "4g"
    }
  },
  {
    id: "sample-43",
    title: "Moussaka",
    description: "Greek layered eggplant casserole",
    ingredients: [
      "3 large eggplants, sliced",
      "500g ground lamb or beef",
      "2 onions, chopped",
      "3 tomatoes, chopped",
      "2 cups béchamel sauce",
      "1 cup parmesan cheese",
      "4 cloves garlic, minced",
      "Cinnamon - 1 tsp",
      "Olive oil",
      "Salt and pepper"
    ],
    instructions: [
      "Slice eggplants, salt, and let drain for 30 minutes",
      "Brush with olive oil and grill or bake until golden",
      "Brown meat with onions and garlic",
      "Add tomatoes and cinnamon, simmer for 20 minutes",
      "Layer eggplant and meat sauce in baking dish",
      "Top with béchamel sauce and parmesan",
      "Bake at 350°F for 45 minutes until golden",
      "Let rest for 15 minutes before serving"
    ],
    cookingTime: 120,
    servings: 6,
    difficulty: "Hard",
    cuisine: "Greek",
    calories: 520,
    nutrition: {
      protein: "28g",
      carbs: "32g",
      fat: "32g",
      fiber: "8g"
    }
  }
]