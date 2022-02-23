import "./index.scss";
import Escrow from './artifacts/contracts/Escrow.sol/Escrow.json';
import EscrowFactory from './artifacts/contracts/EscrowFactory.sol/EscrowFactory.json';
import deployEscrow from './deployEscrow';
import deployEscrowFactory from './deployEscrowFactory';
import addContract from './addContract';
import ethers from 'ethers';
import getProvider from './utils/getProvider';
import getEventSignature from './utils/getEventSignature';
import { NETWORK, CONTRACT, BLOCK } from '../utils/config';

let NUM_CONTRACTS = 0;

async function getEscrows() {
  const provider = getProvider();
  const signer = provider.getSigner(0);
  const signerAddress = await signer.getAddress();

  const escrowFactoryContract = new ethers.Contract(CONTRACT[NETWORK], EscrowFactory.abi, signer);
  const latestBlock = await provider.getBlockNumber();
  const block0 = ethers.utils.hexlify(0);

  const factoryLogs = await provider.getLogs({
    address: CONTRACT[NETWORK],
    fromBlock: BLOCK[NETWORK],
    topics: [
      getEventSignature(EscrowFactory.abi, 'DeployedEscrow'),
    ]
  });
 
  factoryLogs.forEach(async factoryLog => {
    const escrowAddress = ethers.utils.hexStripZeros(factoryLog.data.match(/.{1,66}/g)[0], 32);
    const escrowContract = new ethers.Contract(escrowAddress, Escrow.abi, signer);
    const escrowBalance = ethers.utils.formatEther(await provider.getBalance(escrowAddress));   
    const isHistoric = escrowBalance === '0.0';
    const eventName = isHistoric ? 'Approved' : 'Deposit';

    const logs = await provider.getLogs({
      address: escrowAddress,
      fromBlock: factoryLog.blockNumber,
      topics: [
        getEventSignature(Escrow.abi, eventName),
      ]
    });

    if (logs.length > 0) {
      const arbiter = ethers.utils.hexStripZeros(logs[0].topics[1], 32);
      const beneficiary = ethers.utils.hexStripZeros(logs[0].topics[2], 32);
      const depositor = ethers.utils.hexStripZeros(logs[0].topics[3], 32);
      const value = ethers.utils.formatEther(
        ethers.utils.hexStripZeros(logs[0].data.match(/.{1,66}/g)[0])
      );

      addContract(++NUM_CONTRACTS, escrowContract, arbiter, beneficiary, depositor, value, isHistoric);
    }
  });
}

// DEPLOY BUTTON
document.getElementById("deploy").addEventListener("click", deployEscrowFactory);

// TRANSACT BUTTON
document.getElementById("transact").addEventListener("click", async () => {
  NUM_CONTRACTS = await deployEscrow(NUM_CONTRACTS);
});

getEscrows()
  .then(() => console.log('--- FIN ---'))