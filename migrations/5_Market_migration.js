const StakeableTokenMock = artifacts.require("StakeableTokenMock");
/// const PortableStakePT = artifacts.require("PortableStakePerformanceTesting");
// const PortableStake = artifacts.require("PortableStake");
const Market = artifacts.require("BeStakedNFTMarketV1");
module.exports = function (deployer, network, accounts) {
  let stakeableAddress;
  if( network == "develop" || network == "ui"){ stakeableAddress = StakeableTokenMock.address;  }
  else if (network == "ropsten") { stakeableAddress = "0xf1633e8d441f6f5e953956e31923f98b53c9fd89"; }
  else if (network == "ethereum") { stakeableAddress = "0x2b591e99afe9f32eaa6214f7b7629768c40eeb39"; }  
  else { stakeableAddress = null; }
  if (stakeableAddress != null) {
    return deployer.deploy(Market, stakeableAddress);
  }
};