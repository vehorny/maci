import {
  MACI,
  AccQueue,
  Subsidy,
  Tally,
  MessageProcessor,
  Poll as PollContract,
  formatProofForVerifierContract,
  getDefaultSigner,
  parseArtifact,
  VkRegistry,
  Verifier,
  IVerifyingKeyStruct,
} from "maci-contracts";
import {
  banner,
  contractExists,
  error,
  info,
  logError,
  logGreen,
  logRed,
  logYellow,
  readContractAddress,
  success,
} from "../utils/";
import { BaseContract } from "ethers";
import { readFileSync, readdirSync } from "fs";
import { join } from "path";
import { G1Point, G2Point, hashLeftRight } from "maci-crypto";
import { VerifyingKey } from "maci-domainobjs";

/**
 * Command to prove the result of a poll on-chain
 * @param pollId - the id of the poll
 * @param proofDir - the directory containing the proofs
 * @param maciAddress - the address of the MACI contract
 * @param messageProcessorAddress - the address of the MessageProcessor contract
 * @param tallyAddress - the address of the Tally contract
 * @param subsidyAddress - the address of the Subsidy contract
 * @param quiet - whether to log the output
 */
export const proveOnChain = async (
  pollId: string,
  proofDir: string,
  maciAddress?: string,
  messageProcessorAddress?: string,
  tallyAddress?: string,
  subsidyAddress?: string,
  quiet = true,
) => {
  banner(quiet);
  const signer = await getDefaultSigner();

  // check existence of contract addresses
  if (!readContractAddress("MACI") && !maciAddress) logError("MACI contract address is empty");
  if (!readContractAddress("MessageProcessor-" + pollId) && !messageProcessorAddress)
    logError("MessageProcessor contract address is empty");
  if (!readContractAddress("Tally-" + pollId) && !tallyAddress) logError("Tally contract address is empty");
  if (!readContractAddress("Subsidy-" + pollId) && !subsidyAddress) logError("Subsidy contract address is empty");

  // check validity of contract addresses
  const maciContractAddress = maciAddress ? maciAddress : readContractAddress("MACI");
  const messageProcessorContractAddress = messageProcessorAddress
    ? messageProcessorAddress
    : readContractAddress("MessageProcessor-" + pollId);
  const tallyContractAddress = tallyAddress ? tallyAddress : readContractAddress("Tally-" + pollId);
  const subsidyContractAddress = subsidyAddress ? subsidyAddress : readContractAddress("Subsidy-" + pollId);

  // check contracts are deployed on chain
  if (!(await contractExists(signer.provider, maciContractAddress))) logError("MACI contract does not exist");
  if (!(await contractExists(signer.provider, messageProcessorContractAddress)))
    logError("MessageProcessor contract does not exist");
  if (!(await contractExists(signer.provider, tallyContractAddress))) logError("Tally contract does not exist");
  if (!(await contractExists(signer.provider, subsidyContractAddress))) logError("Subsidy contract does not exist");

  const maciContract = new BaseContract(maciContractAddress, parseArtifact("MACI")[0], signer) as MACI;

  const pollAddr = await maciContract.polls(pollId);
  if (!(await contractExists(signer.provider, pollAddr))) {
    logError("There is no Poll contract with this poll ID linked to the specified MACI contract.");
  }

  const pollContract = new BaseContract(pollAddr, parseArtifact("Poll")[0], signer) as PollContract;

  const mpContract = new BaseContract(
    messageProcessorContractAddress,
    parseArtifact("MessageProcessor")[0],
    signer,
  ) as MessageProcessor;

  const tallyContract = new BaseContract(tallyContractAddress, parseArtifact("Tally")[0], signer) as Tally;

  const subsidyContract = new BaseContract(subsidyContractAddress, parseArtifact("Subsidy")[0], signer) as Subsidy;

  const messageAqContractAddress = (await pollContract.extContracts()).messageAq;
  if (!(await contractExists(signer.provider, messageAqContractAddress))) {
    logError("There is no MessageAq contract linked to the specified MACI contract.");
  }

  const messageAqContract = new BaseContract(
    messageAqContractAddress,
    parseArtifact("AccQueue")[0],
    signer,
  ) as AccQueue;

  const vkRegistryContractAddress = (await pollContract.extContracts()).vkRegistry;
  if (!(await contractExists(signer.provider, vkRegistryContractAddress))) {
    logError("There is no VkRegistry contract linked to the specified MACI contract.");
  }
  const vkRegsitryContract = new BaseContract(
    vkRegistryContractAddress,
    parseArtifact("VkRegistry")[0],
    signer,
  ) as VkRegistry;

  const verifierContractAddress = await mpContract.verifier();
  if (!(await contractExists(signer.provider, verifierContractAddress))) {
    logError("There is no Verifier contract linked to the specified MACI contract.");
  }
  const verifierContract = new BaseContract(verifierContractAddress, parseArtifact("Verifier")[0], signer) as Verifier;

  const [pollContractAddress, mpContractAddress] = await Promise.all([
    pollContract.getAddress(),
    mpContract.getAddress(),
  ]);

  const data = {
    processProofs: {},
    tallyProofs: {},
    subsidyProofs: {},
  };

  let numProcessProofs = 0;

  // read the proof directory
  const filenames = readdirSync(proofDir);
  // extract all the proofs data
  for (const filename of filenames) {
    const filepath = join(proofDir, filename);
    let match = filename.match(/process_(\d+)/);
    if (match) {
      data.processProofs[Number(match[1])] = JSON.parse(readFileSync(filepath).toString());
      numProcessProofs++;
      continue;
    }

    match = filename.match(/tally_(\d+)/);
    if (match) {
      data.tallyProofs[Number(match[1])] = JSON.parse(readFileSync(filepath).toString());
      continue;
    }

    match = filename.match(/subsidy_(\d+)/);
    if (match) {
      data.subsidyProofs[Number(match[1])] = JSON.parse(readFileSync(filepath).toString());
    }
  }

  // retrieve the values we need from the smart contracts
  const numSignUpsAndMessages = await pollContract.numSignUpsAndMessages();
  const numSignUps = Number(numSignUpsAndMessages[0]);
  const numMessages = Number(numSignUpsAndMessages[1]);
  const batchSizes = await pollContract.batchSizes();
  const messageBatchSize = Number(batchSizes.messageBatchSize);
  const tallyBatchSize = Number(batchSizes.tallyBatchSize);
  const subsidyBatchSize = Number(batchSizes.subsidyBatchSize);
  let totalMessageBatches = numMessages <= messageBatchSize ? 1 : Math.floor(numMessages / messageBatchSize);

  if (numMessages > messageBatchSize && numMessages % messageBatchSize > 0) {
    totalMessageBatches++;
  }

  // perform validation
  if (numProcessProofs !== totalMessageBatches) {
    logRed(
      quiet,
      error(
        `The proof files inside ${proofDir} do not have the correct number of message processign proofs` +
          `(expected ${totalMessageBatches}, got ${numProcessProofs}.`,
      ),
    );
  }

  const treeDepths = await pollContract.treeDepths();
  let numberBatchesProcessed = Number(await mpContract.numBatchesProcessed());
  const messageRootOnChain = await messageAqContract.getMainRoot(Number(treeDepths.messageTreeDepth));

  const stateTreeDepth = Number(await maciContract.stateTreeDepth());
  const onChainProcessVk = await vkRegsitryContract.getProcessVk(
    stateTreeDepth,
    treeDepths.messageTreeDepth,
    treeDepths.voteOptionTreeDepth,
    messageBatchSize,
  );

  const dd = await pollContract.getDeployTimeAndDuration();
  const pollEndTimestampOnChain = BigInt(dd[0]) + BigInt(dd[1]);

  if (numberBatchesProcessed < totalMessageBatches)
    logYellow(quiet, info("Submitting proofs of message processing..."));

  // process all batches left
  for (let i = numberBatchesProcessed; i < totalMessageBatches; i++) {
    let currentMessageBatchIndex: number;
    if (numberBatchesProcessed === 0) {
      const r = numMessages % messageBatchSize;
      if (r === 0) currentMessageBatchIndex = Math.floor(numMessages / messageBatchSize) * messageBatchSize;
      else currentMessageBatchIndex = numMessages;

      if (currentMessageBatchIndex > 0) {
        if (r === 0) {
          currentMessageBatchIndex -= messageBatchSize;
        } else currentMessageBatchIndex -= r;
      }
    } else currentMessageBatchIndex = (totalMessageBatches - numberBatchesProcessed) * messageBatchSize;

    if (numberBatchesProcessed > 0 && currentMessageBatchIndex > 0) currentMessageBatchIndex -= messageBatchSize;

    const { proof, circuitInputs, publicInputs } = data.processProofs[i];

    // validation
    if (circuitInputs.pollEndTimestamp !== pollEndTimestampOnChain.toString()) logError("pollEndTimestamp mismatch.");
    if (BigInt(circuitInputs.msgRoot).toString() !== messageRootOnChain.toString()) logError("message root mismatch.");

    let currentSbCommitmentOnChain: bigint;
    if (numberBatchesProcessed === 0) currentSbCommitmentOnChain = BigInt(await pollContract.currentSbCommitment());
    else currentSbCommitmentOnChain = BigInt(await mpContract.sbCommitment());

    if (currentSbCommitmentOnChain.toString() !== circuitInputs.currentSbCommitment)
      logError("currentSbCommitment mismatch.");

    const coordPubKeyHashOnChain = BigInt(await pollContract.coordinatorPubKeyHash());
    if (
      hashLeftRight(BigInt(circuitInputs.coordPubKey[0]), BigInt(circuitInputs.coordPubKey[1])).toString() !==
      coordPubKeyHashOnChain.toString()
    )
      logError("coordPubKey mismatch.");

    const packedValsOnChain = BigInt(
      await mpContract.genProcessMessagesPackedVals(pollContractAddress, currentMessageBatchIndex, numSignUps),
    ).toString();

    if (circuitInputs.packedVals !== packedValsOnChain) logError("packedVals mismatch.");

    const formattedProof = formatProofForVerifierContract(proof);

    const publicInputHashOnChain = BigInt(
      await mpContract.genProcessMessagesPublicInputHash(
        pollContractAddress,
        currentMessageBatchIndex,
        messageRootOnChain.toString(),
        numSignUps,
        circuitInputs.currentSbCommitment,
        circuitInputs.newSbCommitment,
      ),
    );

    if (publicInputHashOnChain.toString() !== publicInputs[0].toString()) logError("Public input mismatch.");

    const vk = new VerifyingKey(
      new G1Point(onChainProcessVk.alpha1[0], onChainProcessVk.alpha1[1]),
      new G2Point(onChainProcessVk.beta2[0], onChainProcessVk.beta2[1]),
      new G2Point(onChainProcessVk.gamma2[0], onChainProcessVk.gamma2[1]),
      new G2Point(onChainProcessVk.delta2[0], onChainProcessVk.delta2[1]),
      onChainProcessVk.ic.map(([x, y]) => new G1Point(x, y)),
    );

    // verify the proof onchain using the verifier contract
    const isValidOnChain = await verifierContract.verify(
      formattedProof,
      vk.asContractParam() as IVerifyingKeyStruct,
      publicInputHashOnChain.toString(),
    );
    if (!isValidOnChain) logError("The verifier contract found the proof invalid.");

    try {
      // validate process messaging proof and store the new state and ballot root commitment
      const tx = await mpContract.processMessages(
        pollContractAddress,
        "0x" + BigInt(circuitInputs.newSbCommitment).toString(16),
        formattedProof,
      );
      const receipt = await tx.wait();
      if (receipt.status !== 1) logError("processMessages() failed.");
      logYellow(quiet, info(`Transaction hash: ${tx.hash}`));

      // Wait for the node to catch up
      numberBatchesProcessed = Number(await mpContract.numBatchesProcessed());

      logYellow(quiet, info(`Progress: ${numberBatchesProcessed} / ${totalMessageBatches}`));
    } catch (error: any) {
      logError(`processMessages() failed: ${error}`);
    }
  }

  if (numberBatchesProcessed === totalMessageBatches) {
    logGreen(quiet, success("All message processing proofs have been submitted."));
  }

  // subsidy calculations if any subsidy proofs are provided
  if (Object.keys(data.subsidyProofs).length !== 0) {
    let rbi = Number(await subsidyContract.rbi());
    let cbi = Number(await subsidyContract.cbi());
    const numLeaves = numSignUps + 1;
    const num1DBatches = Math.ceil(numLeaves / subsidyBatchSize);
    let subsidyBatchNum = rbi * num1DBatches + cbi;
    const totalBatchNum = (num1DBatches * (num1DBatches + 1)) / 2;

    logYellow(quiet, info(`number of subsidy batch processed: ${subsidyBatchNum}, numleaf=${numLeaves}`));

    // process all batches
    for (let i = subsidyBatchNum; i < totalBatchNum; i++) {
      if (i == 0) await subsidyContract.updateSbCommitment(mpContractAddress);
      const { proof, circuitInputs, publicInputs } = data.subsidyProofs[i];

      // ensure the commitment matches
      const subsidyCommitmentOnChain = await subsidyContract.subsidyCommitment();
      if (subsidyCommitmentOnChain.toString() !== circuitInputs.currentSubsidyCommitment) {
        logError(`subsidycommitment mismatch`);
      }
      const packedValsOnChain = BigInt(await subsidyContract.genSubsidyPackedVals(numSignUps));
      if (circuitInputs.packedVals !== packedValsOnChain.toString()) {
        logError("subsidy packedVals mismatch.");
      }
      // ensure the state and ballot root commitment matches
      const currentSbCommitmentOnChain = await subsidyContract.sbCommitment();
      if (currentSbCommitmentOnChain.toString() !== circuitInputs.sbCommitment) {
        logError("currentSbCommitment mismatch.");
      }
      const publicInputHashOnChain = await subsidyContract.genSubsidyPublicInputHash(
        numSignUps,
        circuitInputs.newSubsidyCommitment,
      );

      if (publicInputHashOnChain.toString() !== publicInputs[0]) {
        logError("public input mismatch.");
      }

      // format the proof so it can be verify on chain
      const formattedProof = formatProofForVerifierContract(proof);

      try {
        // verify the proof on chain and set the new subsidy commitment
        const tx = await subsidyContract.updateSubsidy(
          pollContractAddress,
          mpContractAddress,
          circuitInputs.newSubsidyCommitment,
          formattedProof,
        );

        const receipt = await tx.wait();
        if (receipt.status !== 1) logError("updateSubsidy() failed.");

        logYellow(quiet, info(`Transaction hash: ${tx.hash}`));
        logYellow(quiet, info(`Progress: ${subsidyBatchNum + 1} / ${totalBatchNum}`));

        const nrbi = Number(await subsidyContract.rbi());
        const ncbi = Number(await subsidyContract.cbi());

        rbi = nrbi;
        cbi = ncbi;
        subsidyBatchNum = rbi * num1DBatches + cbi;
      } catch (error: any) {
        logError(error.message);
      }
    }

    if (subsidyBatchNum === totalBatchNum) {
      logGreen(quiet, success("All subsidy calculation proofs have been submitted."));
    }
  }

  // vote tallying proofs
  const totalTallyBatches = numSignUps < tallyBatchSize ? 1 : Math.floor(numSignUps / tallyBatchSize) + 1;
  let tallyBatchNum = Number(await tallyContract.tallyBatchNum());

  if (tallyBatchNum < totalTallyBatches) logYellow(quiet, info("Submitting proofs of vote tallying..."));

  for (let i = tallyBatchNum; i < totalTallyBatches; i++) {
    if (i === 0) await tallyContract.updateSbCommitment(mpContractAddress);
    const batchStartIndex = i * tallyBatchSize;
    const { proof, circuitInputs, publicInputs } = data.tallyProofs[i];

    const currentTallyCommitmentOnChain = await tallyContract.tallyCommitment();
    if (currentTallyCommitmentOnChain.toString() !== circuitInputs.currentTallyCommitment)
      logError("currentTallyCommitment mismatch.");

    const packedValsOnChain = BigInt(
      await tallyContract.genTallyVotesPackedVals(numSignUps, batchStartIndex, tallyBatchSize),
    );
    if (circuitInputs.packedVals !== packedValsOnChain.toString()) logError("packedVals mismatch.");

    const currentSbCommitmentOnChain = await mpContract.sbCommitment();
    if (currentSbCommitmentOnChain.toString() !== circuitInputs.sbCommitment) logError("currentSbCommitment mismatch.");

    const publicInputHashOnChain = await tallyContract.genTallyVotesPublicInputHash(
      numSignUps,
      batchStartIndex,
      tallyBatchSize,
      circuitInputs.newTallyCommitment,
    );
    if (publicInputHashOnChain.toString() !== publicInputs[0])
      logError(
        `public input mismatch. tallyBatchNum=${i}, onchain=${publicInputHashOnChain.toString()}, offchain=${
          publicInputs[0]
        }`,
      );

    // format the tally proof so it can be verified on chain
    const formattedProof = formatProofForVerifierContract(proof);
    try {
      // verify the proof on chain
      const tx = await tallyContract.tallyVotes(
        pollContractAddress,
        mpContractAddress,
        "0x" + BigInt(circuitInputs.newTallyCommitment).toString(16),
        formattedProof,
      );
      const receipt = await tx.wait();

      if (receipt.status !== 1) logError("tallyVotes() failed");

      logYellow(quiet, info(`Progress: ${tallyBatchNum + 1} / ${totalTallyBatches}`));
      logYellow(quiet, info(`Transaction hash: ${tx.hash}`));

      tallyBatchNum = Number(await tallyContract.tallyBatchNum());
    } catch (error: any) {
      logError(error.message);
    }
  }

  if (tallyBatchNum === totalTallyBatches) logGreen(quiet, success("All vote tallying proofs have been submitted."));
};
