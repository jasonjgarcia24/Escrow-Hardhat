require('dotenv').config();
require("@nomiclabs/hardhat-waffle");
const Web3Wallet = require('./utils/Web3Wallet');
const { RPC_PROVIDER, NETWORK, RPC_PORT } = require('./utils/config');

// Get private key
const web3Wallet = new Web3Wallet({
  mnemonic: process.env.MNEMONIC,
  rpcProvider: RPC_PROVIDER,
  network: NETWORK,
  numberOfWallets: 1,
});

const privateKey = web3Wallet.bip44Wallet[0][0].privateKey;

// This is a sample Hardhat task. To learn how to create your own go to
// https://hardhat.org/guides/create-task.html
task("accounts", "Prints the list of accounts", async (taskArgs, hre) => {
  const accounts = await hre.ethers.getSigners();

  for (const account of accounts) {
    console.log(account.address);
  }
});

// You need to export an object to set up your config
// Go to https://hardhat.org/config/ to learn more

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
  solidity: "0.8.5",
  paths: {
    artifacts: "./escrow-app/artifacts"
  },
  defaultNetwork: 'localhost',
  networks: {
    hardhat: {},
    localhost: {
      url: `http://127.0.0.1:${RPC_PORT.GANACHE}`,
    },
    rinkeby: {
      url: process.env.ALCHEMY_RINKEBY_URL,
      accounts: [privateKey],
    },
    kovan: {
      url: process.env.ALCHEMY_KOVAN_URL,
      accounts: [privateKey],
    }
  }
};
