import { Connection, LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";



async function getBalance(connection: Connection, publicKey: PublicKey): Promise<number> {
    const info = await connection.getAccountInfo(publicKey);
    const balance = (info.lamports / LAMPORTS_PER_SOL).toFixed(4);
    return Number(balance)
}

export { getBalance }