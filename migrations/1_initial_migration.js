const Migrations = artifacts.require("Migrations");

module.exports = function (deployer,network) {
  process.env.NETWORK = network;
  //https://ethereum.stackexchange.com/questions/47179/what-is-the-proper-method-of-detecting-the-network-inside-of-a-truffle-test-file
  //process.env.NETWORK = deployer.network;
  deployer.deploy(Migrations);
};
