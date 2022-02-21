import "./index.scss";
import Escrow from './artifacts/contracts/Escrow.sol/Escrow.json';
import EscrowFactory from './artifacts/contracts/EscrowFactory.sol/EscrowFactory.json';
import deployEscrow from './deployEscrow';
import deployEscrowFactory from './deployEscrowFactory';
import addContract from './addContract';
import ethers from 'ethers';
import getProvider from './utils/getProvider';
import getEventSignature from './utils/getEventSignature';
import { NETWORK, CONTRACT } from '../utils/config';

let NUM_CONTRACTS = 0;

async function getActiveContracts() {
  const provider = getProvider();

  const latestBlock = await provider.getBlockNumber();
  const block0 = ethers.utils.hexlify(0);
  
  const factoryLogs = await provider.getLogs({
    address: CONTRACT[NETWORK],
    fromBlock: block0,
    topics: [
      getEventSignature(EscrowFactory.abi, 'DeployedEscrow'),
      null,
    ]
  });
 
  factoryLogs.map(async (factoryLog) => {
    const escrowAddress = ethers.utils.hexStripZeros(factoryLog.data, 32);   
    const logs = await provider.getLogs({
      address: escrowAddress,
      fromBlock: block0,
      topics: [
        getEventSignature(Escrow.abi, 'Approved'),
      ]
    });

    console.log('LOG: ', logs)

    const arbiter = ethers.utils.hexStripZeros(logs[0].topics[1], 32);
    const beneficiary = ethers.utils.hexStripZeros(logs[0].topics[2], 32);
    const depositor = ethers.utils.hexStripZeros(logs[0].topics[3], 32);
    const value = ethers.utils.formatEther(
      ethers.utils.hexStripZeros(logs[0].data.match(/.{1,66}/g)[0])
    ) + ' ETH';

    addContract(++NUM_CONTRACTS, escrowAddress, arbiter, beneficiary, depositor, value, true);
  });
}

async function getApprovedContracts() {
  const provider = getProvider();

  const latestBlock = await provider.getBlockNumber();
  const block0 = ethers.utils.hexlify(0);
  
  const factoryLogs = await provider.getLogs({
    address: CONTRACT[NETWORK],
    fromBlock: block0,
    topics: [
      getEventSignature(EscrowFactory.abi, 'DeployedEscrow'),
      null,
    ]
  });

  console.log('ALL LOGS: ', factoryLogs);
 
  factoryLogs.map(async (factoryLog) => {
    const escrowAddress = ethers.utils.hexStripZeros(factoryLog.data, 32);   
    const logs = await provider.getLogs({
      address: escrowAddress,
      fromBlock: block0,
      topics: [
        getEventSignature(Escrow.abi, 'Approved'),
      ]
    });

    if (logs.length > 0) {
      const arbiter = ethers.utils.hexStripZeros(logs[0].topics[1], 32);
      const beneficiary = ethers.utils.hexStripZeros(logs[0].topics[2], 32);
      const depositor = ethers.utils.hexStripZeros(logs[0].topics[3], 32);
      const value = ethers.utils.formatEther(
        ethers.utils.hexStripZeros(logs[0].data.match(/.{1,66}/g)[0])
      );

      addContract(++NUM_CONTRACTS, escrowAddress, arbiter, beneficiary, depositor, value, true);
    }
  });
}

// DEPLOY BUTTON
document.getElementById("deploy").addEventListener("click", deployEscrowFactory);

// TRANSACT BUTTON
document.getElementById("transact").addEventListener("click", async () => {
  NUM_CONTRACTS = await deployEscrow(NUM_CONTRACTS);
});

getApprovedContracts()
  .then(() => console.log('--- FIN ---'))