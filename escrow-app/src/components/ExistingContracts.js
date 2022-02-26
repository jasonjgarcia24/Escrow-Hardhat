import React, { useEffect, useState } from 'react';
import ethers from 'ethers';
import getProvider from '../utils/getProvider';
import deposit from '../scripts/deposit';
import Escrow from '../artifacts/contracts/Escrow.sol/Escrow.json';
import EscrowFactory from '../artifacts/contracts/EscrowFactory.sol/EscrowFactory.json';
import getEventSignature from '../utils/getEventSignature';
import { NETWORK, CONTRACT, BLOCK } from '../utils/config';


const Contract = (props) => {
    return (
        <div className="existing-contract" key={`existing-contract-container-${props.id}`}>
            <ul className="fields">

                <li>
                    <div> Arbiter </div>
                    <div> {props.arbiter} </div>
                </li>
                <li>
                    <div> Depositor </div>
                    <div> {props.depositor} </div>
                </li>
                <li>
                    <div> Beneficiary </div>
                    <div> {props.beneficiary} </div>
                </li>
                <li>
                    <div> Value </div>
                    <div id={props.valueId}> {props.value} ETH </div>
                </li>

                {props.isHistoric &&
                    <div className="container-deposit-group">
                        <div className="button button-deposit container-button-deposit" id={props.depositButtonId}>
                            Deposit
                        </div>
                        <div className="container-text-deposit"><input type="text" className="text-deposit" id={props.depositUpgradeId} placeholder="ETH" /></div>
                    </div>
                }

                <div className="button button-approve" id={props.approveButtonId}> Approve </div>

            </ul>
        </div>
    )
}

const ExistingContracts = () => {
    const [escrows, setEscrows] = useState('');

    async function deployEscrow(numContracts) {
        const provider = getProvider();
        const signer = provider.getSigner(0);
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

        setTimeout(() => {
            fetchEscrows();
        }, 2000);

        return numContracts;
    }

    const fetchEscrowFactory = async () => {
        const provider = getProvider();
        const signer = provider.getSigner(0);
        const signerAddress = await signer.getAddress();

        const escrowFactoryContract = new ethers.Contract(CONTRACT[NETWORK], EscrowFactory.abi, signer);
        const latestBlock = await provider.getBlockNumber();

        const factoryLogs = await provider.getLogs({
            address: CONTRACT[NETWORK],
            fromBlock: BLOCK[NETWORK],
            topics: [getEventSignature(EscrowFactory.abi, 'DeployedEscrow')]
        });

        return factoryLogs;
    }

    const fetchEscrows = async () => {
        const provider = getProvider();
        const signer = provider.getSigner(0);
        const signerAddress = await signer.getAddress();
        const factoryLogs = await fetchEscrowFactory();

        const allEscrows = await Promise.all(factoryLogs.map(async (factoryLog, id) => {
            const escrowAddress = ethers.utils.hexStripZeros(factoryLog.topics[2].match(/.{1,66}/g)[0], 32);
            const escrowContract = new ethers.Contract(escrowAddress, Escrow.abi, signer);
            const escrowBalance = ethers.utils.formatEther(await provider.getBalance(escrowAddress));
            const isHistoric = escrowBalance === '0.0';
            const eventName = isHistoric ? 'Approved' : 'Deposit';

            const logs = await provider.getLogs({
                address: escrowAddress,
                fromBlock: factoryLog.blockNumber,
                topics: [getEventSignature(Escrow.abi, eventName)]
            });

            if (logs.length > 0) {
                return await {
                    id: id,
                    arbiter: ethers.utils.hexStripZeros(logs[0].topics[1], 32),
                    beneficiary: ethers.utils.hexStripZeros(logs[0].topics[2], 32),
                    depositor: ethers.utils.hexStripZeros(logs[0].topics[3], 32),
                    value: ethers.utils.formatEther(ethers.utils.hexStripZeros(logs[0].data.match(/.{1,66}/g)[0])),
                    depositButtonId: `deposit-${id}`,
                    approveButtonId: `approve-${id}`,
                    depositUpgradeId: `eth-upgrade-${id}`,
                    valueId: `value-${id}`,
                    isHistoric: isHistoric,
                };
            }
        }));

        setEscrows(allEscrows)
    }

    useEffect(() => { fetchEscrows() }, []);

    const renderEscrows = () => {
        if (escrows.length > 0) {
            const elements = (
                escrows.map(escrow => {
                    return (
                        <Contract
                            key={escrow.id}
                            arbiter={escrow.arbiter}
                            depositor={escrow.depositor}
                            beneficiary={escrow.beneficiary}
                            value={escrow.value}
                            depositButtonId={escrow.depositButtonId}
                            approveButtonId={escrow.approveButtonId}
                            depositUpgradeId={escrow.depositUpgradeId}
                            valueId={escrow.valueId}
                            isHistoric={escrow.isHistoric}
                        />
                    )
                })
            );

            return elements;
        }
    }

    return (
        <div className="existing-contracts">
            <h1> Existing Contracts </h1>
            <div className="existing-contracts-div" id="container">
                {renderEscrows()}
            </div>
        </div>
    )
}

export default ExistingContracts;
