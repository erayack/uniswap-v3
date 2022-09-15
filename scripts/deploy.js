async function main() {

  console.log("Deploying contracts with the account:", deployer.address);
  console.log("Account balance:", (await deployer.getBalance()).toString());

  // deploy contracts here:
  const SwapFactory = await ethers.getContractFactory("Swap");
  swap = await SwapFactory.deploy();

  console.log("Smart contract address:", swap.address)

}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
