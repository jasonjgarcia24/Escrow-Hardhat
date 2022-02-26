// SPDX-License-Identifier: MIT
pragma solidity ^0.8.5;

import "./Escrow.sol";
import "hardhat/console.sol";

contract EscrowFactory {
    Escrow private escrow;
    address public owner;
    uint256 public blockNumber;

    event DeployedFactory(
        address indexed _escrowFactory,
        address _owner,
        uint256 _blockNumber
    );
    event DeployedEscrow(
        address indexed _depositor,
        address indexed _escrow,
        address _arbiter,
        address _beneficiary
    );

    constructor() {
        owner = msg.sender;
        blockNumber = block.number;
        emit DeployedFactory(address(this), msg.sender, blockNumber);
    }

    function deployEscrow(address _arbiter, address payable _beneficiary)
        external
        onlyOwner
    {
        require(
            msg.sender != _arbiter,
            "Contract deployer cannot be the arbiter."
        );
        require(
            msg.sender != _beneficiary,
            "Contract deployer cannot be the beneficiary."
        );

        escrow = new Escrow(_arbiter, _beneficiary, msg.sender);
        emit DeployedEscrow(
            msg.sender,
            address(escrow),
            _arbiter,
            _beneficiary
        );
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "You are not authorized.");
        _;
    }
}
