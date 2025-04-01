import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { SolanaBridge } from "../target/types/solana_bridge";
import {
  PublicKey,
  sendAndConfirmTransaction,
  Transaction,
} from "@solana/web3.js";
import {
  createApproveInstruction,
  getAccount,
  getAssociatedTokenAddress,
} from "@solana/spl-token";
import * as fs from "fs";
import * as path from "path";

import { PROGRAM_ID as METADATA_PROGRAM_ID } from "@metaplex-foundation/mpl-token-metadata";
import { assert } from "chai";
describe("Minting test tokens", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace.SolanaBridge as Program<SolanaBridge>;
  const userOne = provider.wallet as anchor.Wallet;

  let mintAddress: PublicKey;
  let userOneTokenAccount: PublicKey;

  const configDir = path.join(__dirname, "../");
  const filePath = path.join(configDir, "bridge-deployment.json");

  let configData;
  try {
    const fileContent = fs.readFileSync(filePath, "utf8");
    configData = JSON.parse(fileContent);
  } catch (error) {
    console.error("Error reading file:", error);
  }

  let bridge = new PublicKey(configData.bridge);

  it("Mint tokens", async () => {
    const signer = userOne.publicKey;

    for (let i = 0; i < 1; i++) {
      // Generate a unique ID for the NFT
      const nftId = new anchor.BN(Math.floor(Math.random() * 1000000));
      const seed1 = new anchor.BN(
        Math.floor(Math.random() * 1000000)
      ).toString();
      const seed2 = new anchor.BN(
        Math.floor(Math.random() * 1000000)
      ).toString();

      // Derive the mint account
      const [mintPda] = anchor.web3.PublicKey.findProgramAddressSync(
        [
          Buffer.from("mint"),
          Buffer.from(seed1),
          Buffer.from(seed2),
          nftId.toArrayLike(Buffer, "le", 8),
        ],
        program.programId
      );

      mintAddress = mintPda;

      // Derive the associated token account
      userOneTokenAccount = await getAssociatedTokenAddress(
        mintPda,
        userOne.publicKey
      );

      // Derive metadata and master edition PDAs
      const [metadataPda] = anchor.web3.PublicKey.findProgramAddressSync(
        [
          Buffer.from("metadata"),
          METADATA_PROGRAM_ID.toBuffer(),
          mintPda.toBuffer(),
        ],
        METADATA_PROGRAM_ID
      );

      const [masterEditionPda] = anchor.web3.PublicKey.findProgramAddressSync(
        [
          Buffer.from("metadata"),
          METADATA_PROGRAM_ID.toBuffer(),
          mintPda.toBuffer(),
          Buffer.from("edition"),
        ],
        METADATA_PROGRAM_ID
      );

      // NFT Metadata
      const nftName = "Test NFT - ";
      const nftSymbol = "TEST";
      const nftUri =
        "https://ipfs.io/ipfs/bafkreifziyqmhmlfzcb2vbkldizclnr2cqad62drd3nzjsj44qczjktj2e";
      const nftPrice = 1.0;

      // Transaction
      const tx = await program.methods
        .createNft(
          nftId,
          seed1,
          seed2,
          nftName,
          nftSymbol,
          nftUri,
          "12345"
        )
        .accounts({
          recipient: userOne.publicKey,
          bridge: bridge,
          signer: signer,
          mint: mintPda,
          destinationTokenAccount: userOneTokenAccount,
          masterEditionAccount: masterEditionPda,
          nftMetadata: metadataPda,
        })
        .rpc();

      // Verify transaction
      const txDetails = await provider.connection.getParsedTransaction(tx, {
        commitment: "confirmed",
      });

      let token_amount = await GetOwner(userOneTokenAccount);
      assert(token_amount == BigInt(1), "Token amount not correct");

      const approveInstruction = createApproveInstruction(
        userOneTokenAccount,
        bridge,
        userOne.publicKey,
        1
      );

      // Create and send transaction
      const transaction = new Transaction().add(approveInstruction);
      const signature = await sendAndConfirmTransaction(
        provider.connection,
        transaction,
        [userOne.payer]
      );

      token_amount = await GetOwner(userOneTokenAccount);
      assert(
        token_amount == BigInt(1),
        "Amount of tokens for user one not correct before transfer"
      );

      console.log("Token mint", mintAddress.toString());
      console.log("userOneTokenAccount", userOneTokenAccount.toString());
      console.log("\n");
    }
  });

  async function GetOwner(tokenAccount: any): Promise<bigint> {
    const accountInfo = await getAccount(provider.connection, tokenAccount);
    return accountInfo.amount;
  }
});
