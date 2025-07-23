import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("CertificateModule", (m) => {
  const certificate = m.contract("Certificate");

  return { certificate };
});

