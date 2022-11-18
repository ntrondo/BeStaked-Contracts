## BeStaked DiFi
The payload of this repo are the smart contracts:
- [StakeableTokenMock](/contracts/Stakeable/StakeableToken.sol#L1461) for testing
- [PortableStake](/contracts/Stakeable/PortableStake.sol#L32) 

The other stuff here is testing and deployment logic.

[Portable stake on ethereum main net](https://etherscan.io/address/0x22E1A96E3103AC7a900DF634d0E2696D05100856)

## Description
### Background
The token [HEX](https://hex.com/) is a standard [ERC20](https://ethereum.org/en/developers/docs/standards/tokens/erc-20/) token on the ethereum blockchain. One of its features is staking. Staking of HEX involves not being able to access (read transfer) the tokens for a preselected period of time. The staker is rewarded for this at the end of the period when the staked tokens plus a generous yield is returned to him.
### Transferable stakes
BeStaked enables stakes that are transferable.

## Getting Started
This is a node.js truffle project. Navigate to project folder with CMD.
Use npm install to retrieve required packages.

To run the code in this repo the following is required:
- [NPM](https://www.npmjs.com/)
- [Ganache](https://trufflesuite.com/ganache/)
