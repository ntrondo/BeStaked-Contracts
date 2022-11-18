// SPDX-License-Identifier: BeStaked.com
 pragma solidity ^0.8.0;
import "../ethereum-erc721/tokens/erc721.sol";
import "../ethereum-erc721/tokens/nf-token-enumerable.sol";
import "../ethereum-erc721/ownership/ownable.sol";
import "../ERC20/IERC20.sol";
//import "../Stakeable/IStakeable.sol";
import "../Fees/FeeCollectorBase.sol";
abstract contract ERC20SettledMarket is FeeCollectorBase, Ownable{
    uint8 public OWNER_FEE_PERMILLE = 1;//0.1%, subject to change
    /** If calculated fee is more than this value, the fee is this value. */
    uint256 public OWNER_FEE_CAP = 1e9;//10 HEX, subject to change
    /** If calculated fee is less than this value, the fee is zero. */
    uint256 public OWNER_FEE_FLOOR = 1e8;//1 HEX, subject to change

    function setConstants(uint8 newFeePermille,uint256 newFeeFloor, uint256 newFeeCap)external onlyOwner() {
        OWNER_FEE_PERMILLE = newFeePermille;
        OWNER_FEE_FLOOR = newFeeFloor;
        OWNER_FEE_CAP = newFeeCap;
        //emit
    }
}
contract BeStakedNFTMarketV1 is ERC20SettledMarket, NFTokenEnumerable{
    /**Token id counter ensures unique ids */
    uint256 public ListingIdCounter = 1;  

    /** Id of erc721 */
    /** Price in tokens of payment contract */
    /** The contract on which the item for sale comes from */
    struct TokenStore{        
         uint256 id;         
         uint256 price;         
         ERC721 objectContract;
     }
    mapping(uint256=>TokenStore) public idToToken;

    constructor(IERC20 paymentContract)
    FeeCollectorBase(paymentContract){}

    /** Create listing */
    function List(ERC721 objectContract, uint256 objectTokenId, uint256 price)external{
        address owner = msg.sender;
        uint256 listingId = ListingIdCounter++;
        _mint(owner, listingId);
        idToToken[listingId] = TokenStore(objectTokenId, price, objectContract);
        //emit
    }
    /** Checks if the specified nft is for sale by specified user. Returns listingId or 0 */
    function IsForSaleByOwner(address owner, ERC721 objectContract, uint256 objectTokenId)public view returns (uint256 listingId){
        uint256 count = _getOwnerNFTCount(owner);
        TokenStore memory listing;        
         for (uint256 i = 0; i < count; i++) {
             listingId = ownerToIds[owner][i];
             listing = idToToken[listingId];
             if(listing.objectContract != objectContract || listing.id != objectTokenId){continue;}
             break;
         }
        return listingId;
    }
    /** Change the price of a listing */
    function UpdatePrice(uint256 listingId, uint256 newPrice)external{
        address owner = idToOwner[listingId];
        require(owner == msg.sender);
        idToToken[listingId].price = newPrice;
        //emit
    }
    /**Removes listing if sender is owner or if the listing is not sellable */
    function RemoveListing(uint256 listingId)external{
        //refactor
        address owner = idToOwner[listingId];
        if(owner == msg.sender){
            burn(listingId);
            //emit event  
            return;
        }    
        bool canSell = CanSell(listingId);
        require(!canSell, "listing is sellable. cannot remove others sellable listings");        
        burn(listingId);  
        //emit event      
    }
    /** Checs if listing is sellable. Checks allowance and ownership */
    function CanSell(uint256 listingId)public view returns (bool){
        TokenStore memory token = idToToken[listingId];
        if(token.id == 0){
            return false;
        }
        //Check ownership, false if not
        address owner = idToOwner[listingId];
        address tokenOwner = token.objectContract.ownerOf(token.id);
        if(tokenOwner != owner){return false;}     

        //Check allowance, false if not
        address hasAllowance = token.objectContract.getApproved(token.id);
        if(hasAllowance != address(this)){return false;}  
        return true;
    }
    /** Checks if the listing is buyable. Checks sellable, can charge buyers and if seller == buyer. */
    function CanBuy(uint256 listingId)public view returns (bool){
        if(idToOwner[listingId] == msg.sender){return false;}
        bool canSell = CanSell(listingId);
        if(!canSell){return false;}
        return CanCharge(msg.sender, idToToken[listingId].price);
        // uint256 paymentAllowance = PaymentContract.allowance(msg.sender, address(this));
        // if(paymentAllowance == 0){return false;}        
        // uint256 price = idToToken[listingId].price;
        // if(paymentAllowance < price){return false;}       
        // uint256 balance = PaymentContract.balanceOf(msg.sender);
        // if(balance < price){return false;}
        // return true;
    }
    /** Checks if the contract can charge auser an amount. Checks balance and allowance */
    function CanCharge(address holder, uint256 amount)public view returns(bool){
        uint256 limit = PaymentContract.balanceOf(holder);
        if(limit < amount){return false;}
        limit = PaymentContract.allowance(msg.sender, address(this));
        if(limit < amount){return false;}
        return true;
    }
    /** Takes the bid, burns the listing. Does not check! */
    function Buy(uint256 listingId)external{  
        TokenStore memory token = idToToken[listingId];

        address buyer = msg.sender;
        address seller = idToOwner[listingId];    

        //Transfer the money
        uint256 fee = calculateFee(token.price);        
        uint256 newAmount = chargeFee(token.price,fee, owner());
        PaymentContract.transferFrom(buyer, seller, newAmount);

        //Transfer the token
        token.objectContract.transferFrom(seller, buyer, token.id);
        //emit event        
        burn(listingId);
    }   
    
    function calculateFee(uint256 principal)public view returns(uint256 fee){
        uint256 perMille = principal / 1000;
        fee = perMille * OWNER_FEE_PERMILLE;
        if(fee < OWNER_FEE_FLOOR){
            fee = 0;
        }
        if(fee > OWNER_FEE_CAP){
            fee = OWNER_FEE_CAP;
        }
        return fee;
    }
    function burn(uint256 listingId)private{
        delete idToToken[listingId];
        _burn(listingId);
    }
}