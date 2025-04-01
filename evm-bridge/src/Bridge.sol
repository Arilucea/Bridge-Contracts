// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts/interfaces/IERC721.sol";
import {BridgeToken} from "./ERC721.sol";

library BridgeStorage {
    bytes32 constant COUNTER_STORAGE = keccak256("storage.bridge.arilucea");

    struct Layout {
        address nftToken;
        address bridgeBackend;
    }

    function bridgeStorage() internal pure returns (Layout storage $) {
        bytes32 position = COUNTER_STORAGE;
        assembly {
            $.slot := position
        }
    }
}

contract Bridge is Initializable, UUPSUpgradeable, OwnableUpgradeable {
    event NewRequest(string requestId, address tokenContract, uint256 tokenId);
    event TokenMinted(string requestId, address tokenContract, address to, uint256 tokenId);

    error UnauthorizedAddress(address);

    function initialize() public initializer {
        __Ownable_init(msg.sender);
        __UUPSUpgradeable_init();
    }

    function setNFTToken(address token) external onlyOwner {
        BridgeStorage.Layout storage $ = BridgeStorage.bridgeStorage();
        $.nftToken = token;
    }

    function setBackendAddress(address backend) external onlyOwner {
        BridgeStorage.Layout storage $ = BridgeStorage.bridgeStorage();
        $.bridgeBackend = backend;
    }

    function newBridgeRequest(
        string calldata requestId,
        address tokenContract,
        address tokenOwner,
        uint256 tokenId
    ) external {
        BridgeStorage.Layout storage $ = BridgeStorage.bridgeStorage();
        if (msg.sender != $.bridgeBackend) {
            revert UnauthorizedAddress(msg.sender);
        }
        IERC721(tokenContract).transferFrom(tokenOwner, address(this), tokenId);
        emit NewRequest(requestId, tokenContract, tokenId);
    }

    function mintToken(
        string calldata requestId,
        address to,
        uint256 tokenId,
        string calldata tokenURI
    ) external {
        BridgeStorage.Layout storage $ = BridgeStorage.bridgeStorage();
        if (msg.sender != $.bridgeBackend) {
            revert UnauthorizedAddress(msg.sender);
        }
        BridgeToken($.nftToken).mint(to, tokenId, tokenURI);
        emit TokenMinted(requestId, $.nftToken, to, tokenId);
    }

    function tokenAddress() external view returns (address) {
        BridgeStorage.Layout storage $ = BridgeStorage.bridgeStorage();
        return ($.nftToken);
    }

    function backendAddress() external view returns (address) {
        BridgeStorage.Layout storage $ = BridgeStorage.bridgeStorage();
        return ($.bridgeBackend);
    }

    function _authorizeUpgrade(
        address newImplementation
    ) internal override onlyOwner {}
}
