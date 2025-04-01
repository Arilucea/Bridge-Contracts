import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { SolanaBridge } from "../target/types/solana_bridge";
import { randomBytes } from "crypto";
import {
  Keypair,
  PublicKey,
  sendAndConfirmTransaction,
  Transaction,
} from "@solana/web3.js";
import {
  createApproveInstruction,
  createMint,
  getAccount,
  getAssociatedTokenAddress,
  getAssociatedTokenAddressSync,
  getOrCreateAssociatedTokenAccount,
  mintTo,
} from "@solana/spl-token";

import { PROGRAM_ID as METADATA_PROGRAM_ID } from "@metaplex-foundation/mpl-token-metadata";
import { assert } from "chai";
describe("solana-bridge", () => {
  // Configure the client to use the local cluster.
  const provider = anchor.AnchorProvider.local();
  anchor.setProvider(anchor.AnchorProvider.local());

  const program = anchor.workspace.SolanaBridge as Program<SolanaBridge>;
  const userOne = provider.wallet as anchor.Wallet;
  const userTwo = Keypair.generate();

  let mintAddress: PublicKey;
  let bridgeTokenAccount: PublicKey;
  let userOneTokenAccount: PublicKey;
  let userTwoTokenAccount: PublicKey;

  let seed = new anchor.BN(randomBytes(8));

  let bridge = PublicKey.findProgramAddressSync(
    [Buffer.from("bridge"), seed.toArrayLike(Buffer, "le", 8)],
    program.programId
  )[0];

  let eventPromise;

  before(async () => {
    const airdropSignature = await provider.connection.requestAirdrop(
      userTwo.publicKey,
      1000000000
    );
    await provider.connection.confirmTransaction(airdropSignature);

    eventPromise = new Promise((resolve) =>  {
      program.addEventListener('newRequestEvent', (event, slot) => {
        resolve(event);
      });
    });

    await InitializeToken();
  });

  after(async () => {
    program.removeEventListener(0);
  });

  it("Is initialized!", async () => {
    const tx = await program.methods
      .initializeBridge(seed)
      .accounts({
        signer: userOne.publicKey,
        bridge: bridge,
      })
      .signers([userOne.payer])
      .rpc();
    let bride_data = await program.account.bridge.fetch(bridge);
    assert(
      bride_data.seed.toString() == seed.toString(),
      "Bridge seed not initialize correctly"
    );
  });

  it("Create a new bridge request", async () => {
    const approveInstruction = createApproveInstruction(
      userOneTokenAccount, 
      bridge, 
      userOne.publicKey,
      1
    );

    const transaction = new Transaction().add(approveInstruction);
    const signature = await sendAndConfirmTransaction(
      provider.connection,
      transaction,
      [userOne.payer]
    );

    let token_amount = await GetOwnerAmount(userOneTokenAccount);
    assert(
      token_amount == BigInt(1),
      "Amount of tokens for user one not correct before transfer"
    );

    let requestID = "12345";

    const tx = await program.methods
      .newRequest(requestID)
      .accounts({
        userTokenAccount: userOneTokenAccount,
        mint: mintAddress,
        bridgeTokenAccount: bridgeTokenAccount,
        bridge: bridge,
      })
      .rpc();

    token_amount = await GetOwnerAmount(userOneTokenAccount);
    assert(
      token_amount == BigInt(0),
      "Amount of tokens for user one not correct after transfer"
    );
    token_amount = await GetOwnerAmount(bridgeTokenAccount);
    assert(
      token_amount == BigInt(1),
      "Amount of tokens for bridge not correct after transfer"
    );
  });

  it("Can create a NFT", async () => {
    const signer = userOne.publicKey;

    const nftId = new anchor.BN(Math.floor(Math.random() * 1000000));
    const originAddress = "0x0000000000000000000000000000000000000000";
    const [seed1, seed2] = [originAddress.slice(0, originAddress.length / 2), originAddress.slice(originAddress.length / 2)];

    const [mintPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("mint"), Buffer.from(seed1), Buffer.from(seed2), nftId.toArrayLike(Buffer, "le", 8)],
      program.programId
    );

    const associatedTokenAccount = await getAssociatedTokenAddress(
      mintPda,
      userTwo.publicKey
    );

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

      let requestID = "abcd"

    const tx = await program.methods
      .createNft(nftId, seed1, seed2, nftName, nftSymbol, nftUri, requestID)
      .accounts({
        recipient: userTwo.publicKey,
        bridge: bridge,
        backend: signer,
        mint: mintPda,
        destinationTokenAccount: associatedTokenAccount,
        masterEditionAccount: masterEditionPda,
        nftMetadata: metadataPda,
      })
      .rpc();

    let token_amount = await GetOwnerAmount(associatedTokenAccount)
    assert(token_amount == BigInt(1), "Token amount not correct");
  });

  it("Can burn tokens", async () => {
    await InitializeToken();
    const approveInstruction = createApproveInstruction(
      userOneTokenAccount, 
      bridge, 
      userOne.publicKey,
      1
    );

    const transaction = new Transaction().add(approveInstruction);
    const signature = await sendAndConfirmTransaction(
      provider.connection,
      transaction,
      [userOne.payer]
    );

    let token_amount = await GetOwnerAmount(userOneTokenAccount);
    assert(
      token_amount == BigInt(1),
      "Amount of tokens for user one not correct before transfer"
    );
    let requestID = "12345";
    const tx = await program.methods
      .newRequest(requestID)
      .accounts({
        userTokenAccount: userOneTokenAccount,
        mint: mintAddress,
        bridgeTokenAccount: bridgeTokenAccount,
        bridge: bridge,
      })
      .rpc();

    token_amount = await GetOwnerAmount(userOneTokenAccount);
    assert(
      token_amount == BigInt(0),
      "Amount of tokens for user one not correct after transfer"
    );
    token_amount = await GetOwnerAmount(bridgeTokenAccount);
    assert(
      token_amount == BigInt(1),
      "Amount of tokens for bridge not correct after transfer"
    );

    await program.methods.burnToken().accounts({
      bridgeTokenAccount: bridgeTokenAccount,
      bridge: bridge,
      mint: mintAddress,
      backend: userOne.publicKey,
      }).rpc();
    token_amount = await GetOwnerAmount(bridgeTokenAccount);
    assert(
      token_amount == BigInt(0),
      "Amount of tokens for bridge not correct after transfer"
    );
  });

  async function GetOwnerAmount(tokenAccount: any): Promise<bigint> {
    const accountInfo = await getAccount(provider.connection, tokenAccount);
    return accountInfo.amount;
  }

  async function InitializeToken() {
    mintAddress = await createMint(
      provider.connection,
      userOne.payer,
      userOne.publicKey,
      null,
      0
    );

    bridgeTokenAccount = getAssociatedTokenAddressSync(
      mintAddress,
      bridge,
      true
    );

    userOneTokenAccount = (
      await getOrCreateAssociatedTokenAccount(
        provider.connection,
        userOne.payer,
        mintAddress,
        userOne.publicKey
      )
    ).address;

    await mintTo(
      provider.connection,
      userOne.payer,
      mintAddress,
      userOneTokenAccount,
      userOne.publicKey,
      1
    );
  }
});
