require("@nomicfoundation/hardhat-toolbox");

const RPC_URL = process.env.RPC_URL;
const PRIVATE_KEY = process.env.PRIVATE_KEY;

module.exports = {
  solidity: "0.8.28",
  networks: {
    localganache: {
      url:RPC_URL ,
      accounts: [PRIVATE_KEY]
    }
  }
};
