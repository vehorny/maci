// SPDX-License-Identifier: MIT
pragma solidity ^0.8.10;

import { MACI } from "../MACI.sol";

/// @title SignUpGatekeeper
/// @notice A gatekeeper contract which allows users to sign up for a poll.
abstract contract SignUpGatekeeper {
  /// @notice Allows to set the MACI contract
  function setMaciInstance(MACI _maci) public virtual {}

  /// @notice Registers the user
  /// @param _user The address of the user
  /// @param _data additional data
  function register(address _user, bytes memory _data) public virtual {}
}
