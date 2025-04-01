// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";

contract ERC721Test is ERC721URIStorage {

    constructor(string memory name_, string memory symbol_) ERC721(name_, symbol_) {}

    function mint(address to, uint256 tokenId, string calldata _tokenURI) external {
        _mint(to, tokenId);
        _setTokenURI(tokenId, _tokenURI);
    }
}