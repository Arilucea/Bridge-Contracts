use anchor_lang::prelude::*;

use crate::data::Bridge;

pub fn initialize_bridge(ctx: Context<Initialize>, seed: u64) -> Result<()> {
    let bridge = &mut ctx.accounts.bridge;

    bridge.seed = seed;
    bridge.bump = ctx.bumps.bridge;
    bridge.backend = ctx.accounts.signer.key();

    Ok(())
}

#[derive(Accounts)]
#[instruction(seed: u64)]
pub struct Initialize<'info> {
    #[account(init, payer=signer, space = 8 + Bridge::INIT_SPACE, seeds = [b"bridge".as_ref(), &seed.to_le_bytes()],bump)]
    pub bridge: Account<'info, Bridge>,

    #[account(mut)]
    pub signer: Signer<'info>,
    pub system_program: Program<'info, System>,
}
