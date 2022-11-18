const StakeableToken = artifacts.require("StakeableTokenMock");

contract('StakeableToken', (accounts) => {
  const GetBalance = async function(contract, address){
    let balanceString = await contract.balanceOf(address);
    let balance = BigInt(balanceString);
    return balance;
  };
  const ConvertToSmallDenomination = async function(contract, largeDenominationAmount){
    let d = await contract.decimals();//8
    let factor1 = BigInt(Math.pow(10, d));
    let factor2 = BigInt(largeDenominationAmount);
    return factor1 * factor2;
  };
  const Mint = async function(contract, largeUnitAmount, address){
    let smallUnitAmount = await ConvertToSmallDenomination(contract, largeUnitAmount);
    await contract.mint(address, smallUnitAmount);
  };
  const GetCurrentDay = async function(contract){
    return (await contract.currentDay()).toNumber();
  };
  const SetCurrentDayAndUpdate = async function(contract, day){
    await contract.setCurrentDay(day);
    await contract.dailyDataUpdate(0);
  };
  const Stake = async function(contract, largeUnitAmount, days, address){
    let smallUnitAmount = await ConvertToSmallDenomination(contract, largeUnitAmount);
    await contract.stakeStart(smallUnitAmount, days, {from:address});
  };
  const StakeCount = async function(contract, address){
    return (await contract.stakeCount(address)).toNumber();
  };
  const GetStakeId = async function(contract, address, stakeIndex){
    let stakeStore = await contract.stakeLists(address, stakeIndex);
    return stakeStore.stakeId;
  };
  const UnStake = async function(contract, stakeIndex, stakeId, address){
    await contract.stakeEnd(stakeIndex, stakeId,{from:address}); 
  };
  it("Should answer to balanceOf calls", async () => {
    const contract = await StakeableToken.deployed();
    const account = accounts[0];
    const balance = await GetBalance(contract, account);
    assert(balance >= 0, "balanceOf not working");
  });
  it('should be mintable', async () => {
    const contract = await StakeableToken.deployed();
    const account = accounts[0];
    const startingBalance = await GetBalance(contract, account);
    const largeUnitAmount = 20;
    await Mint(contract, largeUnitAmount, account);    
    const finalBalance = await GetBalance(contract, account);  
    const expectedBalance = startingBalance + await ConvertToSmallDenomination(contract,largeUnitAmount);
    const message = "minting not correct. " + startingBalance + "+" + largeUnitAmount + "!=" + finalBalance;
    assert.equal(finalBalance, expectedBalance, message);
  });
  it('Should have a time machine', async () =>{
    const contract = await StakeableToken.deployed();
    await contract.dailyDataUpdate(0);
    var initialDay = await GetCurrentDay(contract);    
    const skipDays = 100;
    const desiredCurrentDay = skipDays + initialDay;
    await SetCurrentDayAndUpdate(contract, desiredCurrentDay);
    const newCurrentDay = await GetCurrentDay(contract);
    assert(newCurrentDay == desiredCurrentDay, "time machine not working");
  });
  it("Should create a stake", async () => {
    const contract = await StakeableToken.deployed();
    const account = accounts[3];
    const initialStakeCount = await StakeCount(contract, account);
    
    const amount = 200;//200 hex
    const days = 5000;

    await Mint(contract, amount, account);
    await Stake(contract, amount, days, account);
    
    const stakeCount = await StakeCount(contract, account);
    assert(stakeCount == initialStakeCount + 1, "stake not created");
    const stakeId= await GetStakeId(contract, account, initialStakeCount);
    assert(stakeId > 0, "no stake id " + typeof stakeStore);
  });  
 
  it("Should use inflation bug, create a stake, time travel, end stake and receive a return", async () => {
    const contract = await StakeableToken.deployed();
    const account = accounts[4];
    const largeUnitAmount = 200;
    const days = 50;

    //Mint funds
    await Mint(contract, largeUnitAmount, account);
    const balanceBeforeStake =  await GetBalance(contract, account);
    assert(balanceBeforeStake >= await ConvertToSmallDenomination(contract,largeUnitAmount),"amount is not correct");

    //Start stake, increment day, update
    const initialDay = await GetCurrentDay(contract);
    const initialStakeCount = await StakeCount(contract, account);
    await Stake(contract, largeUnitAmount, days, account);
    await SetCurrentDayAndUpdate(contract, initialDay + 1);

    //Confirm stake created
    var stakeCount = await StakeCount(contract, account);
    assert(stakeCount == (initialStakeCount + 1), "stake not created");
    
    //Get stake id
    const stakeId = await GetStakeId(contract, account, stakeCount - 1);
    assert(stakeId > 0, "no stake id");
    
    //Mature stake
    await SetCurrentDayAndUpdate(contract, initialDay + days + 1);
    
    //End stake
    const stakeIndex = initialStakeCount;
    await UnStake(contract, stakeIndex, stakeId, account);
    stakeCount = await StakeCount(contract, account);
    assert(stakeCount == initialStakeCount, "stake not ended");
    
    //Check profit
    const balanceAfterStakeEnded = await GetBalance(contract, account);     
    assert(balanceAfterStakeEnded > balanceBeforeStake, "no profit on stake, final balance:" + balanceAfterStakeEnded.toString());
  }); 
});
