"use client";

import { useCallback } from "react";
import {
  getAccessToken,
  useSendTransaction,
  useSign7702Authorization,
  useWallets,
} from "@privy-io/react-auth";
import type { EIP1193Provider } from "viem";
import { recordSelfInitiated } from "@/lib/analytics/self-initiated";
import { sendSponsoredEvmCallsWithReceipt } from "@/lib/trade/sponsor";
import type { ReceiptLog } from "@/lib/meme/delivery";
import { getSponsoredEvmChainById, hasGasPolicyForChainId } from "@/lib/trade/sponsored-evm";

export interface EvmSendInput {
  to: `0x${string}`;
  data?: `0x${string}`;
  value?: bigint;
  chainId: number;
  address?: string;
  gasLimit?: bigint;
}

const EIP7702_REFUSED = /EIP-7702 is not supported/i;

function refusesEip7702(error: unknown): boolean {
  return EIP7702_REFUSED.test(error instanceof Error ? error.message : String(error));
}

export interface EvmSendResult {
  hash: `0x${string}`;
  logs: ReceiptLog[] | null;
}

export function useEvmSend() {
  const sendWithReceipt = useEvmSendWithReceipt();
  return useCallback(
    async (input: EvmSendInput): Promise<`0x${string}`> => (await sendWithReceipt(input)).hash,
    [sendWithReceipt]
  );
}

export function useEvmSendWithReceipt() {
  const { sendTransaction } = useSendTransaction();
  const { signAuthorization } = useSign7702Authorization();
  const { wallets } = useWallets();

  return useCallback(
    async ({
      to,
      data,
      value,
      chainId,
      address,
      gasLimit,
    }: EvmSendInput): Promise<EvmSendResult> => {
      const sponsored = hasGasPolicyForChainId(chainId) ? getSponsoredEvmChainById(chainId) : null;
      if (sponsored) {
        const wallet = wallets.find((candidate) => candidate.walletClientType === "privy");
        if (!wallet) throw new Error("No EVM wallet is connected.");
        if (address && address.toLowerCase() !== wallet.address.toLowerCase()) {
          throw new Error(
            `Sponsored ${sponsored.chain.name} sends must use your connected embedded wallet.`
          );
        }
        const accessToken = await getAccessToken();
        if (!accessToken) throw new Error("Your session expired. Sign in again.");
        const provider = (await wallet.getEthereumProvider()) as unknown as EIP1193Provider;
        try {
          const receipt = await sendSponsoredEvmCallsWithReceipt({
            chainId,
            address: wallet.address as `0x${string}`,
            provider,
            signAuthorization,
            accessToken,
            calls: [{ to, data, value }],
          });
          recordSelfInitiated([receipt.transactionHash]);
          return { hash: receipt.transactionHash, logs: receipt.logs };
        } catch (error) {
          if (!refusesEip7702(error)) throw error;
          console.warn(
            `Sponsored send refused on chain ${chainId}; sending user-paid instead`,
            error instanceof Error ? error.message : error
          );
        }
      }
      const { hash } = await sendTransaction(
        { to, data, value, chainId, gasLimit },
        address ? { address } : undefined
      );
      recordSelfInitiated([hash]);
      return { hash: hash as `0x${string}`, logs: null };
    },
    [sendTransaction, signAuthorization, wallets]
  );
}

export interface EvmBatchCall {
  to: `0x${string}`;
  data?: `0x${string}`;
  value?: bigint;
}

export function useEvmSendBatch() {
  const { signAuthorization } = useSign7702Authorization();
  const { wallets } = useWallets();

  return useCallback(
    async (
      calls: EvmBatchCall[],
      chainId: number,
      expectedAddress?: string
    ): Promise<`0x${string}`> => {
      if (!hasGasPolicyForChainId(chainId)) {
        throw new Error("Batched transactions are only supported on sponsored EVM chains.");
      }
      if (calls.length === 0) throw new Error("Nothing to send.");
      const wallet = wallets.find((candidate) => candidate.walletClientType === "privy");
      if (!wallet) throw new Error("No EVM wallet is connected.");
      if (expectedAddress && expectedAddress.toLowerCase() !== wallet.address.toLowerCase()) {
        throw new Error("Sends must use your connected embedded wallet.");
      }
      const accessToken = await getAccessToken();
      if (!accessToken) throw new Error("Your session expired. Sign in again.");
      const provider = (await wallet.getEthereumProvider()) as unknown as EIP1193Provider;
      const { transactionHash: hash } = await sendSponsoredEvmCallsWithReceipt({
        chainId,
        address: wallet.address as `0x${string}`,
        provider,
        signAuthorization,
        accessToken,
        calls,
      });
      recordSelfInitiated([hash]);
      return hash;
    },
    [signAuthorization, wallets]
  );
}
