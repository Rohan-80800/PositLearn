const hre = require("hardhat");

async function main() {
  const certFactory = await hre.ethers.getContractFactory("Certificate");
  const cert = await certFactory.deploy();

  await cert.waitForDeployment();

  console.log("Certificate deployed at:", await cert.getAddress());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
