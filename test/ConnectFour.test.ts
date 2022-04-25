import { BigNumber } from "ethers";
import type { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signer-with-address";
import chai from "chai";
import { ethers } from "hardhat";
import { solidity } from "ethereum-waffle";
const { expect } = chai;

chai.use(solidity);

type DeployArguments = {
  minBetAmount: BigNumber;
  maxBetAmount: BigNumber;
};

const getDeployedContract = async ({
  minBetAmount,
  maxBetAmount,
}: DeployArguments) => {
  const contractFactory = await ethers.getContractFactory("ConnectFour");
  const contract = await contractFactory.deploy(minBetAmount, maxBetAmount);

  return contract;
};

describe("ConnectFour", () => {
  let account1: SignerWithAddress;
  let account2: SignerWithAddress;
  let account3: SignerWithAddress;

  let deployArgs: DeployArguments;

  beforeEach(async () => {
    const [owner, second, third] = await ethers.getSigners();

    account1 = owner;
    account2 = second;
    account3 = third;

    deployArgs = {
      minBetAmount: ethers.utils.parseEther("0.01"),
      maxBetAmount: ethers.utils.parseEther("1.0"),
    };
  });

  describe("deploy", () => {
    it("assigns variables on deploy", async () => {
      const contract = await getDeployedContract(deployArgs);

      const minBetAmountTxn = await contract.minBetAmount();
      expect(minBetAmountTxn).to.equal(deployArgs.minBetAmount);

      const maxBetAmountTxn = await contract.maxBetAmount();
      expect(maxBetAmountTxn).to.equal(deployArgs.maxBetAmount);
    });
  });
});
