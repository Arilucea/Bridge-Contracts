# Bridge Contracts

Contracts for the cross-chain [NFT bridge](https://github.com/Arilucea/Bridge-Solana-Evm) between Ethereum Virtual Machine (EVM) and Solana blockchain networks.

## Overview

This project implements a bidirectional bridge for transferring NFTs between EVM-compatible blockchains and Solana. Consists of two main components:

1. **EVM Bridge**: Smart contracts for the EVM side of the bridge
2. **Solana Bridge**: Anchor-based programs for the Solana side of the bridge

The bridge allows users to transfer their NFTs from one blockchain to another while preserving ownership and metadata.

## Repository Structure

```
Bridge-Contracts/
├── evm-bridge/                     # EVM side of the bridge
│   ├── src/                        # Source code for EVM contracts
│   │   ├── Bridge.sol              # Main bridge contract for EVM
│   │   ├── ERC721.sol              # ERC721 token implementation
│   │   └── Proxy.sol               # Proxy contract for upgradability
│   ├── script/                     # Deployment scripts
│   ├── test/                       # Test files
│   └── lib/                        # Dependencies
│
├── solana-bridge/                  # Solana side of the bridge
│   ├── programs/                   # Solana programs
│   │   └── solana-bridge/          # Main Solana bridge program
│           └── src/                # Source code for the program
│   │          ├── data             # Bridge storage struct
│   │          ├── errors           # Custom errors
│   │          └── instructions     # Program functions implementation
│   └── tests/                      # Test files and deployment scripts
```

## EVM Bridge

The EVM side of the bridge consists of the following components:

### Bridge.sol

The main contract that handles the bridge functionality on the EVM side. It uses the UUPS (Universal Upgradeable Proxy Standard) pattern for upgradability.

Key features:
- Handles NFT transfer requests from EVM to Solana
- Mints NFTs on the EVM side when bridged from Solana
- Uses a trusted backend for cross-chain communication
- Implements access control for security

#### Key Functions

1. **initialize**
   - Initializes the bridge contract with the deployer as the owner
   - Sets up the UUPS upgradeable pattern

2. **setNFTToken**
   - Sets the address of the ERC721 token contract used for minting NFTs
   - Access control: Only callable by the contract owner

3. **setBackendAddress**
   - Configures the trusted backend address that can call bridge functions
   - Access control: Only callable by the contract owner

4. **newBridgeRequest (EVM to Solana)**
   - Locks the original NFT in the bridge contract
   - Emits a NewRequest event with the request details
   - The relayer monitors these events to trigger minting on Solana
   - Access control: Only callable by the relayer

5. **mintToken (Solana to EVM)**
   - Mints a new NFT on the EVM side
   - Used when bridging NFTs from Solana to EVM
   - Preserves the original token's metadata via tokenURI
   - Emits an event with the request details for the relayer to pick up
   - Access control: Only callable by the relayer

### ERC721.sol

A custom ERC721 implementation that works with the bridge:
- Extends OpenZeppelin's ERC721URIStorage
- Implements minting functionality for the bridge
- Includes access control to ensure only the bridge can mint tokens

### Proxy.sol

A simple proxy contract for implementing the upgradeable pattern.

## Solana Bridge

The Solana side of the bridge is implemented using the Anchor framework.

### Program Structure

The Solana bridge program is built using Anchor and consists of several key components:

#### Main Program

The main program module defines four primary instructions:
- `initialize_bridge`: Sets up the bridge with a seed for deterministic address generation
- `new_request`: Handles NFT transfer requests from Solana to EVM
- `create_nft`: Mints NFTs on Solana when bridged from EVM

#### Bridge Account

The bridge account stores essential state information:
- `seed`: Used for deterministic PDA (Program Derived Address) generation
- `bump`: The bump used in the PDA derivation
- `backend`: The authorized backend signer that can execute bridge operations

#### Key Instructions

1. **Initialize Bridge**
   - Creates the bridge account with a deterministic address
   - Sets up the backend authority for secure operations
   - Only needs to be called once during deployment

2. **New Request (Solana to EVM)**
   - Locks the NFT in the bridge's token account
   - Emits a NewRequest event with the request details
   - The relayer then triggers the minting on the EVM side
   - Access control: Only callable by the relayer

3. **Create NFT (EVM to Solana)**
   - Mints a new NFT on Solana representing the original from EVM
   - Creates metadata that matches the original NFT's properties
   - Uses Metaplex token metadata program for NFT standards compliance
   - Transfers the newly minted NFT to the recipient's wallet
   - Emits an event with the request details for the relayer to pick up
   - Access control: Only callable by the relayer

## Getting Started

### Prerequisites

For EVM development:
- [Foundry](https://getfoundry.sh/)

For Solana development:
- [Rust](https://www.rust-lang.org/tools/install)
- [Anchor](https://project-serum.github.io/anchor/getting-started/installation.html)
- [Solana CLI](https://docs.solana.com/cli/install-solana-cli-tools)

### Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/Arilucea/Bridge-Contracts.git
   cd Bridge-Contracts
   ```

2. Install EVM dependencies:

   ```bash
   cd evm-bridge
   forge install
   ```

3. Install Solana dependencies:
   
   ```bash
   cd ../solana-bridge
   yarn install
   ```

## Development and Testing

### EVM Bridge

To compile the EVM contracts:
   ```bash
   cd evm-bridge
   forge build
   ```

To run tests:
```bash
forge test
```

### Solana Bridge

To build the Solana program:
```bash
cd solana-bridge
anchor keys sync
anchor build
```

To run tests:
```bash
anchor test --provider.cluster localnet
```

## Deployment

### EVM Bridge Deployment

1. Deploy and configure contracts:
   ```bash
    forge script script/Deploy.sol --broadcast --rpc-url <evm network rpc> --private-key <private key>
   ```
   Deployment data is shown in the terminal logs:
   ```bash
      Script ran successfully.

      == Logs ==
      Bridge implementation 0x01...
      Bridge Proxy 0x22...
      Bridge Token 0xa5...
   ```

### Solana Bridge Deployment

1. In [Anchor.toml](solana-bridge/Anchor.toml) update cluster to the desired one:
   ```bash
   cluster = "devnet"/"localnet"/"mainnet"
   ```

2. Deploy the Solana program and initialize it, to do that uses a script stored in the test folder:
   ```bash
   anchor run deploy
   ```

   Deployment data is in file 'bridge-deployment.json'
   ```json
   {
      "programId": "Fb...",
      "bridge": "AB...",
      "seed": "15...",
      "timestamp": "20..."
   }
   ```

## Architecture

### Bridge Flow

The bridge operates through the following simplified flow:

1. **Lock on Source Chain**: When a user initiates a bridge transaction, their NFT is transfer to the bridge and locked on the source chain.
2. **Cross-Chain Message**: An event is sent and caught by the relayer.
3. **Validation**: The relayer validates the event and the lock of the NFT.
4. **Mint/Release on Destination Chain**: Upon successful validation, the relayer gets the metadata and mints the NFT on the destination chain.

### Metadata Handling

The NFT metadata is preserved across chains by maintaining its original content. This includes:

   - Token URI Preservation: The original metadata link (e.g., IPFS/Arweave) is retained to ensure consistency.

   - Seamless Cross-Chain Representation: Users receive an equivalent NFT on the destination chain with the same attributes as the original.

When an NFT is minted on Solana, it adheres to the Metaplex Token Metadata Standard, ensuring compatibility with Solana's NFT ecosystem


### Common Issues

1. **Lock file version 4 requires**:  Change Cargo.lock version to 3.
2. **Transaction Pending**: Bridge transactions may take some minutes to complete depending on network congestion.
3. **Failed Transaction**: 
   - Check that your account and the bridge have enough native tokens for gas fees on both chains
   - Ensure you have approved the bridge contract to transfer your NFT

## Security

This codebase is provided as-is. Users should perform their own security audits before using in production.

## License
This project is licensed under the terms specified in the [LICENSE](./LICENSE) file.
