import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { MembershipPage } from "./membership-page";
import type { ActiveSubscription, MembershipPlan, SubscriptionEvent } from "@/lib/api";

const {
  listPlans,
  getMySubscription,
  listSubscriptionEvents,
  cancelSubscription,
  resumeSubscription,
  startSubscription,
  navigate
} = vi.hoisted(() => ({
  listPlans: vi.fn(),
  getMySubscription: vi.fn(),
  listSubscriptionEvents: vi.fn(),
  cancelSubscription: vi.fn(),
  resumeSubscription: vi.fn(),
  startSubscription: vi.fn(),
  navigate: vi.fn()
}));

vi.mock("@/lib/api", () => ({
  api: {
    listPlans,
    getMySubscription,
    listSubscriptionEvents,
    cancelSubscription,
    resumeSubscription,
    startSubscription
  }
}));

vi.mock("@/lib/nav", () => ({
  navigate
}));

const SAMPLE_PLAN: MembershipPlan = {
  id: "plan-single",
  name: "Single basis",
  audience: "single",
  monthly_price_cents: 14900,
  intro_price_cents: null,
  intro_months: 0,
  trial_days: 0
};

const ACTIVE_SUBSCRIPTION: ActiveSubscription = {
  id: "sub-1",
  user_id: "u1",
  plan_id: "plan-single",
  status: "active",
  current_period_start: "2026-05-01T00:00:00Z",
  current_period_end: "2026-06-01T00:00:00Z",
  cancel_at_period_end: false,
  cancelled_at: null,
  trial_ends_at: null,
  invoice_descriptor: "GLOEDDK"
};

describe("MembershipPage", () => {
  beforeEach(() => {
    listPlans.mockResolvedValue({
      ok: true,
      audience: "single",
      has_couple: false,
      plans: [SAMPLE_PLAN]
    });
    listSubscriptionEvents.mockResolvedValue({ ok: true, events: [] });
  });

  afterEach(() => {
    cleanup();
    listPlans.mockReset();
    getMySubscription.mockReset();
    listSubscriptionEvents.mockReset();
    cancelSubscription.mockReset();
    resumeSubscription.mockReset();
    startSubscription.mockReset();
    navigate.mockReset();
  });

  it("opens cancel dialog and shows end date for active subscription", async () => {
    getMySubscription.mockResolvedValue({
      ok: true,
      subscription: ACTIVE_SUBSCRIPTION,
      plan: SAMPLE_PLAN
    });

    render(<MembershipPage />);

    await waitFor(() =>
      expect(screen.getByTestId("open-cancel-subscription")).toBeInTheDocument()
    );

    fireEvent.click(screen.getByTestId("open-cancel-subscription"));

    await waitFor(() =>
      expect(screen.getByTestId("cancel-subscription-dialog")).toBeInTheDocument()
    );

    // C28: dialog viser eksplicit hvornår adgangen stopper.
    const dialog = screen.getByTestId("cancel-subscription-dialog");
    expect(dialog.textContent).toMatch(/Abonnementet stopper/);
    expect(dialog.textContent).toMatch(/1\.6\.2026|1\/6\/2026|01\.06\.2026/);

    // Bekræftelses-knap er distinkt fra "Fortsæt abonnement".
    const confirm = screen.getByTestId("confirm-cancel-subscription");
    expect(confirm).toHaveTextContent(/Annullér ved periodens udløb/);

    // B37: ingen env-var-navne i UI.
    expect(screen.queryByText(/STRIPE_SECRET_KEY/)).toBeNull();
    expect(screen.queryByText(/STRIPE_WEBHOOK_SECRET/)).toBeNull();
  });

  it("renders subscription events list with danish labels", async () => {
    getMySubscription.mockResolvedValue({
      ok: true,
      subscription: ACTIVE_SUBSCRIPTION,
      plan: SAMPLE_PLAN
    });
    const events: SubscriptionEvent[] = [
      {
        id: "ev-1",
        subscription_id: "sub-1",
        event_type: "subscription_started",
        amount_cents: 14900,
        occurred_at: "2026-05-01T08:00:00Z",
        metadata_json: {}
      },
      {
        id: "ev-2",
        subscription_id: "sub-1",
        event_type: "payment_succeeded",
        amount_cents: 14900,
        occurred_at: "2026-05-02T08:00:00Z",
        metadata_json: {}
      }
    ];
    listSubscriptionEvents.mockResolvedValue({ ok: true, events });

    render(<MembershipPage />);

    await waitFor(() =>
      expect(screen.getByTestId("subscription-events")).toBeInTheDocument()
    );

    const section = screen.getByTestId("subscription-events");
    expect(section).toHaveTextContent("Abonnement startet");
    expect(section).toHaveTextContent("Betaling gennemført");
    expect(section).toHaveTextContent(/149\s?kr\./);
  });

  it("shows trial-specific cancel copy for trialing subscriptions", async () => {
    const trialSub: ActiveSubscription = {
      ...ACTIVE_SUBSCRIPTION,
      status: "trialing",
      trial_ends_at: "2026-05-15T00:00:00Z"
    };
    getMySubscription.mockResolvedValue({
      ok: true,
      subscription: trialSub,
      plan: { ...SAMPLE_PLAN, trial_days: 14 }
    });

    render(<MembershipPage />);

    await waitFor(() =>
      expect(screen.getByTestId("open-cancel-subscription")).toBeInTheDocument()
    );
    fireEvent.click(screen.getByTestId("open-cancel-subscription"));

    await waitFor(() =>
      expect(screen.getByTestId("cancel-subscription-dialog")).toBeInTheDocument()
    );

    const dialog = screen.getByTestId("cancel-subscription-dialog");
    expect(dialog.textContent).toMatch(/prøveperiode/i);
    expect(dialog.textContent).toMatch(/stopper adgangen umiddelbart/i);

    const confirm = screen.getByTestId("confirm-cancel-subscription");
    expect(confirm).toHaveTextContent(/Annullér prøveperiode/);
  });

  it("hides events section when there are no events", async () => {
    getMySubscription.mockResolvedValue({
      ok: true,
      subscription: ACTIVE_SUBSCRIPTION,
      plan: SAMPLE_PLAN
    });
    listSubscriptionEvents.mockResolvedValue({ ok: true, events: [] });

    render(<MembershipPage />);

    await waitFor(() =>
      expect(screen.getByText(/Dit medlemskab/)).toBeInTheDocument()
    );
    expect(screen.queryByTestId("subscription-events")).toBeNull();
  });
});
