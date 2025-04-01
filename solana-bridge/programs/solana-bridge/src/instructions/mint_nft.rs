use anchor_lang::prelude::*;
use anchor_spl::associated_token::AssociatedToken;
use anchor_spl::metadata::{
    create_master_edition_v3, create_metadata_accounts_v3, CreateMasterEditionV3,
    CreateMetadataAccountsV3, Metadata,
};
use anchor_spl::token::{mint_to, Mint, MintTo, Token, TokenAccount};
use mpl_token_metadata::types::DataV2;

use crate::data;
use crate::errors::Errors;

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
        let id_bytes = id.to_le_bytes();
        let seeds = &["mint".as_bytes(), seed_p1.as_bytes(), seed_p2.as_bytes(), id_bytes.as_ref(), &[ctx.bumps.mint]];


        mint_to(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                MintTo {
                    authority: ctx.accounts.backend.to_account_info(),
                    to: ctx.accounts.destination_token_account.to_account_info(),
                    mint: ctx.accounts.mint.to_account_info(),
                },
                &[&seeds[..]],
            ),
            1, 
        )?;

        create_metadata_accounts_v3(
            CpiContext::new_with_signer(
                ctx.accounts.metadata_program.to_account_info(),
                CreateMetadataAccountsV3 {
                    payer: ctx.accounts.backend.to_account_info(),
                    mint: ctx.accounts.mint.to_account_info(),
                    metadata: ctx.accounts.nft_metadata.to_account_info(),
                    mint_authority: ctx.accounts.backend.to_account_info(),
                    update_authority: ctx.accounts.backend.to_account_info(),
                    system_program: ctx.accounts.system_program.to_account_info(),
                    rent: ctx.accounts.rent.to_account_info(),
                },
                &[&seeds[..]],
            ),
            DataV2 {
                name,
                symbol,
                uri,
                seller_fee_basis_points: 0,
                creators: None,
                collection: None,
                uses: None,
            },
            true,
            true,
            None,
        )?;

        create_master_edition_v3(
            CpiContext::new_with_signer(
                ctx.accounts.metadata_program.to_account_info(),
                CreateMasterEditionV3 {
                    edition: ctx.accounts.master_edition_account.to_account_info(),
                    payer: ctx.accounts.backend.to_account_info(),
                    mint: ctx.accounts.mint.to_account_info(),
                    metadata: ctx.accounts.nft_metadata.to_account_info(),
                    mint_authority: ctx.accounts.backend.to_account_info(),
                    update_authority: ctx.accounts.backend.to_account_info(),
                    system_program: ctx.accounts.system_program.to_account_info(),
                    token_program: ctx.accounts.token_program.to_account_info(),
                    rent: ctx.accounts.rent.to_account_info(),
                },
                &[&seeds[..]],
            ),
            Some(1),
        )?;

        
    emit!(TokenMintedEvent {
        mint: ctx.accounts.mint.key(),
        destination_token_account: ctx.accounts.destination_token_account.key(),
        request_id: request_id,
    });

        Ok(())        
    }


#[derive(Accounts)]
#[instruction(id: u64, seed_p1: String, seed_p2: String)]
pub struct CreateNFT<'info> {
    #[account(mut, has_one = backend @ Errors::NotBridgeBackend)]
    pub bridge: Account<'info, data::Bridge>,

    #[account(mut)]
    pub backend: Signer<'info>,

    #[account( 
    init,
    payer = backend, 
    mint::decimals = 0,
    mint::authority = backend,
    mint::freeze_authority = backend,
    seeds = [b"mint".as_ref(), seed_p1.as_bytes(), seed_p2.as_bytes(), id.to_le_bytes().as_ref()], 
    bump)]
    pub mint: Account<'info, Mint>,
    
    #[account(
        init_if_needed,
        payer = backend,
        associated_token::mint = mint,
        associated_token::authority = recipient,
    )]
    pub destination_token_account: Account<'info, TokenAccount>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub recipient: SystemAccount<'info>,

    pub rent: Sysvar<'info, Rent>,
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub metadata_program: Program<'info, Metadata>,
    #[account(
        mut,
        seeds = [
            b"metadata".as_ref(),
            metadata_program.key().as_ref(),
            mint.key().as_ref(),
            b"edition".as_ref(),
        ],
        bump,
        seeds::program = metadata_program.key()
    )]
    /// CHECK:
    pub master_edition_account: UncheckedAccount<'info>,
    #[account(
        mut,
        seeds = [
            b"metadata".as_ref(),
            metadata_program.key().as_ref(),
            mint.key().as_ref(),
        ],
        bump,
        seeds::program = metadata_program.key()
    )]
    /// CHECK:
    pub nft_metadata: UncheckedAccount<'info>,
}


#[event]
pub struct TokenMintedEvent {
    pub mint: Pubkey,
    pub destination_token_account: Pubkey,
    pub request_id: String,
}
