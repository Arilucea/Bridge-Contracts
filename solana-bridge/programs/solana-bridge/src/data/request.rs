use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct Bridge {
    pub backend: Pubkey,

    pub seed: u64,
    pub bump: u8,
}

impl<'info> Bridge {
    pub fn initialize(&mut self) {}
}
