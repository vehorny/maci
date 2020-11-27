// SPDX-License-Identifier: MIT
pragma experimental ABIEncoderV2;
pragma solidity ^0.7.2;

import { Params } from "./Params.sol";
import { SnarkCommon } from "./crypto/SnarkCommon.sol";
import { SnarkConstants } from "./crypto/SnarkConstants.sol";
import { DomainObjs } from "./DomainObjs.sol";
import { AccQueue, AccQueueQuinaryMaci } from "./trees/AccQueue.sol";
import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";
import { VkRegistry } from "./VkRegistry.sol";

contract MessageAqFactory is Ownable {
    function deploy(uint256 _subDepth) public onlyOwner returns (AccQueueQuinaryMaci) {
        AccQueueQuinaryMaci aq = new AccQueueQuinaryMaci(_subDepth);
        aq.transferOwnership(owner());
        return aq;
    }
}

contract PollFactory is Params, DomainObjs, Ownable {
    MessageAqFactory public messageAqFactory;

    event DeployPoll(uint256 _pollId, address _pollAddr);

    function setMessageAqFactory(MessageAqFactory _messageAqFactory) public onlyOwner {
        messageAqFactory = _messageAqFactory;
    }

    function deploy(
        uint256 _duration,
        uint8 _stateTreeDepth,
        MaxValues memory _maxValues,
        TreeDepths memory _treeDepths,
        BatchSizes memory _batchSizes,
        PubKey memory _coordinatorPubKey,
        VkRegistry _vkRegistry,
        address _pollOwner
    ) public onlyOwner returns (Poll) {

        AccQueueQuinaryMaci messageAq = messageAqFactory.deploy(_treeDepths.messageTreeSubDepth);

        Poll poll = new Poll(
            _duration,
            _stateTreeDepth,
            _maxValues,
            _treeDepths,
            _batchSizes,
            _coordinatorPubKey,
            _vkRegistry,
            messageAq
        );

        messageAq.transferOwnership(address(poll));

        poll.transferOwnership(_pollOwner);

        return poll;
    }
}

contract Poll is Params, DomainObjs, SnarkConstants, SnarkCommon, Ownable {
    // The coordinator's public key
    PubKey public coordinatorPubKey;

    uint256 public deployTime;

    // The duration of the polling period, in seconds
    uint256 public duration;

    // The verifying key signature for the message processing circuit
    uint256 public processVkSig;

    // The verifying key signature for the tally circuit
    uint256 public tallyVkSig;

    // The message queue
    AccQueue public messageAq;

    MaxValues public maxValues;
    TreeDepths public treeDepths;
    BatchSizes public batchSizes;

    uint8 constant internal STATE_TREE_ARITY = 5;
    uint8 constant internal MESSAGE_TREE_ARITY = 5;
    uint8 constant internal VOTE_OPTION_TREE_ARITY = 5;

    event PublishMessage(
        Message _message,
        PubKey _encPubKey
    );

    /*
     * Each MACI instance can have multiple Polls.
     * When a Poll is deployed, its voting period starts immediately.
     */
    constructor(
        uint256 _duration,
        uint8 _stateTreeDepth,
        MaxValues memory _maxValues,
        TreeDepths memory _treeDepths,
        BatchSizes memory _batchSizes,
        PubKey memory _coordinatorPubKey,
        VkRegistry _vkRegistry,
        AccQueue _messageAq
    ) {
        uint8 stateTreeArity = STATE_TREE_ARITY;
        uint8 messageTreeArity = MESSAGE_TREE_ARITY;
        uint8 voteOptionTreeArity = VOTE_OPTION_TREE_ARITY;
        // Validate each item in _maxValues
        require(
            _maxValues.maxUsers <=
                stateTreeArity ** _stateTreeDepth,
            "MACI: maxUsers is too large"
        );

        require(
            _maxValues.maxMessages <=
                messageTreeArity ** _treeDepths.messageTreeDepth,
            "MACI: maxMessages is too large"
        );

        // _messageBatchSize must be lte maxMessages and also be a factor
        require(
            _maxValues.maxMessages >= _batchSizes.messageBatchSize &&
            _maxValues.maxMessages % _batchSizes.messageBatchSize == 0,
            "MACI: invalid _messageBatchSize given"
        );

        require(
            _maxValues.maxUsers >= _treeDepths.intStateTreeDepth &&
            _maxValues.maxUsers % _batchSizes.tallyBatchSize == 0,
            "MACI: invalid maxUsers given"
        );

        require(
            _maxValues.maxVoteOptions <=
                voteOptionTreeArity ** _treeDepths.voteOptionTreeDepth,
            "MACI: maxVoteOptions is too large"
        );

        coordinatorPubKey = _coordinatorPubKey;
        duration = _duration;
        maxValues = _maxValues;
        batchSizes = _batchSizes;
        treeDepths = _treeDepths;

        messageAq = _messageAq;

        uint256 pSig = _vkRegistry.genProcessVkSig(
            _stateTreeDepth,
            _treeDepths.messageTreeDepth,
            _treeDepths.voteOptionTreeDepth,
            _batchSizes.messageBatchSize
        );

        uint256 tSig = _vkRegistry.genTallyVkSig(
            _stateTreeDepth,
            _treeDepths.intStateTreeDepth,
            _treeDepths.voteOptionTreeDepth
        );

        require(
            _vkRegistry.isProcessVkSet(pSig) &&
            _vkRegistry.isTallyVkSet(tSig),
            "Poll: one or both verifying keys not set"
        );

        // Store the VK sigs
        processVkSig = pSig;
        tallyVkSig = tSig;

        // Record the current timestamp
        deployTime = block.timestamp;
    }

    modifier isBeforeVotingDeadline() {
        // Throw if the voting period is over
        uint256 secondsPassed = block.timestamp - deployTime;
        require(secondsPassed <= duration, "Poll: the voting period has passsed");
        _;
    }

    modifier isAfterVotingDeadline() {
        // Throw if the voting period is not
        uint256 secondsPassed = block.timestamp - deployTime;
        require(secondsPassed > duration, "Poll: the voting period has not passsed");
        _;
    }

    /*
     * Allows anyone to publish a message (an encrypted command and signature).
     * This function also enqueues the message.
     * @param _message The message to publish
     * @param _encPubKey An epheremal public key which can be combined with the
     *     coordinator's private key to generate an ECDH shared key which which was
     *     used to encrypt the message.
     */
    function publishMessage(
        Message memory _message,
        PubKey memory _encPubKey
    )
    public
    isBeforeVotingDeadline {
        require(
            _encPubKey.x < SNARK_SCALAR_FIELD && _encPubKey.y < SNARK_SCALAR_FIELD,
            "MACI: _encPubKey values should be less than the snark scalar field"
        );
        uint256 messageLeaf = hashMessage(_message);
        messageAq.enqueue(messageLeaf);

        emit PublishMessage(_message, _encPubKey);
    }

    function mergeMessageAqSubRoots(uint256 _numSrQueueOps)
    public
    onlyOwner
    isAfterVotingDeadline {
        messageAq.mergeSubRoots(_numSrQueueOps);
    }

    function mergeMessageAq()
    public
    onlyOwner
    isAfterVotingDeadline {
        messageAq.merge(treeDepths.messageTreeDepth);
    }

    function batchEnqueuemessage(uint256 _messageSubRoot)
    public
    onlyOwner
    isAfterVotingDeadline {
        messageAq.insertSubTree(_messageSubRoot);
    }

    /*
     * A convenience function to return several storage variables of a Poll in
     * a single call.
     */
    function getState() public view returns (
        PubKey memory,        // coordinatorPubKey
        uint256,              // duration
        uint256,              // processVkSig
        uint256,              // tallyVkSig
        AccQueue,             // messageAq
        MaxValues memory,     // maxValues
        TreeDepths memory,    // treeDepths
        BatchSizes memory     // batchSizes
    ){
        return (
            coordinatorPubKey,
            duration,
            processVkSig,
            tallyVkSig,
            messageAq,
            maxValues,
            treeDepths,
            batchSizes
        );
    }
}
