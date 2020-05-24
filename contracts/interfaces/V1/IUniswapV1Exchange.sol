pragma solidity >=0.5.0;

interface IUniswapV1Exchange {
    function balanceOf(address owner) external view returns (uint);
    function transferFrom(address from, address to, uint value) external returns (bool);
    function removeLiquidity(uint, uint, uint, uint) external returns (uint, uint);
    function tokenToEthSwapInput(uint, uint, uint) external returns (uint);
    function ethToTokenSwapInput(uint, uint) external payable returns (uint);
     function getEthToTokenInputPrice(uint eth_sold) external view returns (uint);
    function getEthToTokenOutputPrice(uint tokens_bought) external view returns (uint);
    function getTokenToEthInputPrice(uint tokens_sold) external view returns (uint);
    function getTokenToEthOutputPrice(uint eth_bought) external view returns (uint);
}
