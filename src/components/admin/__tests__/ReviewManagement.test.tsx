import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ReviewManagement from "@/components/admin/ReviewManagement";

const { requestMock, toastMock } = vi.hoisted(() => ({
  requestMock: vi.fn(),
  toastMock: vi.fn(),
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    user: { email: "alinarafiq0676@gmail.com" },
  }),
}));

vi.mock("@/lib/mongodb-client", () => ({
  mongoClient: {
    request: requestMock,
  },
}));

vi.mock("@/hooks/use-toast", () => ({
  toast: toastMock,
}));

const reviews = [
  {
    _id: "review-1",
    rating: 4,
    review_text: "Great food",
    created_at: "2026-04-20T10:00:00.000Z",
    user_name: "Ali",
  },
];

const menuReviews = [
  {
    _id: "menu-review-1",
    menu_item_id: "item-1",
    rating: 2,
    review_text: "Too salty",
    created_at: "2026-04-20T10:00:00.000Z",
    user_name: "Sara",
  },
];

describe("ReviewManagement", () => {
  beforeEach(() => {
    requestMock.mockReset();
    toastMock.mockReset();
    vi.stubGlobal("confirm", vi.fn(() => true));
  });

  it("renders both review tabs and their counts", async () => {
    const user = userEvent.setup();

    render(
      <ReviewManagement
        restaurantId="rest-1"
        reviews={reviews}
        menuReviews={menuReviews}
        onUpdate={vi.fn()}
      />,
    );

    expect(screen.getByRole("tab", { name: /restaurant reviews/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /menu item reviews/i })).toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: /menu item reviews/i }));
    expect(screen.getByText("Too salty")).toBeInTheDocument();
  });

  it("submits a report for a review", async () => {
    const user = userEvent.setup();
    const onUpdate = vi.fn();
    requestMock.mockResolvedValue({});

    render(
      <ReviewManagement
        restaurantId="rest-1"
        reviews={reviews}
        menuReviews={menuReviews}
        onUpdate={onUpdate}
      />,
    );

    await user.click(screen.getByRole("button", { name: /report/i }));
    await user.type(screen.getByPlaceholderText(/enter reason for reporting/i), "Abusive language");
    await user.click(screen.getByRole("button", { name: /submit report/i }));

    await waitFor(() => {
      expect(requestMock).toHaveBeenCalledWith("/restaurants/admin/report", {
        method: "POST",
        body: JSON.stringify({
          review_id: "review-1",
          report_type: "restaurant_review",
          reason: "Abusive language",
          restaurant_id: "rest-1",
        }),
      });
      expect(onUpdate).toHaveBeenCalledTimes(1);
    });
  });
});
