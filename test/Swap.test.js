const { expect } = require("chai");
const { ethers } = require("hardhat");

// utils
const futureTime = (seconds) => {
  return (+Math.floor(new Date().getTime() / 1000.0) + +seconds)
}

const tokenAbi = [
  "function approve(address _spender, uint256 _value) returns(bool success)",
  "function balanceOf(address _owner) external view returns (uint256 balance)"
]
const daiAddress = "0x6B175474E89094C44Da98b954EedeAC495271d0F"
const wethAddress = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2"

describe("Swap", function () {
  let swap, dai, weth
  let deployer, user1
  beforeEach(async () => {
    // Get the ContractFactory 
    const SwapFactory = await ethers.getContractFactory("Swap");
    // And get signers here
    [deployer, user1] = await ethers.getSigners()
    // Deploy contracts 
    swap = await SwapFactory.deploy()
    // Get instance of dai contract
    dai = new ethers.Contract(daiAddress, tokenAbi, deployer)
    weth = new ethers.Contract(wethAddress, tokenAbi, deployer)
  })
  describe("Swapping from eth to dai", function () {
    let deadline, initDaiBalance, initEthBalance
    beforeEach(async () => {
      // Set deadline
      deadline = futureTime(15)
      initDaiBalance = await dai.balanceOf(deployer.address)
      initEthBalance = await deployer.getBalance()
      console.log("Initial Dai Balance:", ethers.utils.formatEther(initDaiBalance))
      console.log("Initial Eth Balance:", ethers.utils.formatEther(initEthBalance))
    })
    it("Converting eth to exact dai", async function () {
      // this is the dai amount / output we  want. It converts 3000 into wei
      const daiAmount = ethers.utils.parseEther('3000')
      // get estimated amout of eth we need to send to get our desired dai output amout
      let ethAmount = await swap.callStatic.getETHforDAI(daiAmount)
      // Send a 10 percent more eth than quoted to ensure transaction doesn't fail. 
      // All unused eth will get refunded automatically
      ethAmount = ethAmount.mul(110).div(100)
      await swap.convertEthToExactDai(daiAmount, deadline, { value: ethAmount })
      const finalDaiBalance = await dai.balanceOf(deployer.address)
      const finalEthBalance = await deployer.getBalance()
      console.log("Final Dai Balance:", ethers.utils.formatEther(finalDaiBalance))
      console.log("Final Eth Balance:", ethers.utils.formatEther(finalEthBalance))
      // Check that eth was refunded. Ensure eth balance of contract is zero
      const swapEthBalance = await ethers.provider.getBalance(swap.address)
      expect(swapEthBalance).to.be.equal(0)
      expect(finalDaiBalance).to.be.equal(initDaiBalance.add(daiAmount))
      // due to gas fees we cannto exactly esitimae so just use less than
      expect(+ethers.utils.formatEther(finalEthBalance)).to.be.lessThan(+ethers.utils.formatEther(initEthBalance))
    });

    it("Converting exact eth to dai", async function () {
      const ethAmount = ethers.utils.parseEther('1')
      await swap.convertExactEthToDai(deadline, { value: ethAmount })
      const finalDaiBalance = await dai.balanceOf(deployer.address)
      const finalEthBalance = await deployer.getBalance()
      console.log("Final Dai Balance:", ethers.utils.formatEther(finalDaiBalance))
      console.log("Final Eth Balance:", ethers.utils.formatEther(finalEthBalance))
      expect(+ethers.utils.formatEther(finalDaiBalance)).to.be.greaterThan(+ethers.utils.formatEther(initDaiBalance))
      expect(+ethers.utils.formatEther(finalEthBalance)).to.be.lessThan(+ethers.utils.formatEther(initEthBalance))
    });
  })
});
