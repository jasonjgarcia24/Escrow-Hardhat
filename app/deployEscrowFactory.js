import EscrowFactory from './artifacts/contracts/EscrowFactory.sol/EscrowFactory';
import { ethers } from 'ethers';
import getProvider from './utils/getProvider';

export default async function deployEscrowFactory() {
  const provider = getProvider();
  const beneficiary = document.getElementById("beneficiary").value;
  const arbiter = document.getElementById("arbiter").value;
  const value = ethers.BigNumber.from(
    ethers.utils.parseEther(document.getElementById("eth").value)
  );
  const contract = await deploy();
  console.log('Contract address: ', contract.address);

  filter = { address: contract.address };
  
  provider.on(filter, (log, event) => {
    console.log('LOG: ', log);
    console.log('EVENT: ', event);
  });

  return 1;
}

async function deploy() {
  console.log('Deploying EscrowFactory contract...')
  
  await ethereum.request({ method: 'eth_requestAccounts' });

  const provider = getProvider();
  const signer = provider.getSigner(0);

  console.log('Contract owner: ', await signer.getAddress())
  const factory = new ethers.ContractFactory(EscrowFactory.abi, EscrowFactory.bytecode, signer);

  return factory.deploy();
}
