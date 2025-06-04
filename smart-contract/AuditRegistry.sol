// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract AuditRegistry {
    event AuditStored(address indexed user, bytes32 fileHash, string reportHash);

    function storeAudit(address user, bytes32 fileHash, string memory reportHash) public {
        emit AuditStored(user, fileHash, reportHash);
    }
}
