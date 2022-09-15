//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
pragma abicoder v2;

import "@uniswap/v3-periphery/contracts/interfaces/ISwapRouter.sol";
import "@uniswap/v3-periphery/contracts/interfaces/IQuoter.sol";

interface IUniSwapRouter is ISwapRouter {
    function refundETH() external payable;
}

contract Swap {
    IUniSwapRouter public immutable swapRouter;
    IQuoter public immutable quoter;

    address public constant DAI = 0x6B175474E89094C44Da98b954EedeAC495271d0F;
    address public constant WETH9 = 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2;

    // Set the pool fee to 0.3%.
    uint24 public constant poolFee = 3000;

    constructor() {
        swapRouter = IUniSwapRouter(0xE592427A0AEce92De3Edee1F18E0157C05861564);
        quoter = IQuoter(0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6);
    }

    function getETHforDAI(uint256 _daiAmount)
        external
        payable
        returns (uint256)
    {
        return (
            quoter.quoteExactOutputSingle({
                tokenIn: WETH9,
                tokenOut: DAI,
                fee: 500, // 0.05 percent fee
                amountOut: _daiAmount,
                sqrtPriceLimitX96: 0
            })
        );
    }

    // Used to accept swapRouter refund
    receive() external payable {}

    function convertEthToExactDai(uint256 _daiAmountOut, uint256 _deadline)
        external
        payable
        returns (uint256 _amountIn)
    {
        require(msg.value > 0, "Error, ETH amount in must be greater than 0");
        require(
            _daiAmountOut > 0,
            "Error, DAI amount out must be greater than 0"
        );
        ISwapRouter.ExactOutputSingleParams memory _params = ISwapRouter
            .ExactOutputSingleParams({
                tokenIn: WETH9,
                tokenOut: DAI,
                fee: poolFee,
                recipient: msg.sender,
                deadline: _deadline,
                amountOut: _daiAmountOut,
                amountInMaximum: msg.value,
                sqrtPriceLimitX96: 0
            });

        _amountIn = swapRouter.exactOutputSingle{value: msg.value}(_params);
        if (_amountIn < msg.value) {
            swapRouter.refundETH();
            // Send the refunded ETH back to sender
            (bool success, ) = msg.sender.call{value: address(this).balance}(
                ""
            );
            require(success, "Refund failed");
        }
    }

    function convertExactEthToDai(uint256 _deadline)
        external
        payable
        returns (uint256)
    {
        require(msg.value > 0, "Error, ETH amount in must be greater than 0");
        ISwapRouter.ExactInputSingleParams memory _params = ISwapRouter
            .ExactInputSingleParams({
                tokenIn: WETH9,
                tokenOut: DAI,
                fee: poolFee,
                recipient: msg.sender,
                deadline: _deadline,
                amountIn: msg.value,
                amountOutMinimum: 0, // setting zero now but in production use price oracle to detemine amount minimum
                sqrtPriceLimitX96: 0
            });

        return (swapRouter.exactInputSingle{value: msg.value}(_params));
    }
}
