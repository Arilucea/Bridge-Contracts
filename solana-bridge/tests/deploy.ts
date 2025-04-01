import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { SolanaBridge } from "../target/types/solana_bridge";
import { randomBytes } from "crypto";
import {
  PublicKey,
} from "@solana/web3.js";
import * as fs from "fs";
import * as path from "path";


describe("Bridge deployment", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace.SolanaBridge as Program<SolanaBridge>;
  const userOne = provider.wallet as anchor.Wallet;

  let seed = new anchor.BN(randomBytes(8));

  let bridge = PublicKey.findProgramAddressSync(
    [Buffer.from("bridge"), seed.toArrayLike(Buffer, "le", 8)],
    program.programId
  )[0];

  it("Inicialization!", async () => {
    const tx = await program.methods
      .initializeBridge(seed)
      .accounts({
        signer: userOne.publicKey,
        bridge: bridge,
      })
      .signers([userOne.payer])
      .rpc();

    const configData = {
      programId: program.programId.toString(),
      bridge: bridge.toString(),
      seed: seed.toString(),
      timestamp: new Date().toISOString()
    };
    
    const configDir = path.join(__dirname, "../");
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }
    
    fs.writeFileSync(
      path.join(configDir, "bridge-deployment.json"),
      JSON.stringify(configData, null, 2)
    );
  });

});
