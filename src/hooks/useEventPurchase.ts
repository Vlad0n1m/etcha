"use client";

import { useState, useCallback } from "react";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import type { Event, TicketType, TicketPurchaseResult } from "@/types";
import { getMaxTicketsForUser, hasReachedTicketLimit, supportsCNFT } from "@/services/events";

export type MintStatus = "preparing" | "minting" | "confirming" | "complete" | "error";

interface UseEventPurchaseOptions {
  event: Event | null;
  selectedTicketType: TicketType | null;
  userTicketCount: number;
  onSuccess?: (result: TicketPurchaseResult) => void;
  onError?: (error: string) => void;
}

export function useEventPurchase(options: UseEventPurchaseOptions) {
  const { event, selectedTicketType, userTicketCount, onSuccess, onError } = options;

  const { connected, publicKey, sendTransaction, signTransaction, wallet } = useWallet();
  const { connection } = useConnection();

  const [quantity, setQuantity] = useState(1);
  const [isMinting, setIsMinting] = useState(false);
  const [mintStatus, setMintStatus] = useState<MintStatus>("preparing");
  const [mintProgress, setMintProgress] = useState("");
  const [mintResult, setMintResult] = useState<TicketPurchaseResult | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Computed values
  const maxAllowed = event && selectedTicketType
    ? getMaxTicketsForUser(event, selectedTicketType, userTicketCount)
    : 0;

  const isAtLimit = event ? hasReachedTicketLimit(event, userTicketCount) : false;
  const isSoldOut = !selectedTicketType || selectedTicketType.available <= 0;
  const canPurchase = event ? supportsCNFT(event) : false;
  const totalPrice = (selectedTicketType?.price || 0) * quantity;

  const handleQuantityChange = useCallback((change: number) => {
    const newQuantity = quantity + change;
    if (newQuantity >= 1 && newQuantity <= maxAllowed) {
      setQuantity(newQuantity);
    }
  }, [quantity, maxAllowed]);

  const resetQuantity = useCallback(() => {
    setQuantity(1);
  }, []);

  const openConfirmModal = useCallback(() => {
    if (!selectedTicketType) {
      setError("Please select a ticket type");
      return;
    }
    setShowConfirmModal(true);
  }, [selectedTicketType]);

  const closeConfirmModal = useCallback(() => {
    setShowConfirmModal(false);
  }, []);

  const startMint = useCallback(async () => {
    if (!connected || !publicKey || !wallet || (!sendTransaction && !signTransaction) || !event) {
      return { needsWallet: true };
    }

    if (!selectedTicketType) {
      setError("Please select a ticket type");
      return { success: false };
    }

    // Check ticket limit
    if (event.maxTicketsPerUser) {
      const newTotal = userTicketCount + quantity;
      if (newTotal > event.maxTicketsPerUser) {
        setError(
          `You can only purchase ${event.maxTicketsPerUser} tickets for this event. You already have ${userTicketCount}.`
        );
        return { success: false };
      }
    }

    // Check cNFT support
    if (!supportsCNFT(event)) {
      setError(
        "This event was created before cNFT support. Please contact the organizer to upgrade the event."
      );
      return { success: false };
    }

    setShowConfirmModal(false);
    setIsMinting(true);
    setMintStatus("preparing");
    setMintProgress("Preparing ticket purchase...");
    setError(null);

    try {
      // Step 1: Get Mint Transaction from Backend
      const mintResponse = await fetch("/api/mint", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId: event.id,
          ticketTypeId: selectedTicketType.id,
          buyerWallet: publicKey.toBase58(),
          quantity,
        }),
      });

      const mintResponseData = await mintResponse.json();

      if (!mintResponseData.success) {
        throw new Error(mintResponseData.message || "Failed to prepare mint transaction");
      }

      const transactionBase64 = mintResponseData.transaction;
      const assetIds = mintResponseData.assetIds || [];
      const mintMerkleTreeAddress = mintResponseData.merkleTreeAddress;
      const mintPlatformTreeId = mintResponseData.platformTreeId;

      if (!transactionBase64) {
        throw new Error("No transaction returned from server");
      }

      // Step 2: Deserialize and Sign Transaction
      setMintStatus("minting");
      setMintProgress("Please approve the transaction in your wallet...");

      const { Transaction } = await import("@solana/web3.js");
      
      // Create a fresh transaction with the instructions from the server
      const serverTransaction = Transaction.from(Buffer.from(transactionBase64, "base64"));
      
      // Create new transaction to avoid signature issues
      const transaction = new Transaction();
      transaction.instructions = serverTransaction.instructions;

      // Get fresh blockhash to avoid expiration issues
      const { blockhash } = await connection.getLatestBlockhash("confirmed");
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = publicKey;

      // Debug: Log transaction details
      console.log("Transaction details:", {
        feePayer: transaction.feePayer?.toBase58(),
        blockhash: transaction.recentBlockhash,
        instructions: transaction.instructions.length,
        signatures: transaction.signatures.length,
      });

      // Simulate transaction first to catch errors
      try {
        const simulation = await connection.simulateTransaction(transaction);
        console.log("Simulation result:", simulation);
        
        if (simulation.value.err) {
          console.error("Simulation error:", simulation.value.err);
          console.error("Simulation logs:", simulation.value.logs);
          throw new Error(`Transaction simulation failed: ${JSON.stringify(simulation.value.err)}`);
        }
      } catch (simError) {
        console.error("Simulation failed:", simError);
        // Continue anyway - simulation might fail for valid reasons
      }

      // Sign and Send - try signTransaction first, fallback to sendTransaction
      let signature: string;
      try {
        if (signTransaction) {
          // Method 1: Sign separately then send raw transaction
          console.log("Using signTransaction method...");
          const signedTransaction = await signTransaction(transaction);
          
          signature = await connection.sendRawTransaction(signedTransaction.serialize(), {
            skipPreflight: true,
            preflightCommitment: "confirmed",
          });
          console.log("Transaction sent via sendRawTransaction:", signature);
        } else {
          // Method 2: Fallback to sendTransaction
          console.log("Using sendTransaction method...");
          signature = await sendTransaction(transaction, connection, {
            skipPreflight: true,
            preflightCommitment: "confirmed",
          });
        }
      } catch (sendError: unknown) {
        console.error("Send transaction error:", sendError);
        // Extract more detailed error info
        if (sendError && typeof sendError === "object" && "logs" in sendError) {
          console.error("Transaction logs:", (sendError as { logs: string[] }).logs);
        }
        throw sendError;
      }

      setMintStatus("confirming");
      setMintProgress("Confirming on blockchain...");

      // Wait for confirmation
      await connection.confirmTransaction(signature, "confirmed");

      // Step 3: Confirm Mint with Backend
      setMintProgress("Saving ticket information...");

      const confirmResponse = await fetch("/api/mint/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId: event.id,
          ticketTypeId: selectedTicketType.id,
          merkleTreeAddress: mintMerkleTreeAddress,
          platformTreeId: mintPlatformTreeId,
          buyerWallet: publicKey.toBase58(),
          quantity,
          assetIds,
          transactionSignature: signature,
        }),
      });

      const result = await confirmResponse.json();

      if (result.success) {
        setMintStatus("complete");
        setMintProgress("Ticket purchased successfully!");

        const purchaseResult: TicketPurchaseResult = {
          ...result,
          nftMintAddresses: assetIds,
          transactionSignature: signature,
        };

        setMintResult(purchaseResult);
        onSuccess?.(purchaseResult);
        return { success: true, result: purchaseResult };
      } else {
        setMintStatus("error");
        setMintProgress(result.message || "Failed to save ticket information");
        setTimeout(() => setIsMinting(false), 3000);
        return { success: false };
      }
    } catch (err: unknown) {
      console.error("Mint error:", err);
      setMintStatus("error");

      let errorMessage = "Failed to purchase ticket";
      if (err instanceof Error) {
        errorMessage = err.message;
        
        // Parse common wallet errors
        if (errorMessage.includes("User rejected") || errorMessage.includes("rejected")) {
          errorMessage = "Transaction cancelled by user";
        } else if (errorMessage.includes("insufficient funds") || errorMessage.includes("Insufficient")) {
          errorMessage = "Insufficient SOL balance for this transaction";
        } else if (errorMessage.includes("blockhash")) {
          errorMessage = "Transaction expired. Please try again.";
        } else if (errorMessage.includes("0x1")) {
          errorMessage = "Insufficient SOL balance";
        } else if (errorMessage.includes("Unexpected error")) {
          // Try to get more details from wallet error
          const walletErr = err as { logs?: string[]; message?: string };
          if (walletErr.logs && walletErr.logs.length > 0) {
            console.error("Wallet transaction logs:", walletErr.logs);
            errorMessage = `Transaction failed: ${walletErr.logs[walletErr.logs.length - 1]}`;
          } else {
            errorMessage = "Wallet error. Please check your balance and try again.";
          }
        }
      }

      setMintProgress(errorMessage);
      onError?.(errorMessage);
      setTimeout(() => setIsMinting(false), 3000);
      return { success: false };
    }
  }, [
    connected,
    publicKey,
    wallet,
    sendTransaction,
    connection,
    event,
    selectedTicketType,
    userTicketCount,
    quantity,
    onSuccess,
    onError,
  ]);

  const reset = useCallback(() => {
    setIsMinting(false);
    setMintStatus("preparing");
    setMintProgress("");
    setMintResult(null);
    setError(null);
  }, []);

  return {
    // State
    quantity,
    isMinting,
    mintStatus,
    mintProgress,
    mintResult,
    showConfirmModal,
    error,

    // Computed
    maxAllowed,
    isAtLimit,
    isSoldOut,
    canPurchase,
    totalPrice,

    // Actions
    handleQuantityChange,
    resetQuantity,
    openConfirmModal,
    closeConfirmModal,
    startMint,
    reset,
    setError,
  };
}
