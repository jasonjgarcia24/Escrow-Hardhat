import ethers from 'ethers';

export default function getEventSignature(abi, eventName) {
    // Parse event from ABI
    const eventABI = abi.find(x => x.name === eventName);

    // Parse event signature from event
    let signature = eventName + '(';
    eventABI.inputs.forEach(input => { signature += input.type + ',' });
    signature = signature.replace(/,$/,"") + ')';

    // Create signature hash from event signature
    const signatureHash = ethers.utils.id(signature);

    return signatureHash;
}
