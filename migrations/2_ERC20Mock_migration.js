const ERC20Mock = artifacts.require("ERC20Mock");
module.exports = function (deployer,network) {
  if(typeof network == "undefined"){
    throw Error("network is undefined");
  }
  if(network == null){
    throw Error("network is null");
  }
  if(network.length == 0){
    throw Error("network is empty string");
  }
  if(network == "develop"){
    //throw Error("network is:" + network);
    deployer.deploy(ERC20Mock);
  }
};
