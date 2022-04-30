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

      const statusTxn = await (await contract.games(0)).status;
      expect(statusTxn).to.equal(1);
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

      try {
        await contract.initializeGame({
          value: ethers.utils.parseEther("0"),
        });
      } catch (error) {
        expect(error).to.not.equal(undefined);
      }
    });

    it("throws an error if the bet amount is higher than the maximum", async () => {
      const contract = await getDeployedContract(deployArgs);

      try {
        await contract.initializeGame({
          value: ethers.utils.parseEther("100"),
        });
      } catch (error) {
        expect(error).to.not.equal(undefined);
      }
    });
  });

  describe("startGame", () => {
    it("allows any address to start a game", async () => {
      const contract = await getDeployedContract(deployArgs);

      await contract.connect(account2).initializeGame({
        value: ethers.utils.parseEther("0.5"),
      });
      await contract.connect(account3).startGame(0, {
        value: ethers.utils.parseEther("0.5"),
      });

      const [, gameSecondPlayerTxn] = await contract.games(0);
      expect(gameSecondPlayerTxn).to.equal(account3.address);
    });

    it("throws an error if the game ID is not valid", async () => {
      const contract = await getDeployedContract(deployArgs);

      try {
        await contract.connect(account3).startGame(10, {
          value: ethers.utils.parseEther("1"),
        });
      } catch (error) {
        expect(String(error).indexOf("Error: invalid game ID") > -1).to.equal(
          true
        );
      }
    });

    it("throws an error if the game has already started", async () => {
      const contract = await getDeployedContract(deployArgs);

      await contract.connect(account2).initializeGame({
        value: ethers.utils.parseEther("0.5"),
      });
      await contract.connect(account3).startGame(0, {
        value: ethers.utils.parseEther("0.5"),
      });

      try {
        await contract.connect(account3).startGame(0, {
          value: ethers.utils.parseEther("0.5"),
        });
      } catch (error) {
        expect(
          String(error).indexOf("Error: game already started") > -1
        ).to.equal(true);
      }
    });

    it("throws an error if the bet amount is invalid", async () => {
      const contract = await getDeployedContract(deployArgs);

      await contract.connect(account2).initializeGame({
        value: ethers.utils.parseEther("0.5"),
      });

      try {
        await contract.connect(account3).startGame(0, {
          value: ethers.utils.parseEther("50"),
        });
      } catch (error) {
        expect(
          String(error).indexOf("Error: invalid bet amount") > -1
        ).to.equal(true);
      }
    });

    it("throws an error if no ether is included", async () => {
      const contract = await getDeployedContract(deployArgs);

      await contract.connect(account2).initializeGame({
        value: ethers.utils.parseEther("0.5"),
      });

      try {
        await contract.connect(account3).startGame(0);
      } catch (error) {
        expect(
          String(error).indexOf("Error: invalid bet amount") > -1
        ).to.equal(true);
      }
    });

    it("updates state variables successfully", async () => {
      const contract = await getDeployedContract(deployArgs);

      await contract.connect(account2).initializeGame({
        value: ethers.utils.parseEther("0.5"),
      });
      await contract.connect(account3).startGame(0, {
        value: ethers.utils.parseEther("0.5"),
      });

      const [, gameSecondPlayerTxn, , statusTxn] = await contract.games(0);
      expect(gameSecondPlayerTxn).to.equal(account3.address);
      expect(statusTxn).to.equal(2);
    });
  });

  describe("playMove", () => {
    it("throws an error if invalid game ID", async () => {
      const contract = await getDeployedContract(deployArgs);

      await contract.connect(account2).initializeGame({
        value: ethers.utils.parseEther("0.5"),
      });
      await contract.connect(account3).startGame(0, {
        value: ethers.utils.parseEther("0.5"),
      });

      try {
        await contract.connect(account2).playMove(10, 0);
      } catch (error) {
        expect(String(error).indexOf("Error: invalid game ID") > -1).to.equal(
          true
        );
      }
    });

    it("throws an error if a column on the board is already full", async () => {
      const contract = await getDeployedContract(deployArgs);

      await contract.connect(account2).initializeGame({
        value: ethers.utils.parseEther("0.5"),
      });
      await contract.connect(account3).startGame(0, {
        value: ethers.utils.parseEther("0.5"),
      });

      for (let i = 0; i < 6; i++) {
        const currentPlayer = i % 2 === 0 ? account2 : account3;

        await contract.connect(currentPlayer).playMove(0, 0);
      }

      try {
        await contract.connect(account2).playMove(0, 5);
      } catch (error) {
        expect(String(error).indexOf("Error: column full") > -1).to.equal(true);
      }
    });

    it("throws an error if not player 1's turn", async () => {
      const contract = await getDeployedContract(deployArgs);

      await contract.connect(account2).initializeGame({
        value: ethers.utils.parseEther("0.5"),
      });
      await contract.connect(account3).startGame(0, {
        value: ethers.utils.parseEther("0.5"),
      });

      await contract.connect(account2).playMove(0, 0);

      try {
        await contract.connect(account2).playMove(0, 0);
      } catch (error) {
        expect(String(error).indexOf("Error: not your turn") > -1).to.equal(
          true
        );
      }
    });

    it("throws an error if not player 2's turn", async () => {
      const contract = await getDeployedContract(deployArgs);

      await contract.connect(account2).initializeGame({
        value: ethers.utils.parseEther("0.5"),
      });
      await contract.connect(account3).startGame(0, {
        value: ethers.utils.parseEther("0.5"),
      });

      try {
        await contract.connect(account3).playMove(0, 0);
      } catch (error) {
        expect(String(error).indexOf("Error: not your turn") > -1).to.equal(
          true
        );
      }
    });

    it("correctly updates player turn on moves", async () => {
      const contract = await getDeployedContract(deployArgs);

      await contract.connect(account2).initializeGame({
        value: ethers.utils.parseEther("0.5"),
      });
      await contract.connect(account3).startGame(0, {
        value: ethers.utils.parseEther("0.5"),
      });

      let playerTurnTxn = await (await contract.games(0)).isPlayer1Turn;
      expect(playerTurnTxn).to.equal(true);

      await contract.connect(account2).playMove(0, 0);

      playerTurnTxn = await (await contract.games(0)).isPlayer1Turn;
      expect(playerTurnTxn).to.equal(false);

      await contract.connect(account3).playMove(0, 0);

      playerTurnTxn = await (await contract.games(0)).isPlayer1Turn;
      expect(playerTurnTxn).to.equal(true);
    });

    it("can fill up the entire board with state", async () => {
      const contract = await getDeployedContract(deployArgs);

      await contract.initializeGame({
        value: ethers.utils.parseEther("0.5"),
      });
      await contract.connect(account2).startGame(0, {
        value: ethers.utils.parseEther("0.5"),
      });

      let column = 0;
      let row = 0;
      let timesErrored = 0;

      while (column < 7) {
        const currentPlayer = row % 2 === 0 ? account1 : account2;

        try {
          await contract.connect(currentPlayer).playMove(0, column);
          row += 1;
        } catch (error) {
          expect(String(error).indexOf("Error: column full") > -1).to.equal(
            true
          );
          column += 1;
          row = 0;
          timesErrored += 1;
        }
      }

      // The total number of columns is 7, so this should expect 7 errors
      expect(timesErrored).to.equal(7);
    });
  });

  describe("claimReward", () => {
    it("throws an error if invalid game ID", async () => {
      const contract = await getDeployedContract(deployArgs);

      try {
        await contract.claimReward(0, account1.address, 0, 0, 0);
      } catch (error) {
        expect(String(error).indexOf("Error: invalid game ID") > -1).to.equal(
          true
        );
      }
    });

    it("throws an error if not the msg.sender's game", async () => {
      const contract = await getDeployedContract(deployArgs);

      await contract.initializeGame({
        value: ethers.utils.parseEther("0.5"),
      });
      await contract.connect(account2).startGame(0, {
        value: ethers.utils.parseEther("0.5"),
      });

      try {
        await contract
          .connect(account3)
          .claimReward(0, account1.address, 0, 0, 0);
      } catch (error) {
        expect(String(error).indexOf("Error: not your game") > -1).to.equal(
          true
        );
      }
    });

    it("throws an error if the game is not started", async () => {
      const contract = await getDeployedContract(deployArgs);

      await contract.initializeGame({
        value: ethers.utils.parseEther("0.5"),
      });

      try {
        await contract.claimReward(0, account1.address, 0, 0, 0);
      } catch (error) {
        expect(
          String(error).indexOf("Error: game cannot be claimed") > -1
        ).to.equal(true);
      }
    });

    it("throws an error if the disc does not belong to msg.sender as player 2", async () => {
      const contract = await getDeployedContract(deployArgs);

      await contract.connect(account2).initializeGame({
        value: ethers.utils.parseEther("0.5"),
      });
      await contract.connect(account3).startGame(0, {
        value: ethers.utils.parseEther("0.5"),
      });

      await contract.connect(account2).playMove(0, 0);

      try {
        await contract
          .connect(account3)
          .claimReward(0, account1.address, 0, 0, 0);
      } catch (error) {
        expect(String(error).indexOf("Error: not your disc") > -1).to.equal(
          true
        );
      }
    });

    it("throws an error if the disc does not belong to msg.sender as player 1", async () => {
      const contract = await getDeployedContract(deployArgs);

      await contract.connect(account2).initializeGame({
        value: ethers.utils.parseEther("0.5"),
      });
      await contract.connect(account3).startGame(0, {
        value: ethers.utils.parseEther("0.5"),
      });

      await contract.connect(account2).playMove(0, 0);
      await contract.connect(account3).playMove(0, 0);

      try {
        await contract
          .connect(account2)
          .claimReward(0, account1.address, 0, 1, 0);
      } catch (error) {
        expect(String(error).indexOf("Error: not your disc") > -1).to.equal(
          true
        );
      }
    });

    it("throws an error if not winning direction right", async () => {
      const contract = await getDeployedContract(deployArgs);

      await contract.connect(account2).initializeGame({
        value: ethers.utils.parseEther("0.5"),
      });
      await contract.connect(account3).startGame(0, {
        value: ethers.utils.parseEther("0.5"),
      });

      await contract.connect(account2).playMove(0, 0);

      try {
        await contract
          .connect(account2)
          .claimReward(0, account1.address, 0, 0, 3);
      } catch (error) {
        expect(String(error).indexOf("Error: have not won") > -1).to.equal(
          true
        );
      }
    });

    it("throws an error if not winning direction up", async () => {
      const contract = await getDeployedContract(deployArgs);

      await contract.connect(account2).initializeGame({
        value: ethers.utils.parseEther("0.5"),
      });
      await contract.connect(account3).startGame(0, {
        value: ethers.utils.parseEther("0.5"),
      });

      await contract.connect(account2).playMove(0, 0);
      await contract.connect(account3).playMove(0, 1);

      try {
        await contract
          .connect(account3)
          .claimReward(0, account1.address, 1, 0, 1);
      } catch (error) {
        expect(String(error).indexOf("Error: have not won") > -1).to.equal(
          true
        );
      }
    });

    it("throws an error if not winning direction right diagonal", async () => {
      const contract = await getDeployedContract(deployArgs);

      await contract.connect(account2).initializeGame({
        value: ethers.utils.parseEther("0.5"),
      });
      await contract.connect(account3).startGame(0, {
        value: ethers.utils.parseEther("0.5"),
      });

      await contract.connect(account2).playMove(0, 1);

      try {
        await contract
          .connect(account2)
          .claimReward(0, account1.address, 1, 0, 2);
      } catch (error) {
        expect(String(error).indexOf("Error: have not won") > -1).to.equal(
          true
        );
      }
    });

    it("throws an error if not winning direction left diagonal", async () => {
      const contract = await getDeployedContract(deployArgs);

      await contract.connect(account2).initializeGame({
        value: ethers.utils.parseEther("0.5"),
      });
      await contract.connect(account3).startGame(0, {
        value: ethers.utils.parseEther("0.5"),
      });

      await contract.connect(account2).playMove(0, 0);
      await contract.connect(account3).playMove(0, 6);

      try {
        await contract
          .connect(account3)
          .claimReward(0, account1.address, 6, 0, 0);
      } catch (error) {
        expect(String(error).indexOf("Error: have not won") > -1).to.equal(
          true
        );
      }
    });

    it("allows win on direction right", async () => {
      const contract = await getDeployedContract(deployArgs);

      await contract.initializeGame({
        value: ethers.utils.parseEther("0.5"),
      });
      await contract.connect(account2).startGame(0, {
        value: ethers.utils.parseEther("0.5"),
      });

      await contract.playMove(0, 0);
      await contract.connect(account2).playMove(0, 0);
      await contract.playMove(0, 1);
      await contract.connect(account2).playMove(0, 1);
      await contract.playMove(0, 2);
      await contract.connect(account2).playMove(0, 2);
      await contract.playMove(0, 3);
      await contract.connect(account2).playMove(0, 0);

      const claimRewardTxn = await contract.claimReward(
        0,
        account1.address,
        0,
        0,
        3
      );

      expect(claimRewardTxn)
        .to.emit(contract, "RewardClaimed")
        .withArgs(
          0,
          account1.address,
          account1.address,
          ethers.utils.parseEther("1")
        );
    });

    it("allows win on direction up", async () => {
      const contract = await getDeployedContract(deployArgs);

      await contract.initializeGame({
        value: ethers.utils.parseEther("1"),
      });
      await contract.connect(account2).startGame(0, {
        value: ethers.utils.parseEther("1"),
      });

      await contract.playMove(0, 1);
      await contract.connect(account2).playMove(0, 0);
      await contract.playMove(0, 1);
      await contract.connect(account2).playMove(0, 0);
      await contract.playMove(0, 1);
      await contract.connect(account2).playMove(0, 0);
      await contract.playMove(0, 6);
      await contract.connect(account2).playMove(0, 0);

      const claimRewardTxn = await contract
        .connect(account2)
        .claimReward(0, account2.address, 0, 0, 1);

      expect(claimRewardTxn)
        .to.emit(contract, "RewardClaimed")
        .withArgs(
          0,
          account2.address,
          account2.address,
          ethers.utils.parseEther("2")
        );
    });

    it("allows win on direction right diagonal", async () => {
      const contract = await getDeployedContract(deployArgs);

      await contract.connect(account3).initializeGame({
        value: ethers.utils.parseEther("1"),
      });
      await contract.connect(account2).startGame(0, {
        value: ethers.utils.parseEther("1"),
      });

      await contract.connect(account3).playMove(0, 0);
      await contract.connect(account2).playMove(0, 1);
      await contract.connect(account3).playMove(0, 1);
      await contract.connect(account2).playMove(0, 2);
      await contract.connect(account3).playMove(0, 3);
      await contract.connect(account2).playMove(0, 2);
      await contract.connect(account3).playMove(0, 2);
      await contract.connect(account2).playMove(0, 3);
      await contract.connect(account3).playMove(0, 3);
      await contract.connect(account2).playMove(0, 4);
      await contract.connect(account3).playMove(0, 3);

      const claimRewardTxn = await contract
        .connect(account3)
        .claimReward(0, account3.address, 0, 0, 2);

      expect(claimRewardTxn)
        .to.emit(contract, "RewardClaimed")
        .withArgs(
          0,
          account3.address,
          account3.address,
          ethers.utils.parseEther("2")
        );
    });

    it("allows win on direction left diagonal", async () => {
      // finish
    });

    it("sends ether on win", async () => {
      const contract = await getDeployedContract(deployArgs);

      await contract.initializeGame({
        value: ethers.utils.parseEther("1"),
      });
      await contract.connect(account2).startGame(0, {
        value: ethers.utils.parseEther("1"),
      });

      await contract.playMove(0, 1);
      await contract.connect(account2).playMove(0, 0);
      await contract.playMove(0, 1);
      await contract.connect(account2).playMove(0, 0);
      await contract.playMove(0, 1);
      await contract.connect(account2).playMove(0, 0);
      await contract.playMove(0, 6);
      await contract.connect(account2).playMove(0, 0);

      let contractBalanceTxn = await contract.provider.getBalance(
        contract.address
      );
      expect(contractBalanceTxn).to.equal(ethers.utils.parseEther("2"));

      await contract
        .connect(account2)
        .claimReward(0, account2.address, 0, 0, 1);

      contractBalanceTxn = await contract.provider.getBalance(contract.address);
      expect(contractBalanceTxn).to.equal(ethers.utils.parseEther("0"));
    });

    it("updates the status of the game to be bet withdrawn", async () => {
      const contract = await getDeployedContract(deployArgs);

      await contract.initializeGame({
        value: ethers.utils.parseEther("1"),
      });
      await contract.connect(account2).startGame(0, {
        value: ethers.utils.parseEther("1"),
      });

      const [, , , initialGameStatusTxn] = await contract.games(0);
      expect(initialGameStatusTxn).to.equal(2);

      await contract.playMove(0, 1);
      await contract.connect(account2).playMove(0, 0);
      await contract.playMove(0, 1);
      await contract.connect(account2).playMove(0, 0);
      await contract.playMove(0, 1);
      await contract.connect(account2).playMove(0, 0);
      await contract.playMove(0, 6);
      await contract.connect(account2).playMove(0, 0);

      await contract
        .connect(account2)
        .claimReward(0, account2.address, 0, 0, 1);

      const [, , , finalGameStatusTxn] = await contract.games(0);
      expect(finalGameStatusTxn).to.equal(3);
    });

    it("errors when attempting to claim reward on game that has been started", async () => {
      const contract = await getDeployedContract(deployArgs);

      await contract.initializeGame({
        value: ethers.utils.parseEther("1"),
      });
      await contract.connect(account2).startGame(0, {
        value: ethers.utils.parseEther("1"),
      });

      await contract.playMove(0, 1);
      await contract.connect(account2).playMove(0, 0);
      await contract.playMove(0, 1);
      await contract.connect(account2).playMove(0, 0);
      await contract.playMove(0, 1);
      await contract.connect(account2).playMove(0, 0);
      await contract.playMove(0, 6);
      await contract.connect(account2).playMove(0, 0);

      await contract
        .connect(account2)
        .claimReward(0, account2.address, 0, 0, 1);

      try {
        await contract
          .connect(account2)
          .claimReward(0, account2.address, 0, 0, 1);
      } catch (error) {
        expect(
          String(error).indexOf("Error: game cannot be claimed") > -1
        ).to.equal(true);
      }
    });
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

      try {
        await contract.boardIndex(100, 5);
      } catch (error) {
        expect(error).to.not.equal(undefined);
      }
    });

    it("throws an error when the row index is out of bounds", async () => {
      const contract = await getDeployedContract(deployArgs);

      try {
        await contract.boardIndex(6, 100);
      } catch (error) {
        expect(error).to.not.equal(undefined);
      }
    });
  });
});
