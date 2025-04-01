// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Script, console} from "forge-std/Script.sol";
import {Bridge} from "../src/Bridge.sol";
import {BridgeToken} from "../src/ERC721.sol";
import {MyUUProxy} from "../src/Proxy.sol";

contract BridgeScript is Script {

    Bridge public bridge;
    MyUUProxy public proxy;
    BridgeToken public bridgeToken;


    function run() public {
        vm.startBroadcast();
        address backend = vm.envAddress("BACKEND_ADDRESS");

        bridge = new Bridge();
        bridgeToken = new BridgeToken("Bridge NFT", "BNFT");
        console.log("Bridge implementation", address(bridge));

        bytes memory data = abi.encodeWithSelector(Bridge.initialize.selector);
        proxy = new MyUUProxy(address(bridge), data);
        bridge = Bridge(address(proxy));

        bridgeToken.setBridge(address(bridge));
        bridge.setNFTToken(address(bridgeToken));
        bridge.setBackendAddress(backend);
        
        vm.stopBroadcast();
        console.log("Bridge Proxy",  address(bridge));
        console.log("Bridge Token", address(bridgeToken));
    }

}
