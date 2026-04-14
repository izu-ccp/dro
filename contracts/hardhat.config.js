import "@nomicfoundation/hardhat-toolbox";

export default {
  solidity: {
    version: "0.8.22",
    settings: {
      optimizer: { enabled: true, runs: 200 },
    },
  },
  networks: {
    "celo-sepolia": {
      url: "https://sepolia.celo.org",
      accounts: [process.env.DEPLOYER_PRIVATE_KEY],
      chainId: 84532,
    },
  },
};
