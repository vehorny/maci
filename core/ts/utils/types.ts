import {
  Ballot,
  IJsonBallot,
  IJsonCommand,
  IJsonPCommand,
  IJsonStateLeaf,
  IJsonTCommand,
  Keypair,
  Message,
  PCommand,
  PubKey,
  StateLeaf,
  TCommand,
} from "maci-domainobjs";
import { MaciState } from "../MaciState";
import { Poll } from "../Poll";
import { PathElements } from "optimisedmt";

/**
 * A circuit inputs for the circom circuit
 */
export type CircuitInputs = Record<string, string | bigint | bigint[] | string[]>;

/**
 * This interface defines the tree depths.
 * @property intStateTreeDepth - The depth of the intermediate state tree.
 * @property messageTreeDepth - The depth of the message tree.
 * @property messageTreeSubDepth - The depth of the message tree sub.
 * @property voteOptionTreeDepth - The depth of the vote option tree.
 */
export interface TreeDepths {
  intStateTreeDepth: number;
  messageTreeDepth: number;
  messageTreeSubDepth: number;
  voteOptionTreeDepth: number;
}

/**
 * This interface defines the batch sizes.
 * @property tallyBatchSize - The size of the tally batch.
 * @property messageBatchSize - The size of the message batch.
 * @property subsidyBatchSize - The size of the subsidy batch.
 */
export interface BatchSizes {
  tallyBatchSize: number;
  messageBatchSize: number;
  subsidyBatchSize: number;
}

/**
 * This interface defines the maximum values that the circuit can handle.
 * @property maxMessages - The maximum number of messages.
 * @property maxVoteOptions - The maximum number of vote options.
 */
export interface MaxValues {
  maxMessages: number;
  maxVoteOptions: number;
}

/**
 * Represents the public API of the MaciState class.
 */
export interface IMaciState {
  // This method is used for signing up users to the state tree.
  signUp(pubKey: PubKey, initialVoiceCreditBalance: bigint, timestamp: bigint): number;
  // This method is used for deploying poll.
  deployPoll(
    duration: number,
    pollEndTimestamp: bigint,
    maxValues: MaxValues,
    treeDepths: TreeDepths,
    messageBatchSize: number,
    coordinatorKeypair: Keypair,
  ): number;
  // These methods are helper functions.
  deployNullPoll(): void;
  copy(): MaciState;
  equals(m: MaciState): boolean;
  toJSON(): any;
}

/**
 * An interface which represents the public API of the Poll class.
 */
export interface IPoll {
  // These methods are used for sending a message to the poll from user
  publishMessage(message: Message, encPubKey: PubKey): void;
  topupMessage(message: Message): void;
  // These methods are used to generate circuit inputs
  processMessages(pollId: number): CircuitInputs;
  tallyVotes(): CircuitInputs;
  // These methods are helper functions
  hasUnprocessedMessages(): boolean;
  processAllMessages(): { stateLeaves: StateLeaf[]; ballots: Ballot[] };
  hasUntalliedBallots(): boolean;
  hasUnfinishedSubsidyCalculation(): boolean;
  subsidyPerBatch(): CircuitInputs;
  copy(): Poll;
  equals(p: Poll): boolean;
  toJSON(): any;
  setCoordinatorKeypair(serializedPrivateKey: string): void;
}

/**
 * This interface defines the JSON representation of a Poll
 */
export interface IJsonPoll {
  duration: number;
  pollEndTimestamp: string;
  treeDepths: TreeDepths;
  batchSizes: BatchSizes;
  maxValues: MaxValues;
  messages: unknown[];
  commands: IJsonCommand[] | IJsonTCommand[] | IJsonPCommand[];
  ballots: IJsonBallot[];
  encPubKeys: string[];
  currentMessageBatchIndex: number;
  stateLeaves: IJsonStateLeaf[];
  results: string[];
  numBatchesProcessed: number;
}

/**
 * This interface defines the JSON representation of a MaciState
 */
export interface IJsonMaciState {
  stateTreeDepth: number;
  polls: IJsonPoll[];
  stateLeaves: IJsonStateLeaf[];
  pollBeingProcessed: boolean;
  currentPollBeingProcessed: string;
  numSignUps: number;
}

/**
 * An interface describing the output of the processMessage function
 */
export interface IProcessMessagesOutput {
  stateLeafIndex?: number;
  newStateLeaf?: StateLeaf;
  originalStateLeaf?: StateLeaf;
  originalStateLeafPathElements?: PathElements;
  originalVoteWeight?: bigint;
  originalVoteWeightsPathElements?: PathElements;
  newBallot?: Ballot;
  originalBallot?: Ballot;
  originalBallotPathElements?: PathElements;
  command?: PCommand | TCommand;
}
