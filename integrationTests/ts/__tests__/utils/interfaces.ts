/**
 * A util interface that represents a vote object
 */
export interface IVote {
  voteOptionIndex: number;
  voteWeight: number;
  nonce: number;
  valid: boolean;
}

/**
 * A util interface that represents a briber object
 */
export interface IBriber {
  voteOptionIndices: number[];
}

/**
 * A util interface that represents a change user keys object
 */
export interface IChangeUsersKeys {
  voteOptionIndex: number;
  voteWeight: number;
}

/**
 * A util interface that represents a subsidy file
 */
export interface Subsidy {
  provider: string;
  maci: string;
  pollId: number;
  newSubsidyCommitment: string;
  results: {
    subsidy: string[];
    salt: string;
  };
}

/**
 * A util interface that represents a test suite
 */
export interface ITestSuite {
  name: string;
  description: string;
  numVotesPerUser: number;
  numUsers: number;
  expectedTally: number[];
  expectedSpentVoiceCredits: number[];
  expectedTotalSpentVoiceCredits: number;
  subsidy?: { enabled: boolean; expectedSubsidy: number[] };
  bribers?: IBriber[];
  votes?: IVote[][];
  changeUsersKeys?: IChangeUsersKeys[][];
}
