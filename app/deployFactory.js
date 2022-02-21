import EscrowFactory from './artifacts/contracts/EscrowFactory.sol/EscrowFactory';
import { ethers } from 'ethers';
import getProvider from './utils/getProvider';

export default async function deploy() {
  console.log('Deploying EscrowFactory contract...')
  
  await ethereum.request({ method: 'eth_requestAccounts' });

  const provider = getProvider();
  const signer = provider.getSigner(0);

  console.log('Contract owner: ', await signer.getAddress())
  const factory = new ethers.ContractFactory(EscrowFactory.abi, EscrowFactory.bytecode, signer);

  return factory.deploy();
}
