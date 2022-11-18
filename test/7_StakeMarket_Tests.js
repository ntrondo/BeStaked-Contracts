const { expect } = require("chai");
const { transferPromiseness } = require("chai-as-promised");
const { assert } = require("console");

const Wrapper = artifacts.require("PortableStake");
const WrapperPT = artifacts.require("PortableStakePerformanceTesting");
const Wrapped = artifacts.require("StakeableTokenMock");
const Market = artifacts.require("BeStakedNFTMarketV1");
contract('Market, BeStakedNFTMarket', (accounts) => {
    before(async()=>{
        this.wrapped = await Wrapped.deployed();
        let network = process.env.NETWORK;
        if(network == "develop"){
          this.wrapper = await WrapperPT.deployed();
        }else{
          this.wrapper = await Wrapper.deployed();
        } 
        this.market = await Market.deployed();
      });
      const GetBalance = async function(contract, address){
        let balanceString = await contract.balanceOf(address);
        let balance = BigInt(balanceString);
        return balance;
      };
      const MintStakeable = async function(contract, smallUnitAmount, address){
        await contract.mint(address, smallUnitAmount);
      };
      const MintPortable = async function(contract, smallUnitAmount,  staker){
        await contract.mintMaxDays(smallUnitAmount,{from:staker});
      };
      const ConvertToSmallDenomination = async function(contract, largeDenominationAmount){
        let d = await contract.decimals();//8
        let factor1 = BigInt(Math.pow(10, d));
        let factor2 = BigInt(largeDenominationAmount);
        return factor1 * factor2;
      };
      const GetTokenId = async function(contract, owner, tokenIndex){
        return Number(await contract.tokenOfOwnerByIndex(owner, tokenIndex));
      };
      const List = async function(listingContract, tokenContract, tokenId, price, seller){
        await listingContract.List(tokenContract.address, tokenId, price, {from:seller});
      };
      const GetIsListingHealthy = async(listingContract, listingId, from)=>{
          let canSell = await listingContract.CanSell(listingId,{from:from});
          return canSell;
        
      };
      const Approve = async function(contract, sender, spender, amountOrId){
        await contract.approve(spender, amountOrId,{from:sender});
      };
      var InterTestInfo;
      it("Should wrap stakes", async () => {
        let amount = await ConvertToSmallDenomination(this.wrapped, 1000);
        let count = 3;
        const requiredAmount = amount * BigInt(count);
        const staker = accounts[1];
        const buyer = accounts[2];
        var stakerBalance = await GetBalance(this.wrapped, staker);
        if(stakerBalance < requiredAmount){
            await MintStakeable(this.wrapped, requiredAmount - stakerBalance, staker);
        }
        const buyerBalance = await GetBalance(this.wrapped, buyer);
        if(buyerBalance < amount){
            await MintStakeable(this.wrapped, amount - buyerBalance, buyer);
        }
        await Approve(this.wrapped, staker, this.wrapper.address, requiredAmount);
        stakerBalance = await GetBalance(this.wrapped, staker);
        assert(stakerBalance == requiredAmount,"wrong staker balance");

        for (var i = 0; i < count; i++) {
            await MintPortable(this.wrapper, amount, staker);      
        } 
        
        InterTestInfo = {
          amount : amount,
          contractOwner: accounts[0],
          staker:staker,
          buyer:buyer,
          count:count
        };
        const stakeCount = Number(await GetBalance(this.wrapper, staker));
        assert(stakeCount == count, "stake count missmatch");
      });
      it("Should list the stakes for sale", async()=>{
        const seller = InterTestInfo.staker;
        
        let listingCount = Number(await GetBalance(this.market, seller));
        assert(listingCount == 0, "listing count missmatch");
        const stakeCount = Number(await GetBalance(this.wrapper, seller));
        for (var i = 0; i < stakeCount; i++) {
            let tokenId = await GetTokenId(this.wrapper, seller, i);
            assert(tokenId == i + 1, "Unexpected token id:" + tokenId);
            await List(this.market, this.wrapper, tokenId, InterTestInfo.amount, seller);  
            //confirm
            const listingId = await GetTokenId(this.market, seller, i);
            const listing = await this.market.idToToken(listingId);
            assert(listing.id == tokenId, "token id missmatch. listing id:" + listing.id);             
        } 
        listingCount = Number(await GetBalance(this.market, seller));
        assert(listingCount == stakeCount, "listing/stake count missmatch");
      });
      it("Listings should be correct", async()=>{
        const listingCount = Number(await this.market.totalSupply());
        for (var i = 0; i < listingCount; i++) {
            let listingId = await this.market.tokenByIndex(i);
            assert(listingId == i + 1, "Unexpected listing id");
            const listing = await this.market.idToToken(listingId);
            const tokenId = Number(listing.id);
            assert(listingId == tokenId, "listing/token id unexpected. token id:" + tokenId + ", listing id:" + listingId);            
        }
      });
      it("Listings should not be sellable", async()=>{
        const seller = InterTestInfo.staker;
        const buyer = InterTestInfo.buyer;
        const listingCount = Number(await GetBalance(this.market, seller));
        assert(listingCount > 0, "no listings");
        for (var i = 0; i < listingCount; i++) {
            let listingId = await GetTokenId(this.market, seller, i);
            let isHealthy = await GetIsListingHealthy(this.market, listingId, buyer);
            assert(!isHealthy, "listing is healthy");
        }
      });
      it("Anyone should remove a not sellable listing", async()=>{
        const seller = InterTestInfo.staker;
        const anyone = accounts[8];
        const listingCountBefore = Number(await GetBalance(this.market, seller));
        const listingId = await GetTokenId(this.market, seller, 0);
        assert(listingId == 1, "listingId is not 1");
        await this.market.RemoveListing(listingId, {from:anyone});
        const listingCountAfter = Number(await GetBalance(this.market, seller));
        const expectedListingCount = listingCountBefore - 1;
        assert(listingCountAfter == expectedListingCount, "listing count missmatch. before:" + listingCountBefore + ", after:" + listingCountAfter);
      });
      
      it("Listings should claim to be sellable after fixing sellers allowance", async()=>{
        const seller = InterTestInfo.staker;
        const buyer = InterTestInfo.buyer;
        const listingCount = Number(await GetBalance(this.market, seller));
        assert(listingCount > 0, "no listings");
        for (var i = 0; i < listingCount; i++) {
            let listingId = await GetTokenId(this.market, seller, i);
            let listingStore = await this.market.idToToken(listingId,{from:seller});
            let tokenId = Number(listingStore.id);
            assert(tokenId > 0 && tokenId < 100, "invalid token id");
            await Approve(this.wrapper, seller, this.market.address, tokenId);            
        }
        for (var i = 0; i < listingCount; i++) {
            let listingId = await GetTokenId(this.market, seller, i);
            let isHealthy = await GetIsListingHealthy(this.market, listingId, buyer);
            assert(isHealthy, "listing is not healthy");
        }
      });
      
      it("Listing should claim to not be buyable", async()=>{
          const buyer = InterTestInfo.buyer;
          const listingId = await this.market.tokenByIndex(0, {from:buyer});
          assert(listingId > 0 && listingId < 100, "invalid listing id");
          const canBuy = await this.market.CanBuy(listingId, {from:buyer});
          assert(!canBuy, "listing is buyable");
      });
      it("Listing should claim to be buyable after fixing buyers allowance and balance", async()=>{
        const buyer = InterTestInfo.buyer;
        await Approve(this.wrapped, buyer, this.market.address, InterTestInfo.amount);
        const listingId = await this.market.tokenByIndex(0, {from:buyer});
          assert(listingId > 0 && listingId < 100, "invalid listing id");
          const canBuy = await this.market.CanBuy(listingId, {from:buyer});
          assert(canBuy, "listing is not buyable");
      });
      
      it("Should buy stake", async()=>{
        const seller = InterTestInfo.staker;
        const buyer = InterTestInfo.buyer;
        const owner = InterTestInfo.contractOwner;
        const price = InterTestInfo.amount;
        
        const sellersWrappedBalanceBefore = Number(await GetBalance(this.wrapped, seller));
        const sellersWrapperBalanceBefore = Number(await GetBalance(this.wrapper, seller));

        const buyersWrappedBalanceBefore = Number(await GetBalance(this.wrapped, buyer));
        const buyersWrapperBalanceBefore = Number(await GetBalance(this.wrapper, buyer));

        const ownersRedeemableBefore = Number(await this.market.redeemableFees(owner));

        const listingCountBefore = Number(await this.market.totalSupply());
        const listingId = await this.market.tokenByIndex(0, {from:buyer});
    
        const canBuy = await this.market.CanBuy(listingId, {from:buyer});
        assert(canBuy == true, "can buy:" + canBuy);
        await this.market.Buy(listingId, {from:buyer});

        const sellersWrappedBalanceAfter = Number(await GetBalance(this.wrapped, seller));
        const sellersWrapperBalanceAfter = Number(await GetBalance(this.wrapper, seller));

        const buyersWrappedBalanceAfter = Number(await GetBalance(this.wrapped, buyer));
        const buyersWrapperBalanceAfter = Number(await GetBalance(this.wrapper, buyer));

        const ownersRedeemableAfter = Number(await this.market.redeemableFees(owner));

        const listingCountAfter = Number(await this.market.totalSupply());
        assert(listingCountAfter < listingCountBefore, "listing was not burned, before:" + listingCountBefore + ", after:" + listingCountAfter);
        
        assert(sellersWrappedBalanceAfter > sellersWrappedBalanceBefore, "seller did not get paid");
        assert(sellersWrapperBalanceAfter < sellersWrapperBalanceBefore, "stake was not removed from seller");
        assert(buyersWrappedBalanceAfter < buyersWrappedBalanceBefore, "buyer did not pay");
        assert(buyersWrapperBalanceAfter > buyersWrapperBalanceBefore, "buyer did not get the stake");
        assert(ownersRedeemableAfter > ownersRedeemableBefore, "owner did not get fees");
      });
      it("Should remove a sellable offer", async()=>{
        const seller = InterTestInfo.staker;
        const notSeller = accounts[5];
        const listingCountBefore = Number(await GetBalance(this.market, seller));
        const listingId = await GetTokenId(this.market, seller, 0);
        assert(listingId > 0 && listingId < 100, "invalid listing id");
        const isSellable = await GetIsListingHealthy(this.market, listingId, seller);
        assert(isSellable == true, "listing:" + listingId + " is not sellable:" + isSellable); 
        if(isSellable == false){
            const listing = await this.market.idToToken(listingId);            
            const approved = await this.wrapper.getApproved(listing.id, {from:seller});
            assert(false, "Approved:" + approved);
        }       
        await this.market.RemoveListing(listingId, {from:seller});
        const listingCountAfter = Number(await GetBalance(this.market, seller));
        const expectedListingCount = listingCountBefore - 1;
        assert(listingCountAfter == expectedListingCount, "listing count missmatch. before:" + listingCountBefore + ", after:" + listingCountAfter);
      });
    });
