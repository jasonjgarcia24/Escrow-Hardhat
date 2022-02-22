 import Escrow from './artifacts/contracts/Escrow.sol/Escrow.json';

 export default async function deposit(escrowAddress, signer, value) {
    console.log('DEPOSITING TO: ', escrowAddress);

    // Get instance of Escrow contract
    const rawTx = {
        to: escrowAddress,
        value: value
    };
    await signer.sendTransaction(rawTx);
 }