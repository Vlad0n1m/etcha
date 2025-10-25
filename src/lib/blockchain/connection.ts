import { Connection, clusterApiUrl } from '@solana/web3.js'

const network = process.env.SOLANA_NETWORK || 'devnet'
const rpcUrl = process.env.SOLANA_RPC_URL || clusterApiUrl(network as any)

export const connection = new Connection(rpcUrl, 'confirmed')

export { network, rpcUrl }
