use anchor_lang::prelude::*;
use anchor_spl::token::{burn, Burn, Mint, Token, TokenAccount};

use crate::{data::Bridge, errors::Errors};

pub fn burn_token(ctx: Context<BurnToken>) -> Result<()> {
    let bridge = &mut ctx.accounts.bridge;

    let signer_seeds: [&[&[u8]]; 1] =
        [&[b"bridge", &bridge.seed.to_le_bytes()[..], &[bridge.bump]]];

    burn(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            Burn {
                mint: ctx.accounts.mint.to_account_info(),
                from: ctx.accounts.bridge_token_account.to_account_info(),
                authority: ctx.accounts.bridge.to_account_info(),
            },
            &signer_seeds,
        ),
        1,
    )?;

    Ok(())
}

#[derive(Accounts)]
pub struct BurnToken<'info> {
    #[account(mut, has_one = backend @ Errors::NotBridgeBackend)]
    pub bridge: Account<'info, Bridge>,

    #[account(mut)]
    pub mint: Account<'info, Mint>,

    #[account(mut)]
    pub bridge_token_account: Account<'info, TokenAccount>,

    #[account(mut)]
    pub backend: Signer<'info>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}
