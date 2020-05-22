pragma solidity ^0.6.2;
pragma experimental ABIEncoderV2;

interface CandyStoreInterface {
    function buyCandy(address token, uint amt, address to, bool lottery) external;
}