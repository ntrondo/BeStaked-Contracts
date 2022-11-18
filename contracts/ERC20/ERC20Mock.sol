// SPDX-License-Identifier: Unknown
pragma solidity ^0.8.0;

import "./ERC20Mintable.sol";
contract ERC20Mock is ERC20Mintable {
    /* ERC20 constants */
    string public constant name = "ERC20 Mock";
    string public constant symbol = "MockERC20";
    uint8 public constant decimals = 8;

    
}