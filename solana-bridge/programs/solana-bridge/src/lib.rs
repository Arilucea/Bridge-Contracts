use anchor_lang::prelude::*;

mod data;
mod errors;
mod instructions;
use instructions::*;

declare_id!("2ysHAVbpzL1tMPEvx2EvMqvzyVFWHFVRRWVhSpgtkxyt");

#[program]
pub mod solana_bridge {

    use super::*;

    pub fn initialize_bridge(ctx: Context<Initialize>, seed: u64) -> Result<()> {
        instructions::initialize_bridge(ctx, seed)
    }

    pub fn new_request(ctx: Context<NewRequest>, request_id: String) -> Result<()> {
        instructions::new_request(ctx, request_id)
    }

    pub fn create_nft(
        ctx: Context<CreateNFT>,
        id: u64,
        seed_p1: String,
        seed_p2: String,
        name: String,
        symbol: String,
        uri: String,
        request_id: String,
    ) -> Result<()> {
        instructions::create_nft(ctx, id, seed_p1, seed_p2, name, symbol, uri, request_id)
    }

    pub fn burn_token(ctx: Context<BurnToken>) -> Result<()> {
        instructions::burn_token(ctx)
    }
}
