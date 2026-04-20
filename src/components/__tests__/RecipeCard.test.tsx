import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import RecipeCard, { type Recipe } from "@/components/RecipeCard";

const recipe: Recipe = {
  id: "recipe-1",
  title: "Chicken Karahi",
  description: "Rich and spicy Pakistani curry.",
  ingredients: ["Chicken", "Tomato", "Ginger", "Garlic", "Green chili"],
  instructions: ["Prep", "Cook", "Serve"],
  cookingTime: 45,
  servings: 4,
  difficulty: "Medium",
  cuisine: "Pakistani",
  calories: 520,
  nutrition: {
    protein: "30g",
    carbs: "12g",
    fat: "18g",
    fiber: "4g",
  },
};

describe("RecipeCard", () => {
  it("renders recipe details and condensed ingredients", () => {
    render(<RecipeCard recipe={recipe} onViewDetails={vi.fn()} />);

    expect(screen.getByText("Chicken Karahi")).toBeInTheDocument();
    expect(screen.getByText("Pakistani")).toBeInTheDocument();
    expect(screen.getByText("45m")).toBeInTheDocument();
    expect(screen.getByText("4 servings")).toBeInTheDocument();
    expect(screen.getByText("+1 more")).toBeInTheDocument();
    expect(screen.getByText("Protein: 30g")).toBeInTheDocument();
  });

  it("calls onViewDetails when button is clicked", async () => {
    const onViewDetails = vi.fn();
    const user = userEvent.setup();

    render(<RecipeCard recipe={recipe} onViewDetails={onViewDetails} />);

    await user.click(screen.getByRole("button", { name: /view full recipe/i }));

    expect(onViewDetails).toHaveBeenCalledTimes(1);
    expect(onViewDetails).toHaveBeenCalledWith(recipe);
  });
});
