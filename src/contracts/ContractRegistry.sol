// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title ContractRegistry
 * @dev Store and retrieve contract hashes for compliance verification
 */
contract ContractRegistry {
    struct ContractRecord {
        string ipfsHash;
        uint256 timestamp;
        address uploader;
        bool exists;
    }

    mapping(string => ContractRecord) public contracts;
    address[] public contractHashes;
    
    event ContractStored(
        string indexed contractHash,
        string ipfsHash,
        address indexed uploader,
        uint256 timestamp
    );

    /**
     * @dev Store a contract hash and IPFS reference
     */
    function storeContractHash(
        string memory _contractHash,
        string memory _ipfsHash
    ) public {
        require(bytes(_contractHash).length > 0, "Contract hash cannot be empty");
        require(!contracts[_contractHash].exists, "Contract already registered");

        contracts[_contractHash] = ContractRecord({
            ipfsHash: _ipfsHash,
            timestamp: block.timestamp,
            uploader: msg.sender,
            exists: true
        });

        emit ContractStored(_contractHash, _ipfsHash, msg.sender, block.timestamp);
    }

    /**
     * @dev Retrieve contract record
     */
    function getContractRecord(string memory _contractHash)
        public
        view
        returns (
            string memory ipfsHash,
            uint256 timestamp,
            address uploader,
            bool exists
        )
    {
        ContractRecord memory record = contracts[_contractHash];
        return (record.ipfsHash, record.timestamp, record.uploader, record.exists);
    }

    /**
     * @dev Verify if a contract is registered
     */
    function isContractRegistered(string memory _contractHash) public view returns (bool) {
        return contracts[_contractHash].exists;
    }
}
