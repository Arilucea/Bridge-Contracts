// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract BridgeToken is ERC721URIStorage, Ownable {

    address bridge;
    error UnauthorizedMint(address);

    constructor(string memory name_, string memory symbol_) ERC721(name_, symbol_) Ownable(msg.sender) {}

    function mint(address to, uint256 tokenId, string calldata _tokenURI) external {
        if (msg.sender != bridge) {
            revert UnauthorizedMint(msg.sender);
        }
        _mint(to, tokenId);
        _setTokenURI(tokenId, _tokenURI);
    }


    function setBridge(address bridge_) external onlyOwner {
        bridge = bridge_;
    }

}