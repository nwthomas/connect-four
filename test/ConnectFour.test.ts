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
    it("initializes a brand new game with a player 1 and bet amount", async () => {
      const contract = await getDeployedContract(deployArgs);

      await contract.connect(account1).initializeGame({
        value: ethers.utils.parseEther("0.5"),
      });

      const player1AddressTxn = await (await contract.games(0)).player1;
      expect(player1AddressTxn).to.equal(account1.address);

      const betAmountTxn = await (await contract.games(0)).betAmount;
      expect(betAmountTxn).to.equal(ethers.utils.parseEther("0.5"));
    });

    it("assigns 0 address to player 2 on initialization", async () => {
      const contract = await getDeployedContract(deployArgs);

      await contract.connect(account1).initializeGame({
        value: ethers.utils.parseEther("0.5"),
      });

      const player2AddressTxn = await (await contract.games(0)).player2;
      expect(player2AddressTxn).to.equal(
        "0x0000000000000000000000000000000000000000"
      );
    });

    it("allows any address to initialize a game", async () => {
      const contract = await getDeployedContract(deployArgs);

      await contract.connect(account2).initializeGame({
        value: ethers.utils.parseEther("0.5"),
      });
      await contract.connect(account3).initializeGame({
        value: ethers.utils.parseEther("0.5"),
      });

      const firstGamePlayer1Txn = await (await contract.games(0)).player1;
      expect(firstGamePlayer1Txn).to.equal(account2.address);

      const secondGamePlayer1Txn = await (await contract.games(1)).player1;
      expect(secondGamePlayer1Txn).to.equal(account3.address);
    });

    it("emits an event for the initialized game", async () => {
      const contract = await getDeployedContract(deployArgs);

      let newGameTxn = await contract.connect(account2).initializeGame({
        value: ethers.utils.parseEther("0.5"),
      });

      expect(newGameTxn)
        .to.emit(contract, "GameInitialized")
        .withArgs(
          BigNumber.from(0),
          account2.address,
          ethers.utils.parseEther("0.5")
        );

      newGameTxn = await contract.connect(account3).initializeGame({
        value: ethers.utils.parseEther("0.09"),
      });

      expect(newGameTxn)
        .to.emit(contract, "GameInitialized")
        .withArgs(
          BigNumber.from(1),
          account3.address,
          ethers.utils.parseEther("0.09")
        );
    });

    it("throws an error if the bet amount is lower than the minimum", async () => {
      const contract = await getDeployedContract(deployArgs);

      let error;
      try {
        await contract.initializeGame({
          value: ethers.utils.parseEther("0"),
        });
      } catch (newError) {
        error = newError;
      }

      expect(error).to.not.equal(undefined);
    });

    it("throws an error if the bet amount is higher than the maximum", async () => {
      const contract = await getDeployedContract(deployArgs);

      let error;
      try {
        await contract.initializeGame({
          value: ethers.utils.parseEther("100"),
        });
      } catch (newError) {
        error = newError;
      }

      expect(error).to.not.equal(undefined);
    });
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
