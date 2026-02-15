// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import {Script, console} from "forge-std/Script.sol";
import {StdPrecompiles} from "tempo-std/StdPrecompiles.sol";
import {StdTokens} from "tempo-std/StdTokens.sol";
import {PacketPool} from "../src/PacketPool.sol";

contract PacketPoolScript is Script {
    function run() public {
        vm.startBroadcast();

        // Set fee token so deployer pays gas in a stablecoin
        address feeToken = vm.envOr("TEMPO_FEE_TOKEN", StdTokens.ALPHA_USD_ADDRESS);
        StdPrecompiles.TIP_FEE_MANAGER.setUserToken(feeToken);

        // Deploy — no constructor args needed
        PacketPool pool = new PacketPool();
        console.log("PacketPool deployed at:", address(pool));

        vm.stopBroadcast();
    }
}
