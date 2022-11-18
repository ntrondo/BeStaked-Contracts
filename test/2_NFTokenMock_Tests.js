const NFTokenMock = artifacts.require("NFTokenMock");


contract('NFTokenMock', (accounts) => { 
    const GetTokenCount = async function(contract, address){
        let countString = await contract.balanceOf(address);
        return BigInt(countString);
    } ;
    const Mint = async function(contract, address, tokenId){
        await contract.mint(address, tokenId);
    };
    const Transfer = async function(contract, sender, receiver, tokenId){
        await contract.transferFrom(sender, receiver, tokenId,{from:sender});
    };
    const GetOwner = async function(contract, tokenId){
        return await contract.ownerOf(tokenId);
    };
    const TokenIds = [];
  it("Should be mintable", async () => {
    const contract = await NFTokenMock.deployed();
    const account = accounts[0];
    for(var i = 4732; i < 4742; i++){
        TokenIds.push(i);
    }    
    const initialCount = await GetTokenCount(contract, account);
    for(var i = 0; i < TokenIds.length;i++){
        await Mint(contract, account, TokenIds[i]);
    }    
    const finalCount = await GetTokenCount(contract, account);
    const difference = finalCount - initialCount;

    assert(difference == TokenIds.length, "tokens was not minted");
  });
  it("Should be transferrable", async () => {
    const contract = await NFTokenMock.deployed();
    const tokenId = TokenIds[0];
    const sender = await GetOwner(contract, tokenId);
    const receiver = accounts[5];
    assert(sender != receiver, "sender == receiver");
    await Transfer(contract, sender,receiver,tokenId);
    const owner =  await GetOwner(contract, tokenId);
    assert(owner == receiver, "receiver is not owner afrer transfer");
  });
});