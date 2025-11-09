import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { ingredients, cuisine, maxCalories, servings, difficulty } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("Missing LOVABLE_API_KEY");
      return new Response(JSON.stringify({ error: "AI is not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Determine if we should generate multiple recipes
    const shouldGenerateMultiple = !cuisine || cuisine === "";
    const recipeCount = shouldGenerateMultiple ? 3 : 1;

    // Build OpenAI-compatible payload with function calling to ensure structured JSON
    const body: any = {
      // Default to google/gemini-2.5-flash (fast + free this week per workspace notice)
      // model: "google/gemini-2.5-flash",
      messages: [
        {
          role: "system",
          content:
            "You are a culinary AI that generates realistic, clear, and delicious recipes. Return results via function call only. Keep answers concise and practical.",
        },
        {
          role: "user",
          content: [
            shouldGenerateMultiple 
              ? `Create ${recipeCount} different, creative recipes based on:`
              : `Create a detailed recipe based on:`,
            `Ingredients: ${Array.isArray(ingredients) ? ingredients.join(', ') : ''}`,
            cuisine ? `Cuisine: ${cuisine}` : "",
            typeof maxCalories === "number" ? `Max calories: ${maxCalories}` : "",
            typeof servings === "number" ? `Servings: ${servings}` : "",
            difficulty ? `Difficulty: ${difficulty}` : "",
            "Constraints:",
            "- Use as many provided ingredients as possible",
            shouldGenerateMultiple ? "- Create diverse recipes with different cuisines and cooking methods" : "",
            "- Include realistic cooking times and nutrition",
            "- Clear step-by-step instructions",
            "- Fit cuisine style and calorie limit when provided",
          ]
            .filter(Boolean)
            .join("\n"),
        },
      ],
      tools: [
        {
          type: "function",
          function: {
            name: shouldGenerateMultiple ? "return_multiple_recipes" : "return_recipe",
            description: shouldGenerateMultiple 
              ? `Return ${recipeCount} different, complete recipes matching the user's constraints.`
              : "Return a single, complete recipe matching the user's constraints.",
            parameters: {
              type: "object",
              properties: shouldGenerateMultiple ? {
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
                        description: "Array of ingredient strings including amounts",
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
                  minItems: recipeCount,
                  maxItems: recipeCount,
                }
              } : {
                title: { type: "string" },
                description: { type: "string" },
                ingredients: {
                  type: "array",
                  items: { type: "string" },
                  description: "Array of ingredient strings including amounts",
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
              required: shouldGenerateMultiple ? ["recipes"] : [
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
        function: { name: shouldGenerateMultiple ? "return_multiple_recipes" : "return_recipe" } 
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
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required, please add funds to your Lovable AI workspace." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
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
    const toolCall = json?.choices?.[0]?.message?.tool_calls?.[0];
    const argsStr = toolCall?.function?.arguments;

    if (!argsStr) {
      console.error("No tool call returned:", JSON.stringify(json));
      return new Response(JSON.stringify({ error: "Invalid AI response" }), {
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

    // Process recipes based on whether we generated multiple or single
    const processRecipe = (recipe: any, index: number) => ({
      id: `${Date.now()}-${index}`,
      title: String(recipe.title || "Untitled Recipe"),
      description: String(recipe.description || ""),
      ingredients: Array.isArray(recipe.ingredients) ? recipe.ingredients.map(String) : [],
      instructions: Array.isArray(recipe.instructions) ? recipe.instructions.map(String) : [],
      cookingTime: Number(recipe.cookingTime || 0),
      servings: Number(recipe.servings || (typeof servings === "number" ? servings : 2)),
      difficulty: (recipe.difficulty === "Easy" || recipe.difficulty === "Medium" || recipe.difficulty === "Hard")
        ? recipe.difficulty
        : "Easy",
      cuisine: String(recipe.cuisine || cuisine || ""),
      calories: Number(recipe.calories || 0),
      nutrition: recipe.nutrition ? {
        protein: String(recipe.nutrition.protein || "0g"),
        carbs: String(recipe.nutrition.carbs || "0g"),
        fat: String(recipe.nutrition.fat || "0g"),
        fiber: String(recipe.nutrition.fiber || "0g"),
      } : undefined,
    });

    if (shouldGenerateMultiple && Array.isArray(parsedData.recipes)) {
      const safeRecipes = parsedData.recipes.map((r: any, i: number) => processRecipe(r, i));
      return new Response(JSON.stringify({ recipes: safeRecipes }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } else {
      const safeRecipe = processRecipe(parsedData, 0);
      return new Response(JSON.stringify({ recipe: safeRecipe }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  } catch (e) {
    console.error("generate-recipe error:", e);
    const message = e instanceof Error ? e.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});