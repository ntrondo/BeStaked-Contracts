// SPDX-License-Identifier: Christopher Willoch
 pragma solidity ^0.8.0;
import "../ethereum-erc721/tokens/nf-token-enumerable.sol";
import "../ethereum-erc721/tokens/erc721-metadata.sol";
import "../ethereum-erc721/ownership/ownable.sol";
import "./IStakeable.sol";
import "../Wrapping/IERC20Wrapper.sol";
import "../lib/Reward.sol";
import "../Fees/FeeCollectorBase.sol";
import "../IERC165.sol";
abstract contract Maintainable is Ownable{
    string public  Name = "BeStaked";
    string public  Symbol = "BSTHEX";
    string public  Domain = "bestaked";
    function setConstants(string calldata n, string calldata s, string calldata d,uint8 ds, uint8 m, uint8 o)external onlyOwner() {
        Name = n;
        Symbol = s;
        Domain = d;
        DEFAULT_REWARD_STRETCHING = ds;
        MAX_REFERRAL_FEE_PERMILLE = m;
        if(o <= MAX_OWNER_FEE_PERMILLE){
            OWNER_FEE_PERMILLE = o;
        }        
    }
    uint8 public constant MIN_REWARD_STRETCHING = 10;
    uint8 public DEFAULT_REWARD_STRETCHING = 60;
    uint8 public constant MAX_REWARD_STRETCHING = 255;
    uint8 public MAX_REFERRAL_FEE_PERMILLE = 100;//10%
    uint8 public constant MAX_OWNER_FEE_PERMILLE = 10;//1%
    uint8 public OWNER_FEE_PERMILLE = 2;//0.2%
}
contract PortableStake is NFTokenEnumerable,ERC721Metadata,IERC20Wrapper,Maintainable,FeeCollectorBase{
    event PortableStakeStart(
        uint256 tokenId, 
        uint256 stakeId,
        address owner,
        uint256 feeAmount, 
        uint256 stakedAmount, 
        uint16 stakeLength,
        uint8 rewardStretching
    );
     event PortableStakeEnd(
        uint256 tokenId, 
        uint256 stakeId,
        address owner,
        address actor,
        uint256 stakedAmount, 
        uint256 unStakedAmount, 
        uint256 actorRewardAmount, 
        uint256 returnedToOwnerAmount, 
        uint16 startDay,
        uint16 stakeLength,
        uint8 lateDays
    );
 
    struct TokenStore{
         uint256 tokenId;         
         uint256 amount;
         uint40 stakeId;
         uint8 rewardStretching;
     }
     
     StakeableRef/* StakeableToken */ public StakeableTokenContract;
     uint16 public MAX_STAKE_DAYS;
     uint8 public MIN_STAKE_DAYS;
     mapping(uint256 => TokenStore) public idToToken;
     
     constructor (StakeableRef stakeableTokenContract, uint8 minStakeDays, uint16 maxStakeDays) FeeCollectorBase(stakeableTokenContract) {
         StakeableTokenContract = stakeableTokenContract;
         MIN_STAKE_DAYS = minStakeDays;
         MAX_STAKE_DAYS = maxStakeDays;
         supportedInterfaces[0x5b5e139f] = true; // ERC721Metadata
     }
     function getWrappedContract()external override view returns(IERC20){
         return StakeableTokenContract;
     }
     function wrappedSymbol()external override view returns(string memory){
         return StakeableTokenContract.symbol();
     }
     function wrappedName()external override view returns(string memory){
         return StakeableTokenContract.name();
     }
    
    /**Represents the next token id to use. Increment after using.*/
    uint256 public TokenIdCounter = 1;
    /** 
     *@dev Returns a descriptive name for a collection of NFTs in this contract. 
     *@return _name Representing name.
     */
    function name()external override view returns (string memory _name){ return Name;}

    /**
   * @dev Returns a abbreviated name for a collection of NFTs in this contract. Not applicable.
   * @return _symbol Representing symbol.
   */
    function symbol() external override view returns (string memory _symbol){return Symbol;}

    /**
    * @dev Returns a distinct Uniform Resource Identifier (URI) for a given asset. It Throws if
    * `_tokenId` is not a valid NFT. URIs are defined in RFC3986. The URI may point to a JSON file
    * that conforms to the "ERC721 Metadata JSON Schema".
    * @return URI of _tokenId.
    */
    function tokenURI(uint256 _tokenId) external override view validNFToken(_tokenId) returns (string memory)  {
        //return "http://" + Domain + "/" + Symbol + "/token" + _tokenId + "metadata" + ".json";
        return string(abi.encodePacked("http://", Domain, "/", Symbol, "/token",_tokenId, "metadata", ".json"));
    }
    struct MintingInfo{
        address owner;
        address referrer;
        uint256 amount;  
        uint256 fee;
        uint16 stakeDays;
        uint8 rewardStretching;
     }
     /** 
    * Takes possession of the amount    
    * Subtracts fees
    * Stakes the amount
    * Mints token
    */
    function mintMaxDays(uint256 amount)external{        
        _mintPS(MintingInfo(address(msg.sender),address(0), amount, 0,MAX_STAKE_DAYS, DEFAULT_REWARD_STRETCHING));
    }
    function mintCustomDays(uint256 amount, uint16 stakeDays) external{
        _mintPS(MintingInfo(address(msg.sender),address(0), amount, 0,stakeDays, DEFAULT_REWARD_STRETCHING));
    }    
    function mintReferred(uint256 amount, uint16 stakeDays, address referrer, uint256 referralFee) external{
        _mintPS(MintingInfo(address(msg.sender),referrer, amount, referralFee,stakeDays, DEFAULT_REWARD_STRETCHING));
       //_mintPS(MintingInfo(address(msg.sender),amount, stakeDays, referrer,referralFee, DEFAULT_REWARD_STRETCHING));
    }
    function mintCustomRewardStretching(uint256 amount, uint16 stakeDays, address referrer, uint256 referralFee, uint8 rewardStretching)external{
        _mintPS(MintingInfo(address(msg.sender),referrer, amount, referralFee,stakeDays, rewardStretching));
        //_mintPS(MintingInfo(address(msg.sender),amount, stakeDays, referrer,referralFee, rewardStretching));
    }
    function _mintPS(MintingInfo memory info)internal{
        //Check input
        _checkInput(info);

        //Take posession of the amount
        _takePosession(info.owner, info.amount);        
        
        //Calculate stake amount by subtracting fees from the amount 
        (uint256 feeAmount, uint256 stakeAmount) = _calculateAndChargeFees(info.amount, info.fee, info.referrer); 
             
        //Note current stake count or future stake index
        uint256 stakeIndex = StakeableTokenContract.stakeCount(address(this));        
        //Stake the amount
        _startStake(stakeAmount, info.stakeDays);
        //Get stakeId
        uint40 stakeId = _confirmStake(stakeIndex);        

        //Record and broadcast
        uint256 tokenId = _mintToken(stakeId, info.rewardStretching, info.owner);
        emit PortableStakeStart(tokenId, stakeId, info.owner, feeAmount, stakeAmount, info.stakeDays, info.rewardStretching);
    }
   
    
    /** Consumes 3 400 gas */
    function _checkInput(MintingInfo memory info) public view{
        require(info.amount > 0, "PortableStake: amount is zero");
        require(info.stakeDays >= MIN_STAKE_DAYS, "PortableStake: newStakedDays lower than minimum");
        require(info.stakeDays <= MAX_STAKE_DAYS, "PortableStake: newStakedDays higher than maximum");        
        require(info.rewardStretching >= MIN_REWARD_STRETCHING, "rewardStretcing out of bounds");
        require(info.rewardStretching <= MAX_REWARD_STRETCHING, "rewardStretcing out of bounds");
    }     
      
    /** Consumes 20 000 gas */
    function _takePosession(address owner,uint256 amount) internal {
        //Check balance
        uint256 balance = StakeableTokenContract.balanceOf(owner);
        require(balance >= amount, "PortableStake: Insufficient funds");           
        //Check allowance
        uint256 allowance = StakeableTokenContract.allowance(owner, address(this));
        require(allowance >= amount, "PortableStake: allowance insufficient");
        //Take posession
        StakeableTokenContract.transferFrom(owner, address(this), amount);   
    }    
    
    function calculateReward(uint256 principal,uint8 waitedDays, uint8 rewardStretchingDays)public pure returns (uint256 rewardAmount){
        return Reward.calcExpReward(principal, waitedDays, rewardStretchingDays); 
    }
    
     /** Calculates and subtracts fees from principal. Allocates fees for future redemption on this contract. Returns new principal.  */
     function _calculateAndChargeFees(uint256 principal, uint256 requestedReferrerFee, address referrer)internal returns (uint256 feesCharged, uint256 newPrincipal){
        (uint256 referrerFee,uint256 ownerFee) = calculateFees(principal, requestedReferrerFee);
        newPrincipal = chargeFee(principal, referrerFee, referrer);
        newPrincipal = chargeFee(newPrincipal, ownerFee, owner());
        feesCharged = referrerFee + ownerFee;
     }
     /** Caps referrer fee and calculates owner fee. Returns both. */
    function calculateFees(uint256 principal, uint256 requestedReferrerFee) public view returns(uint256 referrerFee, uint256 ownerFee){
        uint256 perMille = principal / 1000;
        uint256 maxReferrerFee = perMille * MAX_REFERRAL_FEE_PERMILLE;
        if(requestedReferrerFee > maxReferrerFee){
            referrerFee = maxReferrerFee;
        }else{
            referrerFee = requestedReferrerFee;
        }
        ownerFee = perMille * OWNER_FEE_PERMILLE;
    }   
    /**Wraps stakeable _stakeStart method */
     function _startStake(uint256 amount, uint16 stakeDays)internal {
        StakeableTokenContract.stakeStart(amount, stakeDays);
    }  
    /** Confirms that the stake was started */
   function _confirmStake(uint256 id)internal view returns (uint40 ){
       (
            uint40 stakeId, 
            /* uint72 stakedHearts */,
            /* uint72 stakeShares */, 
            /* uint16 lockedDay */, 
            /* uint16 stakedDays */,
            /* uint16 unlockedDay */,
            /* bool isAutoStake */
        ) = StakeableTokenContract.stakeLists(address(this), id);
    return stakeId;
   }
   function _mintToken(uint40 stakeId, /* uint256 stakeIndex, */ uint8 stretch, address owner)internal returns (uint256 tokenId){
            tokenId = TokenIdCounter++;
            idToToken[tokenId] = TokenStore(tokenId, /* stakeIndex, */ 0,stakeId, stretch);
            super._mint(owner, tokenId);
    }  
    /** Gets the index of the stake. It is required for ending stake. */
    function getStakeIndex(uint256 tokenId)public view returns (uint256){

        uint256 targetStakeId = idToToken[tokenId].stakeId;
        uint256 currentStakeId = 0;
        uint256 stakeCount = StakeableTokenContract.stakeCount(address(this));
        for (uint256 i = 0; i < stakeCount; i++) {
            (
                currentStakeId, 
            /* uint72 stakedHearts */,
            /* uint72 stakeShares */, 
            /* uint16 lockedDay */, 
            /* uint16 stakedDays */,
            /* uint16 unlockedDay */,
            /* bool isAutoStake */
            ) = StakeableTokenContract.stakeLists(address(this), i);
            if(currentStakeId == targetStakeId){
                return i;
            }
        }
        return stakeCount;
    }
    /** Ends stake, pays reward, returns wrapped tokens to staker and burns the wrapping token. */
    function settle(uint256 tokenId, uint256 stakeIndex) validNFToken(tokenId) external{
        address owner = idToOwner[tokenId];
        address actor = address(msg.sender);        
        
        TokenStore memory token = idToToken[tokenId];
        require(token.stakeId > 0, "PortableStake: stakeId missing");
        (
            /* uint256 currentDay */, 
            uint256 stakedAmount,
            uint256 unStakedAmount, 
            uint16 startDay,
            uint16 stakeLength,
            uint8 lateDays
        )  = _endStake(token.stakeId, stakeIndex/* token.stakeIndex */);
        //require(unStakedAmount > 0, "unstaked amount = 0");
        token.amount = token.amount + unStakedAmount;
        uint256 rewardAmount;
        if(actor != owner){
            rewardAmount = Reward.calcExpReward(token.amount, lateDays, token.rewardStretching); 
            require(unStakedAmount >= rewardAmount,"Reward is larger than principal");                 
        }
        if(rewardAmount > 0){
            token.amount = chargeFee(token.amount, rewardAmount, actor);
        }        
        uint256 returnedToOwnerAmount = token.amount;
        if(StakeableTokenContract.transfer(owner, returnedToOwnerAmount)){
            token.amount = token.amount - returnedToOwnerAmount;
        }
        if(token.amount == 0){
            _burn(tokenId);
            delete idToToken[tokenId];
        }
        emit PortableStakeEnd(
            tokenId, 
            token.stakeId, 
            owner, 
            msg.sender, 
            stakedAmount, 
            unStakedAmount,
            rewardAmount,
            returnedToOwnerAmount,
            startDay,
            stakeLength,
            lateDays
        );
    }    
    /** Ends stake and leaves the wrapped token on this contract */
    function _endStake(uint40 id, uint256 index)internal returns(
        uint256 currentDay, 
        uint256 stakedAmount,
        uint256 unStakedAmount, 
        uint16 startDay,
        uint16 stakeLength,
        uint8 lateDays
        ){
        currentDay = StakeableTokenContract.currentDay();
        //Get the stake details
        (
            uint40 stakeId, 
            uint72 stakedHearts,
            /* uint72 stakeShares */, 
            uint16 lockedDay, 
            uint16 stakedDays,
            /* uint16 unlockedDay */,
            /* bool isAutoStake */
        ) = StakeableTokenContract.stakeLists(address(this), index);
        require(id == stakeId);
        stakedAmount = stakedHearts;
        startDay = lockedDay;
        stakeLength = stakedDays;
        uint16 servedDays = uint16(currentDay - lockedDay);
        require(servedDays >= stakedDays, "stake is not mature");
        
        lateDays = uint8(servedDays - stakedDays);
        uint256 initialBalance = StakeableTokenContract.balanceOf(address(this));        
        StakeableTokenContract.stakeEnd(index, stakeId);
        uint256 finalBalance = StakeableTokenContract.balanceOf(address(this));
        require(finalBalance > initialBalance, "stake yield <= 0");
        unStakedAmount = finalBalance - initialBalance;
    }
}
contract PortableStakePerformanceTesting is PortableStake{
    //Token id counter is incremented in all functions. 
    //The increment alone is measured in the first function
    //It can then be subtracted from other results to determine the actual gas effect of the rest of function.
    //All tests are done using 200 optimisations
    constructor (StakeableRef stakeableTokenContract, uint8 minStakeDays, uint16 maxStakeDays)
    PortableStake(stakeableTokenContract,minStakeDays,maxStakeDays)
    {}
    /**27 212 gas */
    function incrementTokenIdCounter()external{//
        TokenIdCounter++;
    }
    /**30 612 gas => 3 400 gas*/
    function checkInput(uint256 amount, uint16 stakeDays)external {
        TokenIdCounter++;
        _checkInput(MintingInfo(address(msg.sender),address(0), amount, 0,stakeDays, DEFAULT_REWARD_STRETCHING));
    }
    /**47 610 gas => 20 400 gas*/
    function takePosession(address owner,uint256 amount)external{
        TokenIdCounter++;
        _takePosession(owner, amount);
    }
   /**183 170 gas => 156 000 gas*/
    function mintToken(uint40 stakeId, /* uint256 stakeIndex, */ uint8 stretch, address owner)external{
        TokenIdCounter++;
        _mintToken(stakeId, /* stakeIndex, */ stretch, owner);
    }
    /**73 682 gas => 46 400 gas*/
     function calculateAndChargeFees(uint256 principal, uint256 requestedReferrerFee, address referrer)external{
         TokenIdCounter++;
         _calculateAndChargeFees(principal, requestedReferrerFee, referrer);
     }
    /**111 078 gas => 83 900 gas*/
    function startStake(uint256 amount, uint16 stakeDays)external{
        TokenIdCounter++;
        _startStake(amount, stakeDays);
    }
       /**33 890 gas => 6 600 gas*/
    function confirmStake(uint256 index)external{
        TokenIdCounter++;
        _confirmStake(index);
    }
}