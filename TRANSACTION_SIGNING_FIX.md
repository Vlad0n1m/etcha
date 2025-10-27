# Transaction Signing Fix

## Problem
`WalletSendTransactionError: Unexpected error` when purchasing tickets.

### Root Cause
Candy Machine mint transactions require **two signatures**:
1. **User wallet** - for payment and receiving NFT
2. **Platform wallet** - as collection update authority

The transaction was being sent with only the user's signature, causing the error.

## Solution: Partial Signing + Manual Send

Implemented partial signing pattern with manual transaction sending:
1. Platform wallet **pre-signs** the transaction on backend
2. Serialized transaction sent to frontend (with platform signature)
3. User wallet adds their signature using `signTransaction`
4. Complete transaction manually sent using `connection.sendRawTransaction`

**Why manual send?**
- `sendTransaction` from wallet adapter doesn't handle partially signed transactions correctly
- Using `signTransaction` + `sendRawTransaction` gives full control over the signing flow

## Changes Made

### 1. CandyMachineService.ts

Added partial signing in `prepareMintTransaction()`:

```typescript
// Platform wallet partially signs as collection authority
const platformKeypair = this.solanaService.getKeypair();
transaction.partialSign(platformKeypair);

console.log('🔏 Platform wallet signed as collection authority');

// Serialize transaction with partial signature
const serializedTransaction = transaction.serialize({
    requireAllSignatures: false, // User still needs to sign
    verifySignatures: false,
});
```

**Location:** `src/lib/solana/CandyMachineService.ts:330-339`

### 2. Event Purchase Page

Updated to use `signTransaction` + manual send:

```typescript
// Deserialize partially signed transaction
const transaction = Transaction.from(transactionBuffer)

console.log('✍️ Requesting user signature...')
const signedTransaction = await signTransaction(transaction)

console.log('✅ User signed transaction')

// Manually send the fully signed transaction
const rawTransaction = signedTransaction.serialize()
const transactionSignature = await connection.sendRawTransaction(rawTransaction, {
    skipPreflight: false,
    preflightCommitment: 'confirmed'
})
```

**Key Changes:**
- Changed from `sendTransaction` to `signTransaction`
- Added manual `connection.sendRawTransaction()`
- Added detailed logging of signature counts

**Location:** `src/app/event/[id]/page.tsx:165-195`

### 3. Marketplace Prepare-Buy

Added conditional partial signing for auction house authority:

```typescript
// Platform wallet signs as auction house authority if needed
const platformKeypair = solanaService.getKeypair();

// Check if platform signature is required
const requiresPlatformSig = transaction.signatures.some(
    sig => sig.publicKey.equals(platformKeypair.publicKey)
);

if (requiresPlatformSig) {
    transaction.partialSign(platformKeypair);
    console.log('🔏 Platform wallet signed as auction house authority');
}
```

**Location:** `src/app/api/marketplace/prepare-buy/route.ts:136-146`

### 4. Resale Purchase Page

Updated to use `signTransaction` + manual send (same pattern as primary purchase):

```typescript
// Deserialize transaction (may be partially signed)
const transaction = Transaction.from(transactionBuffer)

console.log('✍️ Requesting user signature...')
const signedTransaction = await signTransaction(transaction)

// Manually send the signed transaction
const rawTransaction = signedTransaction.serialize()
const transactionSignature = await connection.sendRawTransaction(rawTransaction, {
    skipPreflight: false,
    preflightCommitment: 'confirmed',
})
```

**Location:** `src/app/resale/page.tsx:129-156`

## How It Works

### Transaction Flow

```
1. Backend (prepare-purchase)
   ├─ Build mint transaction
   ├─ Platform wallet signs (collection authority)
   └─ Return partially signed transaction

2. Frontend
   ├─ Deserialize transaction (preserves platform signature)
   ├─ User wallet adds signature
   └─ Send complete transaction to blockchain

3. Blockchain
   ├─ Verify both signatures
   ├─ Execute mint
   ├─ Transfer SOL to organizer
   └─ Send NFT to user
```

### Signature Requirements

| Transaction Type | Platform Signature | User Signature | Reason |
|-----------------|-------------------|----------------|---------|
| **Mint (Primary)** | ✅ Required | ✅ Required | Platform = collection authority<br>User = payer & recipient |
| **Buy (Resale)** | ⚠️ Conditional | ✅ Required | Platform = auction house authority (if needed)<br>User = buyer & payer |
| **List (Resale)** | ⚠️ Conditional | ✅ Required | Platform = auction house authority (if needed)<br>User = seller |

## Testing

### Verify Fix Works

1. **Connect Wallet** to the app
2. **Navigate** to event detail page
3. **Click "Buy Ticket"**
4. **Approve transaction** in wallet popup
5. **Wait for confirmation**
6. **Check:**
   - ✅ Transaction succeeds without errors
   - ✅ NFT appears in user's wallet
   - ✅ SOL transferred to organizer
   - ✅ Transaction visible on Solscan

### Expected Console Logs

```
📝 Preparing purchase transaction...
💳 Preparing transaction for signature...
💰 Total cost: 0.1 SOL
🔏 Transaction is partially signed by platform (collection authority)
🔍 Transaction signatures before user sign: 2
🔍 Required signers: [platformWallet, userWallet]
✍️ Requesting user signature...
✅ User signed transaction
🔍 Transaction signatures after user sign: 2
📤 Sending transaction to blockchain...
✅ Transaction sent: [signature]
⏳ Waiting for confirmation...
✅ Transaction confirmed on blockchain
📝 Recording purchase in database...
🎉 Purchase completed successfully!
```

## Technical Details

### Why Partial Signing + Manual Send?

**Alternative Approaches:**
1. ❌ **Backend-only signing:** User doesn't pay (not acceptable)
2. ❌ **User-only signing:** Missing platform authority (causes error)
3. ❌ **Partial signing + sendTransaction:** Wallet adapter doesn't handle it correctly
4. ✅ **Partial signing + signTransaction + sendRawTransaction:** Both parties sign, full control (correct solution)

**Why not use `sendTransaction`?**
- Wallet adapters expect to handle the entire signing process
- When they encounter partially signed transactions, they fail with "Unexpected error"
- Manual approach with `signTransaction` + `sendRawTransaction` bypasses this limitation

### Security Considerations

- ✅ Platform signs **before** user (cannot be manipulated)
- ✅ User's signature required for payment (user controls funds)
- ✅ Transaction cannot be modified after platform signs
- ✅ Blockhash ensures transaction expires if not completed

### Solana Transaction Structure

```typescript
Transaction {
    signatures: [
        { publicKey: platformWallet, signature: [bytes] },  // Pre-signed
        { publicKey: userWallet, signature: null }          // To be signed
    ],
    feePayer: userWallet,
    recentBlockhash: "...",
    instructions: [...]
}
```

## Related Files

**Backend:**
- `src/lib/solana/CandyMachineService.ts` - Mint transaction preparation with partial signing
- `src/app/api/marketplace/prepare-buy/route.ts` - Resale transaction preparation

**Frontend:**
- `src/app/event/[id]/page.tsx` - Primary purchase UI with signTransaction + sendRawTransaction
- `src/app/resale/page.tsx` - Resale purchase UI with signTransaction + sendRawTransaction

## References

- [Solana Transaction Structure](https://docs.solana.com/developing/programming-model/transactions)
- [Metaplex Candy Machine Guards](https://docs.metaplex.com/programs/candy-machine/guards)
- [Partial Signing Pattern](https://solanacookbook.com/references/basic-transactions.html#how-to-add-a-memo-to-a-transaction)

---

**Issue:** WalletSendTransactionError: Unexpected error  
**Fix Date:** 2025-01-27  
**Status:** ✅ Resolved

