const { expect } = require("chai");
const { transferPromiseness } = require("chai-as-promised");
const { assert } = require("console");

const Wrapper = artifacts.require("PortableStakePerformanceTesting");
const Wrapped = artifacts.require("StakeableTokenMock");

contract('Wrapper performance', (accounts) => {
  before(async()=>{
    this.wrapper = await Wrapper.deployed();
    this.wrapped = await Wrapped.deployed();
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
  }
 
  const GetCurrentDay = async function(contract){
    return (await contract.currentDay()).toNumber();
  };
  const GetTokenId = async function(contract, owner, tokenIndex){
    return await contract.tokenOfOwnerByIndex(owner, tokenIndex);
  };
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
  
  var InterTestInfo;
  it("Should prepare for performance tests", async () => {
    await LetNDaysPass(this.wrapped, 1);
    amount = await ConvertToSmallDenomination(this.wrapped, 100);
    const staker = accounts[2];
    const stakeIndex = await this.wrapped.stakeCount(this.wrapper.address);
    InterTestInfo = {
      amount : amount,
      contractOwner: accounts[0],
      referrer:accounts[1],
      staker:staker,
      days:10,
      fee:amount / BigInt(20),//5%      
      tokenId:BigInt(100),
      stakeIndex: stakeIndex
    };
    var stakerBalance = await GetBalance(this.wrapped, staker);
    if(stakerBalance < amount){
      await MintStakeable(this.wrapped, amount - stakerBalance, staker);
    }
    await Approve(this.wrapped, staker, this.wrapper.address, amount);
    stakerBalance = await GetBalance(this.wrapped, staker);
    assert(stakerBalance >= amount,"wrong staker balance");
  });
  it("Should measure incrementTokenIdCounter", async()=>{ 
    await this.wrapper.incrementTokenIdCounter();
  });
  it("Should measure checkInput", async()=>{
    assert(typeof InterTestInfo == "object", "info missing");   
    await this.wrapper.checkInput(InterTestInfo.amount,InterTestInfo.days);
  });
  it("Should measure takePosession", async()=>{
    assert(typeof InterTestInfo == "object", "info missing");   
    await this.wrapper.takePosession(InterTestInfo.staker,InterTestInfo.amount);
  });
  
  it("Should measure calculateAndChargeFees", async()=>{
    assert(typeof InterTestInfo == "object", "info missing");   
    const rewardStretching = 20;
    await this.wrapper.calculateAndChargeFees(InterTestInfo.amount, InterTestInfo.fee, InterTestInfo.referrer);
  });  
  it("Shoul measure startStake", async()=>{
    const fees = await this.wrapper.calculateFees(InterTestInfo.amount, InterTestInfo.fee);
    InterTestInfo.stakeAmount = InterTestInfo.amount - BigInt(fees[0]) - BigInt(fees[1]);
    await this.wrapper.startStake(InterTestInfo.stakeAmount, InterTestInfo.days)
  });
  it("Shoul measure confirmStake", async()=>{
    await this.wrapper.confirmStake(InterTestInfo.stakeIndex);
  });
  it("Should measure mintToken", async()=>{
    assert(typeof InterTestInfo == "object", "info missing");   
    const rewardStretching = BigInt( 20);
    await this.wrapper.mintToken(InterTestInfo.tokenId, rewardStretching, InterTestInfo.staker,{from:InterTestInfo.staker});
  });
  // it("Should mature", async()=>{
  //   assert(typeof InterTestInfo == "object", "info missing"); 
  //   LetNDaysPass(this.wrapped, InterTestInfo.days + 1);
  // }); 
  // it("Should measure settle", async()=>{
  //   assert(typeof InterTestInfo == "object", "info missing"); 
  //   const staker = InterTestInfo.staker;
  //   const tokenId = await GetTokenId(this.wrapper, staker, 1);
  //   assert(tokenId>=0, "tokenId:" + tokenId);
  //   const stakeIndex = await this.wrapper.getStakeIndex(tokenId);
  //   assert(stakeIndex >= 0, "stakeIndex:" + stakeIndex);
  //   await this.wrapper.settle(tokenId, stakeIndex, {from:staker});
  // });
  
});