import deploy from './deploy';
import deployFactory from './deployFactory';
import addContract from './addContract';
import ethers from 'ethers';
import "./index.scss";
import Escrow from './artifacts/contracts/Escrow.sol/Escrow.json';
import EscrowFactory from './artifacts/contracts/EscrowFactory.sol/EscrowFactory.json';
import getProvider from './utils/getProvider';
import getEventSignature from './utils/getEventSignature';
import { NETWORK, CONTRACT } from '../utils/config';

let NUM_CONTRACTS = 0;

async function newFactory() {
  const provider = getProvider();
  const beneficiary = document.getElementById("beneficiary").value;
  const arbiter = document.getElementById("arbiter").value;
  const value = ethers.BigNumber.from(
    ethers.utils.parseEther(document.getElementById("eth").value)
  );
  const contract = await deployFactory();
  console.log('Contract address: ', contract.address);

  filter = { address: contract.address }
  
  provider.on(filter, (log, event) => {
    console.log('LOG: ', log);
    console.log('EVENT: ', event);
  })
}

async function newEscrow() {
  const provider = getProvider();
  const signer = provider.getSigner(0);
  const depositor = await signer.getAddress();
  const contract = new ethers.Contract(CONTRACT[NETWORK], EscrowFactory.abi, signer);

  const beneficiary = document.getElementById("beneficiary").value;
  const arbiter = document.getElementById("arbiter").value;
  const value = ethers.BigNumber.from(
    ethers.utils.parseEther(document.getElementById("eth").value)
  );

  // Deploy Escrow
  const tx = await contract.deployEscrow(arbiter, beneficiary);
  const receipt = await tx.wait();
  
  // Parse DeployedEscrow event
  const topic = contract.interface.getEventTopic('DeployedEscrow');
  const log = receipt.logs.find(x => x.topics.indexOf(topic) >= 0);
  const deployedEvent = contract.interface.parseLog(log);

  const escrowAddress = deployedEvent.args['escrow']);

  // Get instance of Escrow contract
  const escrowContract = new ethers.Contract(escrowAddress, Escrow.abi, signer);

  // Add contract to existing contract field
  addContract(++NUM_CONTRACTS, escrowContract, arbiter, beneficiary, depositor, value);
}

async function getExistingContracts() {
  const provider = getProvider();

  const latestBlock = await provider.getBlockNumber();
  const block0 = ethers.utils.hexlify(0);
  const block1 = ethers.utils.hexlify(latestBlock);
  
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

getExistingContracts()
  .then(() => {
    console.log('--- FIN ---')
    // document.getElementById("deploy").addEventListener("click", newFactory);
    document.getElementById("transact").addEventListener("click", newEscrow);
  })