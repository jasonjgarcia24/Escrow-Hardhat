// SPDX-License-Identifier: MIT
pragma solidity ^0.8.5;

contract Escrow {
    enum States{ WAITING_FUNDING, FUNDED, PAID }

    address public arbiter;
    address payable public beneficiary;
    address public depositor;
    States public state;

    bool public isApproved;

    event Approved(
        address indexed _arbiter,
        address indexed _beneficiary,
        address indexed _depositor,
        uint256 _value
    );

    event Deposit(
        address indexed _arbiter,
        address indexed _beneficiary,
        address indexed _depositor,
        uint256 _value,
        uint256 _balance
    );

    constructor (address _arbiter, address payable _beneficiary, address _depositor) {
        arbiter = _arbiter;
        beneficiary = _beneficiary;
        depositor = _depositor;
        state = States.WAITING_FUNDING;
    }

    function deposit() internal {
        state = States.FUNDED;
        emit Deposit(arbiter, beneficiary, depositor, msg.value, address(this).balance);
    }

    function approve() external onlyArbiter onlyUnpaid {
        state = States.FUNDED;
        emit Approved(arbiter, beneficiary, depositor, address(this).balance);

        payout();
        isApproved = true;
    }

    function payout() internal onlyFunded {
        uint256 _value = address(this).balance;
        beneficiary.transfer(_value);
        state = States.PAID;
    }

    receive() external payable onlyDepositor onlyUnpaid {
        require(msg.value > 0, "A deposit value must be nonzero.");
        deposit();
    }

    modifier onlyDepositor() {
        require(msg.sender == depositor, "You are not authorized.");
        _;
    }

    modifier onlyArbiter() {
        require(msg.sender == arbiter, "You are not authorized.");
        _;
    }

    modifier onlyUnpaid() {
        require(state != States.PAID, "This contract has already been paid.");
        _;
    }

    modifier onlyFunded() {
        require(state == States.FUNDED, "This contract has not been funded yet.");
        _;
    }
}
