// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

contract Certificate {
    struct Cert {
        uint256 certId;
        string userId;
        string studentName;
        string projectName;
        string issueDate;
    }

    uint256 public nextCertId = 1;

    mapping(address => Cert[]) public certificates;
    mapping(uint256 => address) public certOwner;
    mapping(uint256 => Cert) public certById;

    event CertificateIssued(
        address indexed to,
        uint256 certId,
        string userId,
        string studentName,
        string projectName,
        string issueDate
    );

    function issueCertificate(
        string memory userId,
        string memory studentName,
        string memory projectName,
        string memory issueDate
    ) public {
        Cert[] memory userCerts = certificates[msg.sender];
        for (uint256 i = 0; i < userCerts.length; i++) {
            if (
                keccak256(abi.encodePacked(userCerts[i].userId)) == keccak256(abi.encodePacked(userId)) &&
                keccak256(abi.encodePacked(userCerts[i].projectName)) == keccak256(abi.encodePacked(projectName))
            ) {
                revert("Certificate with this user and project already exists");
            }
        }

        uint256 certId = nextCertId;

        Cert memory newCert = Cert({
            certId: certId,
            userId: userId,
            studentName: studentName,
            projectName: projectName,
            issueDate: issueDate
        });

        certificates[msg.sender].push(newCert);
        certOwner[certId] = msg.sender;
        certById[certId] = newCert;

        emit CertificateIssued(msg.sender, certId, userId, studentName, projectName, issueDate);

        nextCertId++;
    }

    function getMyCertificates() public view returns (Cert[] memory) {
        return certificates[msg.sender];
    }

   function verifyCertificate(uint256 certId, string memory userId) public view returns (Cert memory, address owner) {
    require(certOwner[certId] != address(0), "Certificate not found");

    Cert memory cert = certById[certId];
    require(
        keccak256(abi.encodePacked(cert.userId)) == keccak256(abi.encodePacked(userId)),
        "User ID does not match"
    );

    return (cert, certOwner[certId]);
}

}
