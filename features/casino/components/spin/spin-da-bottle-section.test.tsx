import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SpinDaBottleSection } from "./spin-da-bottle-section";

const mockGame = vi.hoisted(() => ({
  rules: {
    currency: "USDC",
    currencyDecimalPlaces: 6,
    minimumAmount: "0.1",
    maximumStake: "20000",
  },
  balance: { currency: "USDC", available: "15.76" },
  history: [],
  authenticated: true,
  authReady: true,
  profile: { name: "Ogenakoghie", email: "", avatarSeed: "player-1" },
  login: vi.fn(),
  play: vi.fn(),
  verify: vi.fn(),
  pending: false,
  verifying: false,
  loading: false,
  error: null,
  refetchHistory: vi.fn(),
}));

const mockChat = vi.hoisted(() => ({
  items: [],
  onlineCount: 1,
  loading: false,
  error: null,
  send: vi.fn(),
  sending: false,
  toggleLike: vi.fn(),
}));

vi.mock("@/features/casino/hooks/use-spin-da-bottle", () => ({
  useSpinDaBottle: () => mockGame,
}));

vi.mock("@/features/casino/hooks/use-spin-comments", () => ({
  useSpinComments: () => mockChat,
}));

vi.mock("@/features/casino/components/arkjet/arkjet-cashier", () => ({
  ArkjetCashier: () => <div>Cashier</div>,
}));

vi.mock("@/components/ui/square-avatar", () => ({
  SquareAvatar: () => <span aria-hidden />,
}));

describe("SpinDaBottleSection", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    Object.defineProperty(window, "innerWidth", { configurable: true, value: 1024 });
    Object.defineProperty(window, "innerHeight", { configurable: true, value: 768 });
  });

  it("opens directly on the betting screen without the rejected onboarding", () => {
    render(<SpinDaBottleSection />);

    expect(screen.getByRole("main", { name: "Spin da' Bottle" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "UP" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "DOWN" })).toBeInTheDocument();
    expect(screen.queryByText("GAMES")).toBeNull();
    expect(screen.queryByText("Skip")).toBeNull();
    expect(screen.queryByText("Play Now")).toBeNull();
  });

  it("fills a phone's width while preserving the 360 by 640 game ratio", () => {
    Object.defineProperty(window, "innerWidth", { configurable: true, value: 390 });
    Object.defineProperty(window, "innerHeight", { configurable: true, value: 844 });

    render(<SpinDaBottleSection />);

    const game = screen.getByRole("main", { name: "Spin da' Bottle" });
    const frame = game.parentElement;
    expect(frame).not.toBeNull();
    expect(Number.parseFloat(frame?.style.width ?? "0")).toBeCloseTo(390, 3);
    expect(Number.parseFloat(frame?.style.height ?? "0")).toBeCloseTo(693.33, 1);
  });

  it("keeps only How to Play in the game drawer", () => {
    render(<SpinDaBottleSection />);
    fireEvent.click(screen.getByRole("button", { name: "Open game menu" }));

    expect(screen.getByText("Ogenakoghie")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "How to Play" })).toBeInTheDocument();
    expect(screen.queryByText("Music")).toBeNull();
    expect(screen.queryByText("Sound")).toBeNull();
    expect(screen.queryByText("One-Tap Bet")).toBeNull();
    expect(screen.queryByText("Bet History")).toBeNull();
    expect(screen.queryByText("Provably Fair")).toBeNull();
  });

  it("uses a reachable 20K maximum stake preset independent of wallet balance", () => {
    render(<SpinDaBottleSection />);

    expect(screen.getByText("Max : 20K")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Set bet to 20K" }));
    expect(screen.getByLabelText("Bet amount")).toHaveValue("20000.00");
    fireEvent.click(screen.getByRole("button", { name: "UP" }));
    expect(screen.getByText("Bet amount exceeds wallet balance.")).toBeInTheDocument();
  });

  it("opens the exact How to Play flow from the drawer", () => {
    render(<SpinDaBottleSection />);
    fireEvent.click(screen.getByRole("button", { name: "Open game menu" }));
    fireEvent.click(screen.getByRole("button", { name: "How to Play" }));

    expect(screen.getByRole("heading", { name: "About Spin da' Bottle" })).toBeInTheDocument();
    expect(screen.getByText(/Each winning turn pays DOUBLE \(2X\)/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Close how to play" })).toBeInTheDocument();
  });

  it("opens the referenced live chat sheet without hardcoded screenshot messages", () => {
    render(<SpinDaBottleSection />);
    fireEvent.click(screen.getByRole("button", { name: "Open chat" }));

    expect(screen.getByRole("dialog", { name: "Chat" })).toBeInTheDocument();
    expect(screen.getByText("No messages yet. Start the conversation.")).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Chat message" })).toHaveAttribute(
      "maxlength",
      "160"
    );
    expect(screen.queryByText(/WhatsApp/i)).toBeNull();
  });
});
