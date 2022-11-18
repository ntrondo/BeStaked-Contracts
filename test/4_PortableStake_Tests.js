const { expect } = require("chai");
const { transferPromiseness } = require("chai-as-promised");
const { assert } = require("console");

const Wrapper = artifacts.require("PortableStake");
const WrapperPT = artifacts.require("PortableStakePerformanceTesting");
const Wrapped = artifacts.require("StakeableTokenMock");

contract('Wrapper, Portable Stake', (accounts) => {
  before(async()=>{
    this.wrapped = await Wrapped.deployed();
    let network = process.env.NETWORK;
    if(network == "develop"){
      this.wrapper = await WrapperPT.deployed();
    }else{
      this.wrapper = await Wrapper.deployed();
    }  
  });
  const GetBalance = async function(contract, address){
    let balanceString = await contract.balanceOf(address);
    let balance = BigInt(balanceString);
    return balance;
  };
  const Approve = async function(contract, sender, spender, smallUnitAmount){
    await contract.approve(spender, smallUnitAmount,{from:sender});
  };
  const ConvertToSmallDenomination = async function(contract, largeDenominationAmount){
    let d = await contract.decimals();//8
    let factor1 = BigInt(Math.pow(10, d));
    let factor2 = BigInt(largeDenominationAmount);
    return factor1 * factor2;
  };
  const MintStakeable = async function(contract, smallUnitAmount, address){
    await contract.mint(address, smallUnitAmount);
  };
  const MintPortable = async function(contract, smallUnitAmount, days, staker, referrer, fee){
    await contract.mintReferred(smallUnitAmount, days,referrer, fee,{from:staker});
  };
  const GetFirstAccountWithNonZeroBalance = async function(contract, accounts){
    let account;
    let balance;
    for(var i = 0; i < accounts.length;i++){
      account = accounts[i];
      balance = await GetBalance(contract, account);
      if(balance > 0){return account;}
    }
    return null;
  };
  const GetFirstAccountWithZeroBalance = async function(contract, accounts){
    let account;
    let balance;
    for(var i = 0; i < accounts.length;i++){
      account = accounts[i];
      balance = await GetBalance(contract, account);
      if(balance == 0){return account;}
    }
    return null;
  }
 
  const GetCurrentDay = async function(contract){
    return (await contract.currentDay()).toNumber();
  };
  const GetTokenId = async function(contract, owner, tokenIndex){
    return await contract.tokenOfOwnerByIndex(owner, tokenIndex);
  };
  const GetStake = async function(wrapper, wrapped, tokenId){
    let stakeIndex = await wrapper.getStakeIndex(tokenId);
    return await wrapped.stakeLists(wrapper.address, stakeIndex);
  }
  const SetCurrentDayAndUpdate = async function(contract, day){
    await contract.setCurrentDay(day);
    await contract.dailyDataUpdate(0);
  };  
  const LetNDaysPass = async function(contract, days){
    let currentDay = (await contract.currentDay()).toNumber();
    let targetDay = currentDay + days;
    await SetCurrentDayAndUpdate(contract, targetDay);
  };  
  // it("Should be maintainable", async () => {
  //   var owner = accounts[0];
    
  // });
  
  it("Should know the name of its underlying ERC20 token", async()=>{
    const name1 = await this.wrapper.wrappedName();
    const name2 = await this.wrapped.name();
    
    assert(typeof name1 !== 'undefined', "Name is undefined");
    assert(name1 != null, "Name is null");
    assert(name1.length > 0,"Name is empty string");
    assert(name1 == name2,"wrapped name is not correct");
  });
  var InterTestInfo;
  it("Should prepare to wrap stakes", async () => {
    await LetNDaysPass(this.wrapped, 1);
    amount = await ConvertToSmallDenomination(this.wrapped, 100);
    const staker = accounts[2];
    InterTestInfo = {
      amount : amount,
      contractOwner: accounts[0],
      referrer:accounts[1],
      staker:staker,
      count:3,
      days:10,
      fee:amount / BigInt(20)//5%
    };
    var stakerBalance = await GetBalance(this.wrapped, staker);
    const requiredAmount = amount * BigInt(InterTestInfo.count);
    if(stakerBalance < requiredAmount){
      await MintStakeable(this.wrapped, requiredAmount - stakerBalance, staker);
    }
    await Approve(this.wrapped, staker, this.wrapper.address, requiredAmount);
    stakerBalance = await GetBalance(this.wrapped, staker);
    assert(stakerBalance == requiredAmount,"wrong staker balance");
  });
  it("Should wrap stakes", async () => {
    assert(typeof InterTestInfo == "object", "info missing");  
    let count = InterTestInfo.count;  
    const staker = InterTestInfo.staker;
    //Mint portable stake           
    for (let i = 0; i < count; i++) {
      await MintPortable(this.wrapper, InterTestInfo.amount,InterTestInfo.days,staker,InterTestInfo.referrer,InterTestInfo.fee);      
    } 
    finalBalance = await GetBalance(this.wrapper, staker);
    expectedBalance = count;
    assert(finalBalance == expectedBalance, "nft balance is wrong");
  }); 
  it("Should keep referrer and owner fees", async () => {
    assert(typeof InterTestInfo == "object", "info missing");
    const contractOwner = InterTestInfo.contractOwner;
    const referrer = InterTestInfo.referrer;

    //Get fee balances
    const ownerFees = BigInt(await this.wrapper.redeemableFees(contractOwner));
    assert(ownerFees > 0, "no owners fee");
    const referrerFees = BigInt(await this.wrapper.redeemableFees(referrer));
    const expectedReferrerFees = InterTestInfo.fee * BigInt(InterTestInfo.count);
    assert(referrerFees == expectedReferrerFees,"wrong referrer fee");

    const contractBalance = await GetBalance(this.wrapped, this.wrapper.address);
    assert(contractBalance == ownerFees + referrerFees, "wrong balance");
  });
  it("Should be transferable", async () =>{
    var sender = await GetFirstAccountWithNonZeroBalance(this.wrapper, accounts);
    assert(sender != null, "sender is null");
    var receiver = await GetFirstAccountWithZeroBalance(this.wrapper, accounts);

    //note senders balance
    var initialSenderBalance = await GetBalance(this.wrapper, sender);
    const tokenIndex = Number(initialSenderBalance) - 1;
    //Get token id
    const tokenId = await GetTokenId(this.wrapper, sender, tokenIndex);
    assert(tokenId > 0, "no token id");

    //Transfer
    await this.wrapper.transferFrom(sender, receiver, tokenId,{from:sender});

    //Confirm transfer
    const owner = await this.wrapper.ownerOf(tokenId);
    assert(owner == receiver, "receiver is not owner");  
  });
   it("Should mature", async ()=>{
    //Get a holder
    const holder = await GetFirstAccountWithNonZeroBalance(this.wrapper, accounts);
    assert(holder != null, "holder is null");

    //Get token id
    const tokenId = await GetTokenId(this.wrapper, holder, 0);
    assert(tokenId > 0, "no token id");

    //Get info about token and stake
    const tokenStore = await this.wrapper.idToToken(tokenId);
    assert(typeof tokenStore == "object", "tokenStore is " + typeof tokenStore);
    //assert(tokenStore.stakeIndex >= 0, "no stakeIndex");
    var stakeStore = await GetStake(this.wrapper, this.wrapped, tokenId);
    assert(typeof stakeStore == "object", "stakeStore is " + typeof stakeStore);
    const lockedDay = Number(stakeStore.lockedDay);
    const stakedDays = Number(stakeStore.stakedDays);
    assert(lockedDay > 0, "stake not started" + lockedDay);
    assert(stakedDays > 0, "stake has no duration" + stakedDays);

    const maturity = lockedDay + stakedDays;
    var currentDay = await GetCurrentDay(this.wrapped);
    var daysToMaturity = maturity - currentDay;
    assert(daysToMaturity > 0, "daysToMaturity:"+daysToMaturity);
    
    //Wait for maturity    
    await LetNDaysPass(this.wrapped,daysToMaturity);
    
    currentDay = await GetCurrentDay(this.wrapped);
    assert(currentDay >= maturity, "maturity not reached");
  });  
  it("Should be possible to get all information about a token", async () => {
    var owner = await GetFirstAccountWithNonZeroBalance(this.wrapper, accounts);
    const tokenId = await GetTokenId(this.wrapper, owner, 0);
    assert(tokenId > 0, "no tokenId");
    const tokenStore = await this.wrapper.idToToken(tokenId);
    //assert(tokenStore.stakeIndex >= 0, "no stakeIndex");
    assert(tokenStore.stakeId >= 0, "no stakeId");
    const stakeStore = await GetStake(this.wrapper, this.wrapped, tokenId);// this.wrapped.stakeLists(this.wrapper.address, tokenStore.stakeIndex);
    assert(typeof stakeStore == "object", "stakeStore is " + typeof stakeStore);
    assert(stakeStore.lockedDay > 0, "stake not started");
    assert(stakeStore.stakedDays > 0, "wrong stake duration");
  });
  it("Should let 3 days pass", async ()=>{
    const initialDay = await GetCurrentDay(this.wrapped);
    await LetNDaysPass(this.wrapped, 3);
    const currentDay = await GetCurrentDay(this.wrapped);
    assert(currentDay > initialDay,"a day did not pass");
  });
  it("Should pay reward for ending stake past maturity", async()=>{
    const owner = InterTestInfo.staker;// await GetFirstAccountWithNonZeroBalance(this.wrapper, accounts);
    const actor = await GetFirstAccountWithZeroBalance(this.wrapper, accounts);
    const initialActorFeeBalance = BigInt(await this.wrapper.redeemableFees(actor));
    const initialOwnerBalance = [await GetBalance(this.wrapped, owner),Number(await GetBalance(this.wrapper, owner))];

    //Get token id
    const tokenId = Number(await GetTokenId(this.wrapper, owner, initialOwnerBalance[1]-2));
    assert(tokenId > 0, "no token id");

    //End stake
    const stakeIndex = await this.wrapper.getStakeIndex(tokenId);
    await this.wrapper.settle(tokenId, stakeIndex, {from:actor});

    const finalActorFeeBalance = BigInt(await this.wrapper.redeemableFees(actor));
    var finalOwnerBalance = await GetBalance(this.wrapped, owner);

    assert(finalActorFeeBalance > initialActorFeeBalance,"actor did not get paid");
    assert(finalOwnerBalance > initialOwnerBalance[0],"owner did not get paid");

    finalOwnerBalance = Number(await GetBalance(this.wrapper, owner));
    assert(finalOwnerBalance = initialOwnerBalance[1] - 1, "token not burned");
  }); 
  // it("", async()=>{});
  // it("", async()=>{}); 
});