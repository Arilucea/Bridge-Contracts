// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Script, console} from "forge-std/Script.sol";
import {Bridge} from "../src/Bridge.sol";
import {BridgeToken} from "../src/ERC721.sol";
import {MyUUProxy} from "../src/Proxy.sol";
import {ERC721Test} from "../test/ERC721Test.sol";

contract BridgeScript is Script {
    Bridge public bridge;
    MyUUProxy public proxy;
    BridgeToken public bridgeToken;
    ERC721Test public testToken;

    function run() public {
        vm.startBroadcast();
        address backend = 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266; //vm.envAddress("BACKEND_ADDRESS");

        testToken = new ERC721Test("Test", "t");
        bridge = new Bridge();
        bridgeToken = new BridgeToken("Bridge NFT", "BNFT");
        console.log("Bridge implementation", address(bridge));

        bytes memory data = abi.encodeWithSelector(Bridge.initialize.selector);
        proxy = new MyUUProxy(address(bridge), data);
        bridge = Bridge(address(0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9));

        bridgeToken.setBridge(address(bridge));
        bridge.setNFTToken(address(bridgeToken));
        bridge.setBackendAddress(backend);

        console.log("Bridge Proxy", address(bridge));
        console.log("Bridge Token", address(bridgeToken));
        console.log("Test Token", address(testToken));

        uint256 tokenId = 0;

        for (uint256 i = 10; i < 20; ++i) {
            testToken.mint(
                backend,
                i,
                "https://ipfs.io/ipfs/bafkreifziyqmhmlfzcb2vbkldizclnr2cqad62drd3nzjsj44qczjktj2e"
            );
            testToken.approve(address(bridge), i);
            tokenId = i;
        }

        bridge.newBridgeRequest("12345",address(testToken), backend, tokenId);
        bridge.mintToken("Request id....", address(bridge), tokenId, "URI");

        vm.stopBroadcast();
    }
}
