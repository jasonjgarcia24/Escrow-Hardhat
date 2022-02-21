// SPDX-License-Identifier: MIT
pragma solidity ^0.8.5;

import "./Escrow.sol";
import "hardhat/console.sol";

contract EscrowFactory {
    Escrow private escrow;
    address public owner;

    event DeployedFactory(address indexed escrowFactory, address owner);
    event DeployedEscrow(address indexed depositor, address escrow);

    constructor() {
        owner = msg.sender;
        emit DeployedFactory(address(this), msg.sender);
    }

    function deployEscrow(address _arbiter, address payable _beneficiary) external {
        escrow = new Escrow(_arbiter, _beneficiary, msg.sender);
        emit DeployedEscrow(msg.sender, address(escrow));
    }
}