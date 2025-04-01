// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Test, console} from "forge-std/Test.sol";
import {Bridge} from "../src/Bridge.sol";
import {BridgeToken} from "../src/ERC721.sol";
import {MyUUProxy} from "../src/Proxy.sol";
import {ERC721Test} from "./ERC721Test.sol";

contract BridgeTest is Test {
    Bridge public bridge;
    MyUUProxy public proxy;
    BridgeToken public bridgeToken;
    ERC721Test public testToken;

    address backend = address(2);

    function setUp() public {
        bridge = new Bridge();
        bridgeToken = new BridgeToken("Bridge NFT", "BNFT");
        testToken = new ERC721Test("Test", "t");

        bytes memory data = abi.encodeWithSelector(Bridge.initialize.selector);
        proxy = new MyUUProxy(address(bridge), data);
        bridge = Bridge(address(proxy));

        bridgeToken.setBridge(address(bridge));
        bridge.setNFTToken(address(bridgeToken));
        bridge.setBackendAddress(backend);

        console.log("Bridge--------------", address(bridge));
        console.log("Test token--------------", address(testToken));

    }

    function test_setToken() public view {
        assertEq(bridge.tokenAddress(), address(bridgeToken));
    }

    function test_setBackend() public view {
        assertEq(bridge.backendAddress(), backend);
    }

    function test_newRequest() public {
        testToken.mint(address(1), 1, "...........");

        vm.prank(address(1));
        testToken.approve(address(bridge), 1);

        vm.expectEmit(true, false, false, true);
        vm.prank(backend);
        emit Bridge.NewRequest("12345", address(testToken), 1);
        bridge.newBridgeRequest("12345", address(testToken), address(1), 1);
    }

    function test_mintToken() public {
        bridge.setNFTToken(address(bridgeToken));

        vm.expectEmit(true, false, false, true);
        vm.prank(backend);
        emit Bridge.TokenMinted("Request id....", address(bridgeToken), address(3), 5);
        bridge.mintToken("Request id....", address(3), 5, "URI");

        assertEq(bridgeToken.ownerOf(5), address(3));
    }

    function test_onlyBackendCanCallRequest() public {
        vm.expectRevert();
        bridge.newBridgeRequest("12345", address(testToken), address(1), 1);
    }

    function test_onlyBackendCanCallMint() public {
        vm.expectRevert();
        bridge.mintToken("Request id....", address(3), 5, "URI");
    }
}
