// SPDX-License-Identifier: Christopher Willoch
 pragma solidity ^0.8.0;
 import "../ERC20/IERC20.sol";
 interface IERC20Wrapper {
     function getWrappedContract()external view returns(IERC20);
     function wrappedSymbol()external returns(string memory);
     function wrappedName()external returns(string memory);
 }