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
  
  const GetCurrentDay = async function(contract){
    return (await contract.currentDay()).toNumber();
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
    for (var i = 0; i < count; i++) {
      await MintPortable(this.wrapper, InterTestInfo.amount,InterTestInfo.days,staker,InterTestInfo.referrer,InterTestInfo.fee);      
    } 
    const finalBalance = await GetBalance(this.wrapper, staker);
    const expectedBalance = count;
    assert(finalBalance == expectedBalance, "nft balance is wrong");
  }); 
  it("Should have consequtive ids and indices starting at 1 and 0", async()=>{    
    var token, stake;
    var expectedId, expectedIndex;
    var stakeIndex;
    for (var i = 0; i < InterTestInfo.count; i++) {
      expectedId = i + 1;//Id's start at 1
      expectedIndex = i;
      token = await this.wrapper.idToToken(expectedId);
      stakeIndex = await this.wrapper.getStakeIndex(token.tokenId);
      assert(stakeIndex == expectedIndex, "Observed stakeIndex:" + stakeIndex + "!=expected stakeIndex:" + expectedIndex);
      stake = await this.wrapped.stakeLists(this.wrapper.address, stakeIndex);
      assert(stake.stakeId == expectedId, "Stake id:" + stake.stakeId + "!=expectedStakeId:" + expectedId);      
    }
  }); 
   it("Should mature", async ()=>{
     let stakeDuration = InterTestInfo.days;
     let daysToAdvance = stakeDuration + 1;
     await LetNDaysPass(this.wrapped, daysToAdvance);
     const stake = await this.wrapped.stakeLists(this.wrapper.address, 0);
     const lockedDay = Number(stake.lockedDay);
     const stakedDays = Number(stake.stakedDays);
     const maturity = lockedDay + stakedDays;
     const currentDay = await GetCurrentDay(this.wrapped);
     const daysToMaturity = maturity - currentDay;
     assert(daysToMaturity <= 0, "Not matured");
  });  
  it("Should end a stake in the middle", async () => {
    var owner = InterTestInfo.staker;
    const tokenId = 2;
    const stakeIndex = await this.wrapper.getStakeIndex(tokenId);
    await this.wrapper.settle(tokenId, stakeIndex, {from:owner});    
  });
  it("Should keep correct indices", async ()=>{
    var owner = InterTestInfo.staker;
    var token, stake;
    var tokenId, stakeIndex;
    var count = await GetBalance(this.wrapper, owner);
    for (var i = 0; i < count; i++) {
      tokenId = Number(await this.wrapper.tokenOfOwnerByIndex(owner, i));
      stakeIndex = await this.wrapper.getStakeIndex(tokenId);
      token = await this.wrapper.idToToken(tokenId);
      assert(stakeIndex < count, "stakeIndex:" + stakeIndex + " out of boundary.");
      if(stakeIndex < count){
        stake = await this.wrapped.stakeLists(this.wrapper.address, stakeIndex);
        assert(Number(stake.stakeId) == Number(token.stakeId), "Stake id:" + stake.stakeId + "!=recorded stake id:" + token.stakeId);   
      }           
    }
  });  
});