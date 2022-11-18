// SPDX-License-Identifier: Christopher Willoch
 pragma solidity ^0.8.0;
 import "../ERC20/IERC20.sol";
 abstract contract FeeCollectorBase{   
     IERC20 public PaymentContract;
     mapping(address=>uint256) public redeemableFees;
     constructor (IERC20 paymentContract){
         PaymentContract = paymentContract;
     }
     function redeemFees()external {
        address collector = address(msg.sender);
        uint256 amount = redeemableFees[collector];
        require(amount > 0, "no fees to redeem");
        if(PaymentContract.transfer(collector, amount)){
            redeemableFees[collector] = 0;
        }
     }
     function chargeFee(uint256 principal, uint256 fee, address collector)public returns (uint256 newPrincipal){
         if(fee <= principal && fee > 0 && collector != address(0)){
            uint256 amount = redeemableFees[collector];
            amount = amount + fee;
            redeemableFees[collector] = amount;
            newPrincipal = principal - fee;
         }else{
             newPrincipal = principal;
         }
     }
 }