// SPDX-License-Identifier: Richard Heart
pragma solidity ^0.8.0;
import "../ERC20/ERC20.sol";
interface IStakeable{
    /**
     * @dev PUBLIC FACING: Open a stake.
     * @param amount Amount to stake
     * @param newStakedDays Number of days to stake
     */
    function stakeStart(uint256 amount, uint256 newStakedDays)external;
    /**
     * @dev PUBLIC FACING: Unlocks a completed stake, distributing the proceeds of any penalty
     * immediately. The staker must still call stakeEnd() to retrieve their stake return (if any).
     * @param stakerAddr Address of staker
     * @param stakeIndex Index of stake within stake list
     * @param stakeIdParam The stake's id
     */
    function stakeGoodAccounting(address stakerAddr, uint256 stakeIndex, uint40 stakeIdParam)external;
    /**
     * @dev PUBLIC FACING: Closes a stake. The order of the stake list can change so
     * a stake id is used to reject stale indexes.
     * @param stakeIndex Index of stake within stake list
     * @param stakeIdParam The stake's id
     */
    function stakeEnd(uint256 stakeIndex, uint40 stakeIdParam) external;
    /**
     * @dev PUBLIC FACING: Return the current stake count for a staker address
     * @param stakerAddr Address of staker
     */
    function stakeCount(address stakerAddr)
        external
        view
        returns (uint256);
    
}
/**
* This contract is never instantiated or inherited from
* Its purpose is to allow strongly typed access to the HEX contract without including its source
 */
abstract contract StakeableRef is IStakeable, ERC20{
     struct StakeStore {
        uint40 stakeId;
        uint72 stakedHearts;
        uint72 stakeShares;
        uint16 lockedDay;
        uint16 stakedDays;
        uint16 unlockedDay;
        bool isAutoStake;
    }
    mapping(address => StakeStore[]) public stakeLists;
    function currentDay() external virtual view returns (uint256);
    function symbol() public virtual view returns ( string memory);
    function name() public virtual view returns ( string memory);
}