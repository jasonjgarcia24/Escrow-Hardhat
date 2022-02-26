import { ethers } from 'ethers';
import Escrow from '../artifacts/contracts/Escrow.sol/Escrow.json';
import EscrowFactory from '../artifacts/contracts/EscrowFactory.sol/EscrowFactory';
import deposit from './deposit';
import getProvider from '../utils/getProvider';
import { NETWORK, CONTRACT } from '../utils/config';

export default async function deployEscrow() {
  const provider = getProvider();
  const signer = provider.getSigner(0);
  const depositor = await signer.getAddress();
  const contract = new ethers.Contract(CONTRACT[NETWORK], EscrowFactory.abi, signer);

  const beneficiary = document.getElementById("beneficiary").value;
  const arbiter = document.getElementById("arbiter").value;
  const value = ethers.utils.parseEther(document.getElementById("eth").value);

  // Deploy Escrow
  let tx = await contract.deployEscrow(arbiter, beneficiary);
  const receipt = await tx.wait();

  // Parse DeployedEscrow event
  const topic = contract.interface.getEventTopic('DeployedEscrow');
  const log = receipt.logs.find(x => x.topics.indexOf(topic) >= 0);
  const deployedEvent = contract.interface.parseLog(log);
  const escrowAddress = deployedEvent.args['_escrow'];
  const escrowContract = new ethers.Contract(escrowAddress, Escrow.abi, signer);
  console.log(escrowContract)

  // Deposit funds to Escrow
  await deposit(escrowAddress, signer, value);
}