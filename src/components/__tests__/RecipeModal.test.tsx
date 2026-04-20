import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import RecipeModal from "@/components/RecipeModal";
import type { Recipe } from "@/components/RecipeCard";

const recipe: Recipe = {
  id: "recipe-2",
  title: "Paneer Curry",
  description: "Creamy curry",
  ingredients: ["2 paneer cubes", "1 cup cream"],
  instructions: ["Cook onions", "Add paneer"],
  cookingTime: 30,
  servings: 2,
  difficulty: "Easy",
  cuisine: "Indian",
  calories: 200,
  nutrition: {
    protein: "15g",
    carbs: "20g",
    fat: "8g",
    fiber: "3g",
  },
};

describe("RecipeModal", () => {
  it("renders modal details and closes via button", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();

    render(<RecipeModal recipe={recipe} isOpen onClose={onClose} />);

    expect(screen.getByText("Paneer Curry")).toBeInTheDocument();
    expect(screen.getByText("Ingredients")).toBeInTheDocument();
    expect(screen.getByText("Instructions")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /close recipe/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("adjusts servings and recalculates numeric ingredient amounts", async () => {
    const user = userEvent.setup();

    render(<RecipeModal recipe={recipe} isOpen onClose={vi.fn()} />);

    const servingButtons = screen.getAllByRole("button").filter((button) => !button.textContent);
    await user.click(servingButtons[1]);

    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("3 paneer cubes")).toBeInTheDocument();
    expect(screen.getByText("300")).toBeInTheDocument();
  });
});
