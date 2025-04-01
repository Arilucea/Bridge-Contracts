use anchor_lang::error_code;

#[error_code]
pub enum Errors {
    #[msg("Not bridge backend")]
    NotBridgeBackend,
}
