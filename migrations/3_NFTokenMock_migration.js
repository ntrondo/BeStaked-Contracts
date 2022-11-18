const NFTokenMock = artifacts.require("NFTokenMock");
module.exports = function (deployer, network) {
  if(network=="develop"){
    deployer.deploy(NFTokenMock);
  }    
};
