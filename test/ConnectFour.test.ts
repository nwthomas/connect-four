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

  describe("initializeGame", () => {
    // finish
  });

  describe("startGame", () => {
    // finish
  });

  describe("playMove", () => {
    // finish
  });

  describe("claimReward", () => {
    // finish
  });

  describe("boardIndex", () => {
    it("returns the correct index for a single array", async () => {
      const contract = await getDeployedContract(deployArgs);

      let boardIndexTxn = await contract.boardIndex(0, 0);
      expect(boardIndexTxn).to.equal(0);

      boardIndexTxn = await contract.boardIndex(0, 1);
      expect(boardIndexTxn).to.equal(7);

      boardIndexTxn = await contract.boardIndex(6, 5);
      expect(boardIndexTxn).to.equal(41);
    });

    it("throws an error when the column index is out of bounds", async () => {
      const contract = await getDeployedContract(deployArgs);

      let error;
      try {
        await contract.boardIndex(100, 5);
      } catch (newError) {
        error = newError;
      }

      expect(error).to.not.equal(undefined);
    });

    it("throws an error when the row index is out of bounds", async () => {
      const contract = await getDeployedContract(deployArgs);

      let error;
      try {
        await contract.boardIndex(6, 100);
      } catch (newError) {
        error = newError;
      }

      expect(error).to.not.equal(undefined);
    });
  });
});
