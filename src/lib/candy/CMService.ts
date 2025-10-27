import { useWallet } from "@solana/wallet-adapter-react";
import { createUmi } from "@metaplex-foundation/umi";


const umi = createUmi("https://api.devnet.solana.com");

async function mintNft() {
    const {publicKey, signTransaction} = useWallet();
    umi.useSigner(signTransaction);

    const cm = await umi.candyMachines().findByAddress({ address: candyMachinePublicKey });
    const tx = await cm.mint({ owner: publicKey });
    await umi.rpc.sendAndConfirmTransaction(tx);
}