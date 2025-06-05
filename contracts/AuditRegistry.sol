// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title AuditStorage
 * @dev A smart contract for storing audit results (IPFS hashes) for Solidity contracts.
 *      Each audit is linked to a wallet and the keccak256 hash of the source code.
 */

contract AuditStorage {
    struct AuditEntry {
        string ipfsHash;     // IPFS CID of the audit result
        uint256 timestamp;   // When the audit was stored
    }

    // Mapping: user => codeHash => AuditEntry
    mapping(address => mapping(bytes32 => AuditEntry)) private audits;

    // Track all codeHashes a user has audited
    mapping(address => bytes32[]) private userAuditHashes;

    // Event emitted when a new audit is stored
    event AuditStored(address indexed user, bytes32 indexed codeHash, string ipfsHash, uint256 timestamp);

    /**
     * @dev Store or update an audit entry.
     * @param codeHash keccak256 hash of the original Solidity code
     * @param ipfsHash IPFS CID of the audit result
     */
    function storeAudit(bytes32 codeHash, string calldata ipfsHash) external {
        AuditEntry storage entry = audits[msg.sender][codeHash];
        bool isNew = bytes(entry.ipfsHash).length == 0;

        entry.ipfsHash = ipfsHash;
        entry.timestamp = block.timestamp;

        if (isNew) {
            userAuditHashes[msg.sender].push(codeHash);
        }

        emit AuditStored(msg.sender, codeHash, ipfsHash, block.timestamp);
    }

    /**
     * @dev Get audit data for a wallet and a specific code hash.
     */
    function getAudit(address user, bytes32 codeHash) external view returns (string memory ipfsHash, uint256 timestamp) {
        AuditEntry memory entry = audits[user][codeHash];
        return (entry.ipfsHash, entry.timestamp);
    }

    /**
     * @dev Get all code hashes audited by a specific wallet.
     */
    function getAuditedCodeHashes(address user) external view returns (bytes32[] memory) {
        return userAuditHashes[user];
    }
}
