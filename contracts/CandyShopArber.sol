
pragma solidity =0.6.6;

import '@uniswap/v2-core/contracts/interfaces/IUniswapV2Callee.sol';

import '../libraries/UniswapV2Library.sol';
import '../interfaces/V1/IUniswapV1Factory.sol';
import '../interfaces/V1/IUniswapV1Exchange.sol';
import '../interfaces/IUniswapV2Router01.sol';
import '../interfaces/IERC20.sol';
import '../interfaces/IWETH.sol';


// CandyShopArber is the arbitrage contract that deals with arbitrage opportunities per trade
// Right now the prize pool is long DAI,ETH,USDT,USDC
contract CandyShopArber is IUniswapV2Callee {
    IUniswapV1Factory immutable factoryV1;
    address immutable factory;
    IUniswapV2Router01 immutable router01;
    IWETH immutable WETH;

    constructor(address _factory, address _factoryV1, address router) public {
        factoryV1 = IUniswapV1Factory(_factoryV1);
        factory = _factory;
        router01 = IUniswapV2Router01(router); 
        WETH = IWETH(IUniswapV2Router01(router).WETH());
    }

    // needs to accept ETH from any V1 exchange and WETH. ideally this could be enforced, as in the router,
    // but it's not possible because it requires a call to the v1 factory, which takes too much gas
    receive() external payable {}

    // gets tokens/WETH via a V2 flash swap, swaps for the ETH/tokens on V1, repays V2, and keeps the rest!
    function uniswapV2Call(address sender, uint amount0, uint amount1, bytes calldata data) external override {
        address[] memory path = new address[](2);
        uint amountToken;
        uint amountETH;

        // just populates path and amounts
        { // scope for token{0,1}, avoids stack too deep errors
        address token0 = IUniswapV2Pair(msg.sender).token0();
        address token1 = IUniswapV2Pair(msg.sender).token1();
        require(msg.sender == UniswapV2Library.pairFor(factory, token0, token1),"CandyShop: Sender is not uniswapV2 pair"); // ensure that msg.sender is actually a V2 pair
        require(amount0 == 0 || amount1 == 0,"CandyShop:One of the amounts should be 0"); // this strategy is unidirectional
        path[0] = amount0 == 0 ? token0 : token1;
        path[1] = amount0 == 0 ? token1 : token0;
        amountToken = token0 == address(WETH) ? amount1 : amount0;
        amountETH = token0 == address(WETH) ? amount0 : amount1;
        }

        // one of the tokens should be WETH
        require(path[0] == address(WETH) || path[1] == address(WETH),"One of the tokens should be WETH"); // this strategy only works with a V2 WETH pair
        IERC20 token = IERC20(path[0] == address(WETH) ? path[1] : path[0]);
        IUniswapV1Exchange exchangeV1 = IUniswapV1Exchange(factoryV1.getExchange(address(token))); // get V1 exchange

        // TODO we prob only need the IF condition here
        if (amountToken > 0) {
            (uint minETH) = abi.decode(data, (uint)); // slippage parameter for V1, passed in by caller
            token.approve(address(exchangeV1), amountToken);
            uint amountReceived = exchangeV1.tokenToEthSwapInput(amountToken, minETH, uint(-1));
            uint amountRequired = UniswapV2Library.getAmountsIn(factory, amountToken, path)[0];
            assert(amountReceived > amountRequired); // fail if we didn't get enough ETH back to repay our flash loan
            WETH.deposit{value: amountRequired}();
            assert(WETH.transfer(msg.sender, amountRequired)); // return WETH to V2 pair
            (bool success,) = sender.call{value: amountReceived - amountRequired}(new bytes(0)); // keep the rest! (ETH)
            assert(success);
        } else {
            (uint minTokens) = abi.decode(data, (uint)); // slippage parameter for V1, passed in by caller
            WETH.withdraw(amountETH);
            // number of tokens we received for swapping ETH to token on uniswapV1
            uint amountReceived = exchangeV1.ethToTokenSwapInput{value: amountETH}(minTokens, uint(-1));
            // number of tokens we need to return to V2 because of flash swap
            uint amountRequired = UniswapV2Library.getAmountsIn(factory, amountETH, path)[0];
            assert(amountReceived > amountRequired); // fail if we didn't get enough tokens back to repay our flash loan
            assert(token.transfer(msg.sender, amountRequired)); // return tokens to V2 pair

            // TODO: slit profits with sender and lottery, currently giving all profits to lottery
            assert(token.transfer(address(this), amountReceived - amountRequired)); // keep the rest! (tokens)
            
            // TODO swap these tokens to ETH
        }
    }
    
    function EthToTokenSwapInputV1(address tokenAddr,uint256 min_tokens ,uint256 deadline) external payable {
        // exchange ETH to tokens on uniswapV1
        IUniswapV1Exchange exchangeV1 = IUniswapV1Exchange(factoryV1.getExchange(tokenAddr)); // get V1 exchange
        uint256 numTokensObtained = exchangeV1.ethToTokenSwapInput{value: msg.value}(min_tokens, uint(-1)); 

        // calculate arb amount
        uint256 arbAmount = 200000000000000000000;
        IERC20 token = IERC20(tokenAddr);

        // trade num tokens we got from earlier trade back to ETH on uniswapV2
        address pairAddr = UniswapV2Library.pairFor(factory, address(WETH), tokenAddr);
        IUniswapV2Pair pair = IUniswapV2Pair(pairAddr);

        require(token.transfer(pairAddr,numTokensObtained),"token transfer was not a success");

        // flash loan assets
        pair.swap(arbAmount,0,msg.sender, '0x');
    }

    function EthToTokenSwapInputV1Vanilla(address tokenAddr, uint256 min_tokens, uint deadline) public payable {
        IUniswapV1Exchange exchangeV1 = IUniswapV1Exchange(factoryV1.getExchange(tokenAddr)); // get V1 exchange
        IERC20 token = IERC20(tokenAddr);
        uint256 numTokensObtained = exchangeV1.ethToTokenSwapInput{value: msg.value}(min_tokens, uint(-1));
        assert(token.transfer(msg.sender, numTokensObtained)); // keep the rest! (tokens)
    }


    function ExactETHForTokensV2(uint amountOutMin, address[] calldata path, address to, uint deadline)
    external
    payable
    returns (uint[] memory amounts){
        return router01.swapExactETHForTokens{value: msg.value}(amountOutMin, path, to, deadline);
    }


    function EthToTokenSwapWithBaseSwap(address token,uint amount0Out, uint amount1Out, address to, bytes calldata data) external{
        address pairAddr = UniswapV2Library.pairFor(factory, address(WETH), token);
        IUniswapV2Pair pair = IUniswapV2Pair(pairAddr);
        return pair.swap(amount0Out, amount1Out,to,data);
    }
}
