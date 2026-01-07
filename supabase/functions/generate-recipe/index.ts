
declare const Deno: {
  env: { get(key: string): string | undefined };
  serve:  (handler: (req: Request) => Response | Promise<Response>) => void;
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface IngredientValidationResult {
  validIngredients: string[];
  invalidIngredients: string[];
  validationPercentage: number;
}

// Helper function to detect obvious gibberish using multiple heuristics
const isLikelyGibberish = (text: string): boolean => {
  const trimmed = text.toLowerCase().trim();
  
  // Heuristic 1: Too short and not a common food
  if (trimmed.length < 3) {
    const commonShortFoods = ['egg', 'tea', 'pea', 'rye', 'oats', 'fig', 'yam', 'nut', 'pea'];
    return !commonShortFoods.includes(trimmed);
  }
  
  // Heuristic 2: Repeated character patterns (like "sffds", "strt")
  const hasRepeatingPattern = /(.)\1{2,}/.test(trimmed); // 3+ repeating chars
  const hasAlternatingPattern = /(..)\1{2,}/.test(trimmed); // 3+ repeating pairs
  
  // Heuristic 3: Unusual consonant clusters
  const unusualConsonantClusters = /[^aeiou]{4,}/i.test(trimmed); // 4+ consecutive consonants
  
  // Heuristic 4: Looks like random typing (mixed case in strange ways)
  const hasMixedCaseWeirdness = /^[a-z]+[A-Z][a-z]+$/.test(text) && !/[aeiou]/i.test(text);
  
  // Heuristic 5: No vowels or all vowels
  const noVowels = !/[aeiou]/i.test(trimmed) && trimmed.length > 2;
  const allVowels = /^[aeiou]+$/i.test(trimmed) && trimmed.length > 3;
  
  // Heuristic 6: Common gibberish patterns from your examples
  const commonGibberishPatterns = [
    /^s[trf]{3,}$/i, // Starts with s followed by t/r/f repeats
    /^[strf]{4,}$/i, // Only s,t,r,f characters
    /^.*(ff|tt|rr|ss){2,}.*$/i, // Double letters in patterns
  ];
  
  const matchesGibberishPattern = commonGibberishPatterns.some(pattern => pattern.test(trimmed));
  
  return hasRepeatingPattern || 
         hasAlternatingPattern || 
         unusualConsonantClusters || 
         hasMixedCaseWeirdness || 
         noVowels || 
         allVowels || 
         matchesGibberishPattern;
};

const validateIngredientsWithAI = async (
  ingredients: string[],
  apiKey: string
): Promise<IngredientValidationResult> => {
  // Phase 1: Filter out obvious gibberish
  const obviouslyGibberish: string[] = [];
  const potentiallyValid: string[] = [];
  
  for (const ing of ingredients) {
    if (isLikelyGibberish(ing)) {
      obviouslyGibberish.push(ing);
    } else {
      potentiallyValid.push(ing);
    }
  }
  
  console.log("Phase 1 - Obvious gibberish filtered:", obviouslyGibberish);
  console.log("Phase 1 - Potentially valid:", potentiallyValid);
  
  // If all ingredients are obviously gibberish, return immediately
  if (potentiallyValid.length === 0) {
    return {
      validIngredients: [],
      invalidIngredients: ingredients,
      validationPercentage: 0
    };
  }
  
  // Phase 2: AI validation for remaining ingredients
  const validationBody = {
    messages: [
      {
        role: "system",
        content: 
          `You are an ULTRA-STRICT food ingredient validator. Your ONLY job is to identify REAL, EDIBLE food items.

STRICT RULES:
1. ACCEPT ONLY if: It's 100% clearly a food ingredient (e.g., "chicken", "potato", "onion", "rice")
2. ACCEPT language variations ONLY if they're COMMON food names (e.g., "aloo" for potato, "piyaz" for onion)
3. REJECT ANYTHING that:
   - Looks like random typing (e.g., "sffds", "strt", "srtsrtset")
   - Has unusual letter combinations not found in real food words
   - You're not 100% certain is a food item
   - Doesn't sound like something you'd find in a kitchen
   - It must be edible by humans
EXAMPLES TO REJECT:
- "sffds" → REJECT (random typing)
- "strt" → REJECT (nonsense)
- "srtsrtset" → REJECT (gibberish)
- "hfjef" → REJECT (not a food)
- "IEJFeKJD" → REJECT (keyboard mashing)

Return ONLY the ingredients that are definitely real food items.`,
      },
      {
        role: "user",
        content: `Validate these ingredients. Return ONLY the ones that are DEFINITELY real, edible food items: ${potentiallyValid.join(", ")}`,
      },
    ],
    tools: [
      {
        type: "function",
        function: {
          name: "validate_ingredients",
          description: "Return ONLY ingredients that are definitely real, edible food items.",
          parameters: {
            type: "object",
            properties:  {
              validIngredients: {
                type: "array",
                items: { type: "string" },
                description: "ONLY ingredients that are 100% definitely real, edible food items",
              },
              rejectedIngredients: {
                type:  "array",
                items: { type: "string" },
                description: "Ingredients that are NOT real food items or are questionable",
              },
            },
            required: ["validIngredients", "rejectedIngredients"],
            additionalProperties: false,
          },
        },
      },
    ],
    tool_choice:  {
      type: "function",
      function: { name: "validate_ingredients" },
    },
  };

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(validationBody),
  });

  if (!response.ok) {
    throw new Error(`Validation failed: ${response.status}`);
  }

  const json = await response.json();
  const toolCall = json?.choices?.[0]?.message?.tool_calls?.[0];
  const argsStr = toolCall?.function?.arguments;

  if (!argsStr) {
    throw new Error("Invalid validation response");
  }

  const validationData = JSON.parse(argsStr);
  
  // Combine Phase 1 and Phase 2 results
  const allValid = validationData.validIngredients || [];
  const allInvalid = [...obviouslyGibberish, ...(validationData.rejectedIngredients || [])];
  
  const validCount = allValid.length;
  const totalCount = ingredients.length;
  const validationPercentage = totalCount > 0 ? (validCount / totalCount) * 100 : 0;

  console.log("Final validation:", {
    valid: allValid,
    invalid: allInvalid,
    percentage: validationPercentage
  });

  return {
    validIngredients: allValid,
    invalidIngredients: allInvalid,
    validationPercentage
  };
};

Deno.serve(async (req:  Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { ingredients, cuisine, maxCalories, servings, difficulty } = await req.json();

    if (!Array.isArray(ingredients)) {
      return new Response(
        JSON.stringify({ error: "Ingredients must be provided as an array." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const cleanedIngredients = ingredients
      .map((item) => (typeof item === "string" ? item :  String(item ??  "")))
      .map((item) => item.trim())
      .filter((item) => item.length > 0);

    if (cleanedIngredients.length === 0) {
      return new Response(
        JSON.stringify({ error: "Please provide at least one ingredient." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("Missing LOVABLE_API_KEY");
      return new Response(JSON.stringify({ error: "AI is not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Step 1: Validate ingredients using AI with strict filtering
    console.log("Validating ingredients with strict AI validation...");
    let validationResult: IngredientValidationResult;
    
    try {
      validationResult = await validateIngredientsWithAI(cleanedIngredients, LOVABLE_API_KEY);
    } catch (error) {
      console.error("Ingredient validation error:", error);
      return new Response(
        JSON.stringify({ error: "Failed to validate ingredients. Please try again." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Validation result:", validationResult);

    // Step 2: STRICT 70% RULE - If less than 70% valid, REJECT
    if (validationResult.validationPercentage < 70) {
      const errorDetails = validationResult.invalidIngredients.length > 0 
        ? `Invalid ingredients: ${validationResult.invalidIngredients.slice(0, 5).join(", ")}${validationResult.invalidIngredients.length > 5 ? `... (${validationResult.invalidIngredients.length} total)` : ''}`
        : 'No valid ingredients detected';
      
      return new Response(
        JSON.stringify({ 
          error: `Cannot generate recipes. Only ${Math.round(validationResult.validationPercentage)}% of your ingredients are valid (need at least 70%). ${errorDetails}`,
          validIngredients: validationResult.validIngredients,
          invalidIngredients: validationResult.invalidIngredients,
          validationPercentage: validationResult.validationPercentage
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Step 3: Additional check - need minimum number of valid ingredients
    const MIN_VALID_INGREDIENTS = 2;
    if (validationResult.validIngredients.length < MIN_VALID_INGREDIENTS) {
      return new Response(
        JSON.stringify({ 
          error: `Need at least ${MIN_VALID_INGREDIENTS} valid ingredients to generate recipes. You have only ${validationResult.validIngredients.length} valid ingredient(s).`,
          validIngredients: validationResult.validIngredients,
          invalidIngredients: validationResult.invalidIngredients,
          validationPercentage: validationResult.validationPercentage
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Step 4: Generate recipes ONLY if we have valid ingredients
    const shouldGenerateMultiple = !cuisine || cuisine === "";
    const recipeCount = shouldGenerateMultiple ? 3 : 1;

    const recipeGenerationPrompt = `Create ${recipeCount} recipe(s) using ONLY these exact ingredients: ${validationResult.validIngredients.join(", ")}.

ABSOLUTELY CRITICAL RULES:
1. You MUST use ONLY these ingredients: ${validationResult.validIngredients.join(", ")}
2. DO NOT add any other ingredients
3. DO NOT substitute or interpret ingredients
4. ONLY allow: salt, pepper, water, cooking oil (if explicitly mentioned in recipe)
5. If you cannot create a recipe with ONLY these ingredients, respond with: "ERROR: Cannot generate recipe with given ingredients"

Example scenarios:
- Input: ["chicken", "rice", "onion"] → OK to generate recipes
- Input: ["sffds", "strt"] → RESPOND WITH ERROR (these are not real ingredients)
- Input: ["chicken"] → RESPOND WITH ERROR (need more ingredients)

Current valid ingredients: ${validationResult.validIngredients.join(", ")}`;

    const body: Record<string, unknown> = {
      messages: [
        {
          role: "system",
          content: 
            `You are a recipe generator with ABSOLUTELY STRICT rules:
1. ONLY use the ingredients provided in the list
2. NEVER add, invent, or substitute ingredients
3. If ingredients are insufficient or invalid, respond with "ERROR: [reason]"
4. Only generate recipes if you have REAL food ingredients
5. Return via function call only if you can generate valid recipes, otherwise return error in content`,
        },
        {
          role: "user",
          content: recipeGenerationPrompt
        },
      ],
      tools: [
        {
          type: "function",
          function: {
            name: shouldGenerateMultiple ? "return_multiple_recipes" : "return_recipe",
            description: `Return recipe(s) using ONLY the provided ingredients. If insufficient, DO NOT use this function.`,
            parameters: {
              type: "object",
              properties: shouldGenerateMultiple
                ? {
                    recipes: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          title: { type: "string" },
                          description: { type: "string" },
                          ingredients: {
                            type: "array",
                            items: { type: "string" },
                            description: "MUST only include ingredients from the provided list plus salt/pepper/water/oil",
                          },
                          instructions: {
                            type: "array",
                            items: { type: "string" },
                            description: "Step-by-step instructions",
                          },
                          cookingTime: { type: "number", description: "Minutes total" },
                          servings: { type: "number" },
                          difficulty: { type: "string", enum: ["Easy", "Medium", "Hard"] },
                          cuisine: { type: "string" },
                          calories: { type: "number" },
                          nutrition: {
                            type: "object",
                            properties: {
                              protein: { type: "string" },
                              carbs: { type: "string" },
                              fat: { type: "string" },
                              fiber: { type: "string" },
                            },
                            additionalProperties: false,
                          },
                        },
                        required: [
                          "title",
                          "description",
                          "ingredients",
                          "instructions",
                          "cookingTime",
                          "servings",
                          "difficulty",
                          "cuisine",
                          "calories",
                        ],
                        additionalProperties: false,
                      },
                    },
                  }
                : {
                    title: { type: "string" },
                    description: { type: "string" },
                    ingredients: {
                      type: "array",
                      items: { type: "string" },
                      description: "MUST only include ingredients from the provided list plus salt/pepper/water/oil",
                    },
                    instructions: {
                      type: "array",
                      items: { type: "string" },
                      description: "Step-by-step instructions",
                    },
                    cookingTime: { type: "number", description: "Minutes total" },
                    servings: { type: "number" },
                    difficulty: { type: "string", enum: ["Easy", "Medium", "Hard"] },
                    cuisine: { type: "string" },
                    calories: { type: "number" },
                    nutrition: {
                      type: "object",
                      properties: {
                        protein: { type: "string" },
                        carbs: { type: "string" },
                        fat: { type: "string" },
                        fiber: { type: "string" },
                      },
                      additionalProperties: false,
                    },
                  },
              required: shouldGenerateMultiple
                ? ["recipes"]
                : [
                    "title",
                    "description",
                    "ingredients",
                    "instructions",
                    "cookingTime",
                    "servings",
                    "difficulty",
                    "cuisine",
                    "calories",
                  ],
              additionalProperties: false,
            },
          },
        },
      ],
      tool_choice: {
        type: "function",
        function: { name: shouldGenerateMultiple ? "return_multiple_recipes" : "return_recipe" },
      },
    };

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limits exceeded, please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required, please add funds to your Lovable AI workspace." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const json = await response.json();
    const responseText = json?.choices?.[0]?.message?.content || "";
    
    // Check if the AI responded with an error
    if (responseText.includes("ERROR:") || 
        responseText.includes("Cannot generate") || 
        responseText.includes("insufficient") ||
        responseText.toLowerCase().includes("invalid")) {
      
      return new Response(
        JSON.stringify({ 
          error: `Cannot generate recipes: ${responseText.replace("ERROR:", "").trim() || "Invalid ingredients provided"}`,
          validIngredients: validationResult.validIngredients,
          invalidIngredients: validationResult.invalidIngredients,
          validationPercentage: validationResult.validationPercentage
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const toolCall = json?.choices?.[0]?.message?.tool_calls?.[0];
    
    // If no tool call, check if it's because ingredients were invalid
    if (!toolCall) {
      return new Response(
        JSON.stringify({ 
          error: "Cannot generate recipes with these ingredients. The AI refused to generate recipes, likely due to invalid ingredients.",
          validIngredients: validationResult.validIngredients,
          invalidIngredients: validationResult.invalidIngredients,
          validationPercentage: validationResult.validationPercentage
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const argsStr = toolCall?.function?.arguments;

    if (!argsStr) {
      console.error("No function arguments in tool call:", JSON.stringify(json));
      return new Response(JSON.stringify({ error: "Invalid AI response format" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let parsedData;
    try {
      parsedData = JSON.parse(argsStr);
    } catch (e) {
      console.error("Failed to parse tool args:", argsStr);
      return new Response(JSON.stringify({ error: "Failed to parse AI output" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const processRecipe = (recipe: any, index: number) => ({
      id: `${Date.now()}-${index}`,
      title: String(recipe.title || "Untitled Recipe"),
      description: String(recipe.description || ""),
      ingredients: Array.isArray(recipe.ingredients) ? recipe.ingredients.map(String) : [],
      instructions: Array.isArray(recipe.instructions) ? recipe.instructions.map(String) : [],
      cookingTime: Number(recipe.cookingTime || 0),
      servings: Number(recipe.servings || (typeof servings === "number" ? servings : 2)),
      difficulty:
        recipe.difficulty === "Easy" || recipe.difficulty === "Medium" || recipe.difficulty === "Hard"
          ? recipe.difficulty
          : "Easy",
      cuisine: String(recipe.cuisine || cuisine || ""),
      calories: Number(recipe.calories || 0),
      nutrition: recipe.nutrition
        ? {
            protein: String(recipe.nutrition.protein || "0g"),
            carbs: String(recipe.nutrition.carbs || "0g"),
            fat: String(recipe.nutrition.fat || "0g"),
            fiber: String(recipe.nutrition.fiber || "0g"),
          }
        : undefined,
    });

    const responseData: any = shouldGenerateMultiple && Array.isArray(parsedData.recipes)
      ? {
          recipes: parsedData.recipes.map((r: any, i: number) => processRecipe(r, i)),
        }
      : {
          recipe: processRecipe(parsedData, 0),
        };

    // Add validation summary
    responseData.validationSummary = {
      totalIngredients: cleanedIngredients.length,
      validIngredients: validationResult.validIngredients,
      invalidIngredients: validationResult.invalidIngredients,
      validationPercentage: validationResult.validationPercentage,
      message: `Recipes generated using ${validationResult.validIngredients.length} valid ingredient(s).`
    };

    return new Response(JSON.stringify(responseData), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-recipe error:", e);
    const message = e instanceof Error ? e.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
