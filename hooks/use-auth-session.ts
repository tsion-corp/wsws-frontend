"use client";

import { usePrivy } from "@privy-io/react-auth";
import { deriveProfile, getWalletAddress, type Profile } from "@/lib/user";

export interface AuthSession {
  ready: boolean;
  authenticated: boolean;
  evmAddress: string | null;
  solanaAddress: string | null;
  userId: string | null;
  profile: Profile;
  logout: () => Promise<void>;
}

// Prediction uses one auth-shaped interface on both the Decane main branch and
// the Privy-backed staging branch. Keeping the adapter here prevents either
// provider SDK from leaking into the feature components.
export function useAuthSession(): AuthSession {
  const { ready, authenticated, user, logout } = usePrivy();

  return {
    ready,
    authenticated,
    evmAddress: getWalletAddress(user, "ethereum"),
    solanaAddress: getWalletAddress(user, "solana"),
    userId: user?.id ?? null,
    profile: deriveProfile(user),
    logout,
  };
}
