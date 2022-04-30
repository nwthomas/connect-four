import { ethers } from "hardhat";

async function main() {
  const ConnectFour = await ethers.getContractFactory("ConnectFour");
  const connectFour = await ConnectFour.deploy(
    ethers.utils.parseEther("0.01"),
    ethers.utils.parseEther("10")
  );

  await connectFour.deployed();

  console.log("ConnectFour deployed to:", connectFour.address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
