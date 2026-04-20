import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import MenuItemManagement from "@/components/admin/MenuItemManagement";

const { requestMock, toastMock } = vi.hoisted(() => ({
  requestMock: vi.fn(),
  toastMock: vi.fn(),
}));

vi.mock("@/lib/mongodb-client", () => ({
  mongoClient: {
    request: requestMock,
  },
}));

vi.mock("@/hooks/use-toast", () => ({
  toast: toastMock,
}));

vi.mock("@/components/admin/CreateMenuItemModal", () => ({
  default: ({ isOpen }: { isOpen: boolean }) =>
    isOpen ? <div>Create Menu Modal</div> : null,
}));

vi.mock("@/components/admin/EditMenuItemModal", () => ({
  default: ({ isOpen }: { isOpen: boolean }) =>
    isOpen ? <div>Edit Menu Modal</div> : null,
}));

vi.mock("@/components/admin/DiscountModal", () => ({
  default: ({ isOpen }: { isOpen: boolean }) =>
    isOpen ? <div>Discount Modal</div> : null,
}));

const menuItems = [
  {
    _id: "item-1",
    name: "Chicken Tikka",
    category: "Main",
    description: "Smoky chicken",
    price: 900,
    is_available: true,
    discount_percentage: 0,
  },
  {
    _id: "item-2",
    name: "Mint Raita",
    category: "Side",
    description: "Cool yogurt",
    price: 200,
    is_available: false,
    discount_percentage: 10,
    original_price: 220,
  },
];

describe("MenuItemManagement", () => {
  beforeEach(() => {
    requestMock.mockReset();
    toastMock.mockReset();
    vi.stubGlobal("confirm", vi.fn(() => true));
  });

  it("filters menu items by search text", async () => {
    const user = userEvent.setup();

    render(
      <MenuItemManagement
        restaurantId="rest-1"
        menuItems={menuItems}
        onUpdate={vi.fn()}
      />,
    );

    await user.type(screen.getByPlaceholderText(/search menu items/i), "raita");

    expect(screen.getByText("Mint Raita")).toBeInTheDocument();
    expect(screen.queryByText("Chicken Tikka")).not.toBeInTheDocument();
  });

  it("deletes an item and triggers refresh callback", async () => {
    const user = userEvent.setup();
    const onUpdate = vi.fn();
    requestMock.mockResolvedValue({});

    render(
      <MenuItemManagement
        restaurantId="rest-1"
        menuItems={menuItems}
        onUpdate={onUpdate}
      />,
    );

    const chickenCardTitle = screen.getByText("Chicken Tikka");
    const chickenCard = chickenCardTitle.closest("div[class*='p-4']");
    const cardButtons = chickenCard ? chickenCard.querySelectorAll("button") : [];
    await user.click(cardButtons[2] as HTMLButtonElement);

    await waitFor(() => {
      expect(requestMock).toHaveBeenCalledWith("/restaurants/admin/menu/item-1", {
        method: "DELETE",
      });
      expect(onUpdate).toHaveBeenCalledTimes(1);
    });
  });
});
