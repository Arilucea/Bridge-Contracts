use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token::{transfer, Mint, Token, TokenAccount, Transfer},
};

use crate::{data, errors::Errors};

pub fn new_request(ctx: Context<NewRequest>, request_id: String) -> Result<()> {
    let bridge = &mut ctx.accounts.bridge;

    let signer_seeds: [&[&[u8]]; 1] =
        [&[b"bridge", &bridge.seed.to_le_bytes()[..], &[bridge.bump]]];

    transfer(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.user_token_account.to_account_info(),
                to: ctx.accounts.bridge_token_account.to_account_info(),
                authority: ctx.accounts.bridge.to_account_info(),
            },
            &signer_seeds,
        ),
        1,
    )?;

    emit!(NewRequestEvent {
        mint: ctx.accounts.mint.key(),
        user_token_account: ctx.accounts.user_token_account.key(),
        request_id: request_id,
    });

    Ok(())
}

#[derive(Accounts)]
pub struct NewRequest<'info> {
    #[account(mut, has_one = backend @ Errors::NotBridgeBackend,)]
    pub bridge: Account<'info, data::Bridge>,

    #[account(mut)]
    pub mint: Account<'info, Mint>,

    #[account(mut)]
    pub user_token_account: Account<'info, TokenAccount>,

    #[account(
        init,
        payer = backend,
        associated_token::mint = mint,
        associated_token::authority = bridge,
    )]
    pub bridge_token_account: Account<'info, TokenAccount>,

    #[account(mut)]
    pub backend: Signer<'info>,

    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
}

#[event]
pub struct NewRequestEvent {
    pub mint: Pubkey,
    pub user_token_account: Pubkey,
    pub request_id: String,
}
