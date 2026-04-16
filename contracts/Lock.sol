// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract Lock {

    string public message;

    constructor() {
        message = "Hello Blockchain!";
    }

    function setMessage(string memory _message) public {
        message = _message;
    }

    function getMessage() public view returns (string memory) {
        return message;
    }
}