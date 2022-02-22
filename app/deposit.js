 import Escrow from './artifacts/contracts/Escrow.sol/Escrow.json';

 export default async function deposit(escrowAddress, signer, value) {
    // Get instance of Escrow contract
    console.log('ESCROW VALUE: ', value)
    const rawTx = {
        to: escrowAddress,
        value: value
    };
    await signer.sendTransaction(rawTx);
 }