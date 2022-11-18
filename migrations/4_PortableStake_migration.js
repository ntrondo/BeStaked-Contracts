const StakeableTokenMock = artifacts.require("StakeableTokenMock");
const PortableStakePT = artifacts.require("PortableStakePerformanceTesting");
const PortableStake = artifacts.require("PortableStake");
module.exports = function (deployer, network, accounts) {
  if (network == "ui" || network == "develop") {
    deployer.deploy(StakeableTokenMock).then(function () {
      if (network == "ui") {
        return deployer.deploy(PortableStake, StakeableTokenMock.address, 1, 5555);
      }
      if (network == "develop") {
        return deployer.deploy(PortableStakePT, StakeableTokenMock.address, 1, 5555);
      }
    });
  }
   if(network=="sepolia"){
    let stakeableAddress = "0xCE325889177a36aD87C7311568e810Ada6493779";
      return deployer.deploy(PortableStake, stakeableAddress, 1, 5555);
   }
   
    if (network == "ropsten") {
      let stakeableAddress = "0xf1633e8d441f6f5e953956e31923f98b53c9fd89";
      return deployer.deploy(PortableStake, stakeableAddress, 1, 5555);
    }
    if(network == "ethereum"){
      let stakeableAddress = "0x2b591e99afe9f32eaa6214f7b7629768c40eeb39";
      return deployer.deploy(PortableStake, stakeableAddress, 1, 5555);
    }
  };