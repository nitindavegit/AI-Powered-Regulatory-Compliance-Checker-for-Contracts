// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract ContractRegistry {
    struct ContractRecord {
        string ipfsHash;
        uint256 timestamp;
        address uploader;
        bool exists;
    }

    mapping(string => ContractRecord) private records;

    event ContractStored(
        string contractHash,
        string ipfsHash,
        address indexed uploader,
        uint256 timestamp
    );

    function storeContractHash(
        string memory contractHash,
        string memory ipfsHash
    ) external {
        require(bytes(contractHash).length > 0, "Contract hash cannot be empty");
        require(!records[contractHash].exists, "Contract already registered");

        records[contractHash] = ContractRecord({
            ipfsHash: ipfsHash,
            timestamp: block.timestamp,
            uploader: msg.sender,
            exists: true
        });

        emit ContractStored(contractHash, ipfsHash, msg.sender, block.timestamp);
    }

    function getContractRecord(
        string memory contractHash
    )
        external
        view
        returns (string memory ipfsHash, uint256 timestamp, address uploader, bool exists)
    {
        ContractRecord memory record = records[contractHash];
        return (record.ipfsHash, record.timestamp, record.uploader, record.exists);
    }

    function isContractRegistered(string memory contractHash) external view returns (bool) {
        return records[contractHash].exists;
    }
}
