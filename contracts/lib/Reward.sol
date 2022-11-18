// SPDX-License-Identifier: Christopher Willoch
pragma solidity ^0.8.0;
library Reward{
    function calcExpReward(uint256 principal,uint8 waitedDays, uint8 rewardStretchingDays)internal pure returns (uint256 rewardAmount){
        if(waitedDays == 0){
            return rewardAmount;
        }
        rewardAmount = principal;
        if(waitedDays > rewardStretchingDays){
            return rewardAmount;
        }
        uint8 base = 2;
        uint8 divisionTimes = uint8(rewardStretchingDays - waitedDays);
        for (uint i = 0; i < divisionTimes; i++){
            rewardAmount = rewardAmount / base;
            if(rewardAmount < base){break;}
        }            
        return rewardAmount;
    }
}