// SPDX-License-Identifier: Unknown
pragma solidity ^0.8.0;
import "./ERC20.sol";
contract ERC20Mintable is ERC20{
    function mint(address to, uint256 value) external returns (bool) {
        _mint(to, value);
        return true;
    }
}