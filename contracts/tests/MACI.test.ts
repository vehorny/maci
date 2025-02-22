/* eslint-disable no-underscore-dangle */
import { expect } from "chai";
import { AbiCoder, BaseContract, BigNumberish, Signer } from "ethers";
import {
  MaciState,
  genProcessVkSig,
  MaxValues,
  TreeDepths,
  packProcessMessageSmallVals,
  packTallyVotesSmallVals,
  Poll,
} from "maci-core";
import { G1Point, G2Point, NOTHING_UP_MY_SLEEVE } from "maci-crypto";
import { PCommand, VerifyingKey, Keypair, PubKey, Message } from "maci-domainobjs";

import type { IVerifyingKeyStruct } from "../ts/types";
import type { EthereumProvider } from "hardhat/types";

import { parseArtifact, getDefaultSigner } from "../ts/deploy";
import { deployTestContracts } from "../ts/utils";
import {
  AccQueueQuinaryMaci,
  AccQueue,
  MACI,
  MessageProcessor,
  Tally,
  VkRegistry,
  Poll as PollContract,
} from "../typechain-types";

import { timeTravel } from "./utils";

const STATE_TREE_DEPTH = 10;
const STATE_TREE_ARITY = 5;
const MESSAGE_TREE_DEPTH = 4;
const MESSAGE_TREE_SUBDEPTH = 2;

const coordinator = new Keypair();
const [pollAbi] = parseArtifact("Poll");
const [accQueueQuinaryMaciAbi] = parseArtifact("AccQueueQuinaryMaci");

const testProcessVk = new VerifyingKey(
  new G1Point(BigInt(0), BigInt(1)),
  new G2Point([BigInt(2), BigInt(3)], [BigInt(4), BigInt(5)]),
  new G2Point([BigInt(6), BigInt(7)], [BigInt(8), BigInt(9)]),
  new G2Point([BigInt(10), BigInt(11)], [BigInt(12), BigInt(13)]),
  [new G1Point(BigInt(14), BigInt(15)), new G1Point(BigInt(16), BigInt(17))],
);

const testTallyVk = new VerifyingKey(
  new G1Point(BigInt(0), BigInt(1)),
  new G2Point([BigInt(2), BigInt(3)], [BigInt(4), BigInt(5)]),
  new G2Point([BigInt(6), BigInt(7)], [BigInt(8), BigInt(9)]),
  new G2Point([BigInt(10), BigInt(11)], [BigInt(12), BigInt(13)]),
  [new G1Point(BigInt(14), BigInt(15)), new G1Point(BigInt(16), BigInt(17))],
);

const compareVks = (vk: VerifyingKey, vkOnChain: VerifyingKey) => {
  expect(vk.ic.length).to.eq(vkOnChain.ic.length);
  for (let i = 0; i < vk.ic.length; i += 1) {
    expect(vk.ic[i].x.toString()).to.eq(vkOnChain.ic[i].x.toString());
    expect(vk.ic[i].y.toString()).to.eq(vkOnChain.ic[i].y.toString());
  }
  expect(vk.alpha1.x.toString()).to.eq(vkOnChain.alpha1.x.toString());
  expect(vk.alpha1.y.toString()).to.eq(vkOnChain.alpha1.y.toString());
  expect(vk.beta2.x[0].toString()).to.eq(vkOnChain.beta2.x[0].toString());
  expect(vk.beta2.x[1].toString()).to.eq(vkOnChain.beta2.x[1].toString());
  expect(vk.beta2.y[0].toString()).to.eq(vkOnChain.beta2.y[0].toString());
  expect(vk.beta2.y[1].toString()).to.eq(vkOnChain.beta2.y[1].toString());
  expect(vk.delta2.x[0].toString()).to.eq(vkOnChain.delta2.x[0].toString());
  expect(vk.delta2.x[1].toString()).to.eq(vkOnChain.delta2.x[1].toString());
  expect(vk.delta2.y[0].toString()).to.eq(vkOnChain.delta2.y[0].toString());
  expect(vk.delta2.y[1].toString()).to.eq(vkOnChain.delta2.y[1].toString());
  expect(vk.gamma2.x[0].toString()).to.eq(vkOnChain.gamma2.x[0].toString());
  expect(vk.gamma2.x[1].toString()).to.eq(vkOnChain.gamma2.x[1].toString());
  expect(vk.gamma2.y[0].toString()).to.eq(vkOnChain.gamma2.y[0].toString());
  expect(vk.gamma2.y[1].toString()).to.eq(vkOnChain.gamma2.y[1].toString());
};

const users = [new Keypair(), new Keypair(), new Keypair()];

const signUpTxOpts = { gasLimit: 300000 };

const maciState = new MaciState(STATE_TREE_DEPTH);

// Poll parameters
const duration = 15;
const maxValues: MaxValues = {
  maxMessages: 25,
  maxVoteOptions: 25,
};

const treeDepths: TreeDepths = {
  intStateTreeDepth: 1,
  messageTreeDepth: MESSAGE_TREE_DEPTH,
  messageTreeSubDepth: MESSAGE_TREE_SUBDEPTH,
  voteOptionTreeDepth: 2,
};

const messageBatchSize = 25;
const tallyBatchSize = STATE_TREE_ARITY ** treeDepths.intStateTreeDepth;

const initialVoiceCreditBalance = 100;
let signer: Signer;

describe("MACI", () => {
  let maciContract: MACI;
  let stateAqContract: AccQueueQuinaryMaci;
  let vkRegistryContract: VkRegistry;
  let mpContract: MessageProcessor;
  let tallyContract: Tally;
  let pollId: number;

  describe("Deployment", () => {
    before(async () => {
      signer = await getDefaultSigner();
      const r = await deployTestContracts(initialVoiceCreditBalance, STATE_TREE_DEPTH, true);

      maciContract = r.maciContract;
      stateAqContract = r.stateAqContract;
      vkRegistryContract = r.vkRegistryContract;
      mpContract = r.mpContract;
      tallyContract = r.tallyContract;
    });

    it("MACI.stateTreeDepth should be correct", async () => {
      const std = await maciContract.stateTreeDepth();
      expect(std.toString()).to.eq(STATE_TREE_DEPTH.toString());
    });
  });

  describe("Signups", () => {
    it("should sign up users", async () => {
      const iface = maciContract.interface;

      await Promise.all(
        users.map(async (user, index) => {
          const tx = await maciContract.signUp(
            user.pubKey.asContractParam() as { x: BigNumberish; y: BigNumberish },
            AbiCoder.defaultAbiCoder().encode(["uint256"], [1]),
            AbiCoder.defaultAbiCoder().encode(["uint256"], [0]),
            signUpTxOpts,
          );
          const receipt = await tx.wait();
          expect(receipt?.status).to.eq(1);

          // Store the state index
          const log = receipt!.logs[receipt!.logs.length - 1];
          const event = iface.parseLog(log as unknown as { topics: string[]; data: string }) as unknown as {
            args: {
              _stateIndex: BigNumberish;
              _voiceCreditBalance: BigNumberish;
              _timestamp: BigNumberish;
            };
          };

          expect(event.args._stateIndex.toString()).to.eq((index + 1).toString());

          maciState.signUp(
            user.pubKey,
            BigInt(event.args._voiceCreditBalance.toString()),
            BigInt(event.args._timestamp.toString()),
          );
        }),
      );
    });

    it("signUp() should fail when given an invalid pubkey", async () => {
      await expect(
        maciContract.signUp(
          {
            x: "21888242871839275222246405745257275088548364400416034343698204186575808495617",
            y: "0",
          },
          AbiCoder.defaultAbiCoder().encode(["uint256"], [1]),
          AbiCoder.defaultAbiCoder().encode(["uint256"], [0]),
          signUpTxOpts,
        ),
      ).to.be.revertedWithCustomError(maciContract, "MaciPubKeyLargerThanSnarkFieldSize");
    });
  });

  describe("Merging sign-ups should fail because of onlyPoll", () => {
    it("coordinator should not be able to merge the signUp AccQueue", async () => {
      await expect(maciContract.mergeStateAqSubRoots(0, 0, { gasLimit: 3000000 })).to.be.revertedWithCustomError(
        maciContract,
        "CallerMustBePoll",
      );

      await expect(maciContract.mergeStateAq(0, { gasLimit: 3000000 })).to.be.revertedWithCustomError(
        maciContract,
        "CallerMustBePoll",
      );
    });
  });

  describe("Deploy a Poll", () => {
    let deployTime: number | undefined;

    it("should set VKs and deploy a poll", async () => {
      const std = await maciContract.stateTreeDepth();

      // Set VKs
      let tx = await vkRegistryContract.setVerifyingKeys(
        std.toString(),
        treeDepths.intStateTreeDepth,
        treeDepths.messageTreeDepth,
        treeDepths.voteOptionTreeDepth,
        messageBatchSize,
        testProcessVk.asContractParam() as IVerifyingKeyStruct,
        testTallyVk.asContractParam() as IVerifyingKeyStruct,
        { gasLimit: 1000000 },
      );
      let receipt = await tx.wait();
      expect(receipt?.status).to.eq(1);

      const pSig = await vkRegistryContract.genProcessVkSig(
        std.toString(),
        treeDepths.messageTreeDepth,
        treeDepths.voteOptionTreeDepth,
        messageBatchSize,
      );

      expect(pSig.toString()).to.eq(
        genProcessVkSig(
          Number(std),
          treeDepths.messageTreeDepth,
          treeDepths.voteOptionTreeDepth,
          messageBatchSize,
        ).toString(),
      );

      const isPSigSet = await vkRegistryContract.isProcessVkSet(pSig);
      expect(isPSigSet).to.eq(true);

      const tSig = await vkRegistryContract.genTallyVkSig(
        std.toString(),
        treeDepths.intStateTreeDepth,
        treeDepths.voteOptionTreeDepth,
      );
      const isTSigSet = await vkRegistryContract.isTallyVkSet(tSig);
      expect(isTSigSet).to.eq(true);

      // Check that the VKs are set
      const processVkOnChain = await vkRegistryContract.getProcessVk(
        std,
        treeDepths.messageTreeDepth,
        treeDepths.voteOptionTreeDepth,
        messageBatchSize,
      );

      const tallyVkOnChain = await vkRegistryContract.getTallyVk(
        std.toString(),
        treeDepths.intStateTreeDepth,
        treeDepths.voteOptionTreeDepth,
      );

      compareVks(testProcessVk, processVkOnChain as unknown as VerifyingKey);
      compareVks(testTallyVk, tallyVkOnChain as unknown as VerifyingKey);

      // Create the poll and get the poll ID from the tx event logs
      tx = await maciContract.deployPoll(
        duration,
        maxValues,
        treeDepths,
        coordinator.pubKey.asContractParam() as { x: BigNumberish; y: BigNumberish },
        { gasLimit: 8000000 },
      );
      receipt = await tx.wait();

      const block = await signer.provider!.getBlock(receipt!.blockHash);
      deployTime = block!.timestamp;

      expect(receipt?.status).to.eq(1);
      const iface = maciContract.interface;
      const logs = receipt!.logs[receipt!.logs.length - 1];
      const event = iface.parseLog(logs as unknown as { topics: string[]; data: string }) as unknown as {
        args: { _pollId: number };
      };
      pollId = event.args._pollId;

      const p = maciState.deployPoll(
        duration,
        BigInt(deployTime + duration),
        maxValues,
        treeDepths,
        messageBatchSize,
        coordinator,
      );
      expect(p.toString()).to.eq(pollId.toString());

      // publish the NOTHING_UP_MY_SLEEVE message
      const messageData = [NOTHING_UP_MY_SLEEVE, BigInt(0)];
      for (let i = 2; i < 10; i += 1) {
        messageData.push(BigInt(0));
      }
      const message = new Message(BigInt(1), messageData);
      const padKey = new PubKey([
        BigInt("10457101036533406547632367118273992217979173478358440826365724437999023779287"),
        BigInt("19824078218392094440610104313265183977899662750282163392862422243483260492317"),
      ]);
      maciState.polls[pollId].publishMessage(message, padKey);
    });

    it("should fail when attempting to init twice a Poll", async () => {
      const pollContractAddress = await maciContract.getPoll(pollId);
      const pollContract = new BaseContract(pollContractAddress, pollAbi, signer) as PollContract;

      await expect(pollContract.init()).to.be.reverted;
    });

    it("should set correct storage values", async () => {
      // Retrieve the Poll state and check that each value is correct
      const pollContractAddress = await maciContract.getPoll(pollId);
      const pollContract = new BaseContract(pollContractAddress, pollAbi, signer) as PollContract;

      const dd = await pollContract.getDeployTimeAndDuration();

      expect(Number(dd[0])).to.eq(deployTime);
      expect(Number(dd[1])).to.eq(duration);

      expect(await pollContract.stateAqMerged()).to.eq(false);

      const sb = await pollContract.currentSbCommitment();
      expect(sb.toString()).to.eq("0");

      const sm = await pollContract.numSignUpsAndMessages();
      // There are 3 signups via the MACI instance
      expect(Number(sm[0])).to.eq(3);

      // There are 1 messages until a user publishes a message
      // As we enqueue the NOTHING_UP_MY_SLEEVE hash
      expect(Number(sm[1])).to.eq(1);

      const onChainMaxValues = await pollContract.maxValues();

      expect(Number(onChainMaxValues.maxMessages)).to.eq(maxValues.maxMessages);
      expect(Number(onChainMaxValues.maxVoteOptions)).to.eq(maxValues.maxVoteOptions);

      const onChainTreeDepths = await pollContract.treeDepths();
      expect(Number(onChainTreeDepths.intStateTreeDepth)).to.eq(treeDepths.intStateTreeDepth);
      expect(Number(onChainTreeDepths.messageTreeDepth)).to.eq(treeDepths.messageTreeDepth);
      expect(Number(onChainTreeDepths.messageTreeSubDepth)).to.eq(treeDepths.messageTreeSubDepth);
      expect(Number(onChainTreeDepths.voteOptionTreeDepth)).to.eq(treeDepths.voteOptionTreeDepth);

      const onChainBatchSizes = await pollContract.batchSizes();
      expect(Number(onChainBatchSizes.messageBatchSize)).to.eq(messageBatchSize);
      expect(Number(onChainBatchSizes.tallyBatchSize)).to.eq(tallyBatchSize);
    });
  });

  describe("Publish messages (vote + key-change)", () => {
    let pollContract: PollContract;

    before(async () => {
      const pollContractAddress = await maciContract.getPoll(pollId);
      pollContract = new BaseContract(pollContractAddress, pollAbi, signer) as PollContract;
    });

    it("should publish a message to the Poll contract", async () => {
      const keypair = new Keypair();

      const command = new PCommand(
        BigInt(1),
        keypair.pubKey,
        BigInt(0),
        BigInt(9),
        BigInt(1),
        BigInt(pollId),
        BigInt(0),
      );

      const signature = command.sign(keypair.privKey);
      const sharedKey = Keypair.genEcdhSharedKey(keypair.privKey, coordinator.pubKey);
      const message = command.encrypt(signature, sharedKey);
      const tx = await pollContract.publishMessage(
        message.asContractParam(),
        keypair.pubKey.asContractParam() as { x: BigNumberish; y: BigNumberish },
      );
      const receipt = await tx.wait();
      expect(receipt?.status).to.eq(1);

      maciState.polls[pollId].publishMessage(message, keypair.pubKey);
    });

    it("shold not publish a message after the voting period", async () => {
      const dd = await pollContract.getDeployTimeAndDuration();
      await timeTravel(signer.provider as unknown as EthereumProvider, Number(dd[0]) + 1);

      const keypair = new Keypair();
      const command = new PCommand(
        BigInt(0),
        keypair.pubKey,
        BigInt(0),
        BigInt(0),
        BigInt(0),
        BigInt(pollId),
        BigInt(0),
      );

      const signature = command.sign(keypair.privKey);
      const sharedKey = Keypair.genEcdhSharedKey(keypair.privKey, coordinator.pubKey);
      const message = command.encrypt(signature, sharedKey);

      await expect(
        pollContract.publishMessage(
          message.asContractParam(),
          keypair.pubKey.asContractParam() as { x: BigNumberish; y: BigNumberish },
          { gasLimit: 300000 },
        ),
      ).to.be.revertedWithCustomError(pollContract, "VotingPeriodOver");
    });
  });

  describe("Merge messages", () => {
    let pollContract: PollContract;
    let messageAqContract: AccQueue;

    beforeEach(async () => {
      const pollContractAddress = await maciContract.getPoll(pollId);
      pollContract = new BaseContract(pollContractAddress, pollAbi, signer) as PollContract;

      const extContracts = await pollContract.extContracts();

      const messageAqAddress = extContracts.messageAq;
      messageAqContract = new BaseContract(messageAqAddress, accQueueQuinaryMaciAbi, signer) as AccQueue;
    });

    it("should revert if subtrees are not merged for StateAq", async () => {
      await expect(pollContract.mergeMaciStateAq(0, { gasLimit: 4000000 })).to.be.revertedWithCustomError(
        pollContract,
        "StateAqSubtreesNeedMerge",
      );
    });

    it("coordinator should be able to merge the message AccQueue", async () => {
      let tx = await pollContract.mergeMessageAqSubRoots(0, {
        gasLimit: 3000000,
      });
      let receipt = await tx.wait();
      expect(receipt?.status).to.eq(1);

      tx = await pollContract.mergeMessageAq({ gasLimit: 4000000 });
      receipt = await tx.wait();
      expect(receipt?.status).to.eq(1);
    });

    it("the message root must be correct", async () => {
      const onChainMessageRoot = await messageAqContract.getMainRoot(MESSAGE_TREE_DEPTH);
      const offChainMessageRoot = maciState.polls[pollId].messageTree.root;

      expect(onChainMessageRoot.toString()).to.eq(offChainMessageRoot.toString());
    });
  });

  describe("Tally votes (negative test)", () => {
    it("tallyVotes() should fail as the messages have not been processed yet", async () => {
      const pollContractAddress = await maciContract.getPoll(pollId);
      await expect(
        tallyContract.tallyVotes(pollContractAddress, await mpContract.getAddress(), 0, [0, 0, 0, 0, 0, 0, 0, 0]),
      ).to.be.revertedWithCustomError(tallyContract, "ProcessingNotComplete");
    });
  });

  describe("Process messages (negative test)", () => {
    it("processMessages() should fail if the state AQ has not been merged", async () => {
      const pollContractAddress = await maciContract.getPoll(pollId);

      await expect(
        mpContract.processMessages(pollContractAddress, 0, [0, 0, 0, 0, 0, 0, 0, 0]),
      ).to.be.revertedWithCustomError(mpContract, "StateAqNotMerged");
    });
  });

  describe("Merge sign-ups as the Poll", () => {
    let pollContract: PollContract;

    before(async () => {
      const pollContractAddress = await maciContract.getPoll(pollId);
      pollContract = new BaseContract(pollContractAddress, pollAbi, signer) as PollContract;
    });

    it("The Poll should be able to merge the signUp AccQueue", async () => {
      let tx = await pollContract.mergeMaciStateAqSubRoots(0, pollId, {
        gasLimit: 3000000,
      });
      let receipt = await tx.wait();
      expect(receipt?.status).to.eq(1);

      tx = await pollContract.mergeMaciStateAq(pollId, {
        gasLimit: 3000000,
      });
      receipt = await tx.wait();
      expect(receipt?.status).to.eq(1);
    });

    it("the state root must be correct", async () => {
      const onChainStateRoot = await stateAqContract.getMainRoot(STATE_TREE_DEPTH);
      expect(onChainStateRoot.toString()).to.eq(maciState.stateTree.root.toString());
    });
  });

  describe("Process messages", () => {
    let pollContract: PollContract;
    let poll: Poll;
    let generatedInputs: { newSbCommitment: bigint };

    before(async () => {
      const pollContractAddress = await maciContract.getPoll(pollId);
      pollContract = new BaseContract(pollContractAddress, pollAbi, signer) as PollContract;

      poll = maciState.polls[pollId];
      generatedInputs = poll.processMessages(pollId) as typeof generatedInputs;
    });

    it("genProcessMessagesPackedVals() should generate the correct value", async () => {
      const packedVals = packProcessMessageSmallVals(
        BigInt(maxValues.maxVoteOptions),
        BigInt(users.length),
        0,
        poll.messages.length,
      );
      const onChainPackedVals = BigInt(
        await mpContract.genProcessMessagesPackedVals(await pollContract.getAddress(), 0, users.length),
      );
      expect(packedVals.toString(16)).to.eq(onChainPackedVals.toString(16));
    });

    it("processMessages() should update the state and ballot root commitment", async () => {
      const pollContractAddress = await maciContract.getPoll(pollId);

      // Submit the proof
      const tx = await mpContract.processMessages(
        pollContractAddress,
        generatedInputs.newSbCommitment,
        [0, 0, 0, 0, 0, 0, 0, 0],
      );

      const receipt = await tx.wait();
      expect(receipt?.status).to.eq(1);

      const processingComplete = await mpContract.processingComplete();
      expect(processingComplete).to.eq(true);

      const onChainNewSbCommitment = await mpContract.sbCommitment();
      expect(generatedInputs.newSbCommitment).to.eq(onChainNewSbCommitment.toString());
    });
  });

  describe("Tally votes", () => {
    it("genTallyVotesPackedVals() should generate the correct value", async () => {
      const onChainPackedVals = BigInt(await tallyContract.genTallyVotesPackedVals(users.length, 0, tallyBatchSize));
      const packedVals = packTallyVotesSmallVals(0, tallyBatchSize, users.length);
      expect(onChainPackedVals.toString()).to.eq(packedVals.toString());
    });

    it("tallyVotes() should update the tally commitment", async () => {
      const poll = maciState.polls[pollId];
      const generatedInputs = poll.tallyVotes() as { newTallyCommitment: bigint };

      const pollContractAddress = await maciContract.getPoll(pollId);
      const tx = await tallyContract.tallyVotes(
        pollContractAddress,
        await mpContract.getAddress(),
        generatedInputs.newTallyCommitment,
        [0, 0, 0, 0, 0, 0, 0, 0],
      );

      const receipt = await tx.wait();
      expect(receipt?.status).to.eq(1);

      const onChainNewTallyCommitment = await tallyContract.tallyCommitment();

      expect(generatedInputs.newTallyCommitment).to.eq(onChainNewTallyCommitment.toString());

      await expect(
        tallyContract.tallyVotes(
          pollContractAddress,
          await mpContract.getAddress(),
          generatedInputs.newTallyCommitment,
          [0, 0, 0, 0, 0, 0, 0, 0],
        ),
      ).to.be.revertedWithCustomError(tallyContract, "AllBallotsTallied");
    });
  });
});
