const ERC20Mock = artifacts.require("ERC20Mock");


contract('ERC20Mock', (accounts) => {
  before(async()=>{
    this.contract = await ERC20Mock.deployed();
  });
  const GetBalance = async function(contract, address){
    let balanceString = await contract.balanceOf(address);
    let balance = BigInt(balanceString);
    return balance;
  };
  const ConvertToSmallDenomination = function(contract, largeDenominationAmount){
    let factor1 = BigInt(10^contract.decimals);//18 digits
    let factor2 = BigInt(largeDenominationAmount);
    return factor1 * factor2;
  };
  const Mint = async function(contract, largeUnitAmount, address){
    let smallUnitAmount = ConvertToSmallDenomination(contract, largeUnitAmount);
    await contract.mint(address, smallUnitAmount);
  };
  const Transfer = async function(contract,sender, receiver, largeUnitAmount){
    let smallUnitAmount = ConvertToSmallDenomination(contract, largeUnitAmount);
    await contract.transfer(receiver, smallUnitAmount,{from:sender});
  };
  const TransferFrom = async function(contract,sender,spender, receiver, largeUnitAmount){
    let smallUnitAmount = ConvertToSmallDenomination(contract, largeUnitAmount);
    await contract.transferFrom(sender, receiver, smallUnitAmount,{from:spender});
  };
  const Approve = async function(contract, sender, spender, largeUnitAmount){
    let smallUnitAmount = ConvertToSmallDenomination(contract, largeUnitAmount);
    await contract.approve(spender, smallUnitAmount,{from:sender});
  };
  const GetAllowance = async function(contract, owner, spender){
    let allowanceString = await contract.allowance(owner, spender);
    let allowance = BigInt(allowanceString);
    return allowance;
  }
  it("Should answer to balanceOf calls", async () => {
    const contract = this.contract; //await ERC20Mock.deployed();
    const account = accounts[0];
    const balance = await GetBalance(contract, account);
    assert(balance >= 0, "balanceOf not working");
  });
  it('Should be mintable', async () => {
    const contract = await ERC20Mock.deployed();
    const account = accounts[0];
    const startingBalance = await GetBalance(contract, account);
    const largeUnitAmount = 20;
    await Mint(contract, largeUnitAmount, account);    
    const finalBalance = await GetBalance(contract, account);  
    const expectedBalance = startingBalance + ConvertToSmallDenomination(contract, largeUnitAmount);
    const message = "Minting not correct. " + startingBalance + "+" + largeUnitAmount + "!=" + finalBalance;
    assert.equal(finalBalance, expectedBalance, message);
  });
  it('Should be transferrable', async () => {   
    const contract = await ERC20Mock.deployed(); 
    const largeUnitTransferAmount = 5;
    const smallUnitTransferAmount = ConvertToSmallDenomination(contract, largeUnitTransferAmount);    
    const sender = accounts[1];

    await Mint(contract, largeUnitTransferAmount * 4, sender);
    const initialBalance = await GetBalance(contract, sender);
    const expectedFinalBalance = initialBalance - (BigInt(3) * smallUnitTransferAmount);
    var finalBalance;
    for(var i = 2; i <= 4; i++){
       await Transfer(contract, sender, accounts[i], largeUnitTransferAmount);
       finalBalance = await GetBalance(contract, accounts[i]);
       assert.equal(smallUnitTransferAmount, finalBalance,"balance incorrect");
    }    
    finalBalance = await GetBalance(contract, sender);
    assert.equal(finalBalance, expectedFinalBalance, "final balance incorrect");
  });
  it('Should support allowance', async () =>{
    const contract = await ERC20Mock.deployed(); 
    const sender = accounts[5];
    const spender = accounts[6];
    var expectedAllowance = BigInt(0);
    var initialAllowance = await GetAllowance(contract, sender,spender);        
    assert.equal(initialAllowance, expectedAllowance, "unexpected initial allowance");
    var finalAllowance = initialAllowance;

    var largeUnitAmount = 1;   
    var smallUnitAmount = ConvertToSmallDenomination(contract, largeUnitAmount); 
    //Check that approve is not cumulative
    for(var i = 1; i <= 2;i++){      
      expectedAllowance = smallUnitAmount;       
      await Approve(contract, sender, spender, largeUnitAmount);               
      finalAllowance = await GetAllowance(contract, sender,spender);                
      assert(expectedAllowance == finalAllowance,"unexpected allowance on " + i + "'th iteration");
    }
    await Approve(contract, sender,spender, 0);//Reset allowance

    //Test increaseAllowance

    //Test decreaseAllowance

    //Test transferFrom
    const recipient = accounts[7];
    await Mint(contract, largeUnitAmount, sender);
    await Approve(contract, sender, spender, largeUnitAmount);
    var initialBalance = await GetBalance(contract, recipient);
    await TransferFrom(contract,sender,spender,recipient,largeUnitAmount);
    var finalBalance = await GetBalance(contract, recipient);
    var expectedBalance = initialBalance + smallUnitAmount;
    assert(finalBalance == expectedBalance, "transfer not executed");    
    finalAllowance = await GetAllowance(contract, sender,spender);    
    expectedAllowance = BigInt(0);
    assert(finalAllowance == expectedAllowance, "allowance was not decreased");
  });
  // it("Should create a stake", async () => {
  //   const hexTestInstance = await HEXTest.deployed();
  //   const account = accounts[3];
  //   const initialStakeCount = await StakeCount(hexTestInstance, account);
    
  //   const amount = 200;//200 hex
  //   const days = 5000;

  //   await Inflate(hexTestInstance, amount, account);
  //   await Stake(hexTestInstance, amount, days, account);
    
  //   const stakeCount = await StakeCount(hexTestInstance, account);
  //   assert(stakeCount == initialStakeCount + 1, "stake not created");
  //   const stakeId = (await hexTestInstance.getStakeId(initialStakeCount,{from:account})).toNumber();
  //   assert(stakeId > 0, "no stake id");
  // });  
 
  // it("Should use inflation bug, create a stake, time travel, end stake and receive a return", async () => {
  //   const contract = await HEXTest.deployed();
  //   const account = accounts[4];
  //   const hexAmount = 200;
  //   const days = 50;

  //   //Mint funds
  //   await Inflate(contract, hexAmount, account);
  //   const balanceBeforeStake =  await GetBalance(contract, account);
  //   assert(balanceBeforeStake >= ConvertHexToHearts(hexAmount),"amount is not correct");

  //   //Start stake, increment day, update
  //   const initialDay = await GetCurrentDay(contract);
  //   const initialStakeCount = await StakeCount(contract, account);
  //   await Stake(contract, hexAmount, days, account);
  //   await SetCurrentDayAndUpdate(contract, initialDay + 1);

  //   //Confirm stake created
  //   var stakeCount = await StakeCount(contract, account);
  //   assert(stakeCount == (initialStakeCount + 1), "stake not created");
    
  //   //Get stake id
  //   const stakeId = (await contract.getStakeId(stakeCount - 1,{from:account})).toNumber();
  //   assert(stakeId > 0, "no stake id");
    
  //   //Mature stake
  //   await SetCurrentDayAndUpdate(contract, initialDay + days + 1);
    
  //   //End stake
  //   const stakeIndex = initialStakeCount;
  //   await UnStake(contract, stakeIndex, stakeId, account);
  //   stakeCount = await StakeCount(contract, account);
  //   assert(stakeCount == initialStakeCount, "stake not ended");
    
  //   //Check profit
  //   const balanceAfterStakeEnded = await GetBalance(contract, account);     
  //   assert(balanceAfterStakeEnded > balanceBeforeStake, "no profit on stake, final balance:" + balanceAfterStakeEnded.toString());
  // }); 
});