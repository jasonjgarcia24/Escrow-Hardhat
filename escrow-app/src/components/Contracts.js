import React, { useEffect, useState } from "react";
import ethers from 'ethers';
import getProvider from '../utils/getProvider';
import Escrow from '../artifacts/contracts/Escrow.sol/Escrow.json';
import EscrowFactory from '../artifacts/contracts/EscrowFactory.sol/EscrowFactory.json';
import getEventSignature from '../utils/getEventSignature';


const ContractsCreation = () => {
    const [contractEscrowFactoryAddress, setContractEscrowFactoryAddress] = useState('');
    const [blockEscrowFactoryNumber, setBlockEscrowFactoryNumber] = useState('');
    const [escrows, setEscrows] = useState('');

    const deployEscrowFactory = async () => {
        console.log('Deploying EscrowFactory contract...');

        const provider = getProvider();
        const signer = provider.getSigner(0);
        console.log('Factory Contract owner: ', await signer.getAddress());

        // Deploy Escrow Factory
        const contractEscrowFactory = new ethers.ContractFactory(EscrowFactory.abi, EscrowFactory.bytecode, signer);
        const tx = await contractEscrowFactory.deploy();
        const blockNumber = await tx.blockNumber();

        setContractEscrowFactoryAddress(tx.address);
        setBlockEscrowFactoryNumber(blockNumber.toNumber().toString());
        console.log('Factory Contract address: ', contractEscrowFactoryAddress);

        // Parse Deployed Factory event
        const filter = { address: contractEscrowFactoryAddress };
        provider.on(filter, (log, event) => {
            console.log('------ ESCROW FACTORY CONTRACT LISTENER ------')
            console.log('LOG: ', log);
            console.log('EVENT: ', event);
        });
    }

    const deployEscrow = async () => {
        console.log('Deploying Escrow contract...');

        const provider = getProvider();
        const signer = provider.getSigner(0);
        const beneficiary = document.getElementById("beneficiary").value;
        const arbiter = document.getElementById("arbiter").value;
        const value = ethers.utils.parseEther(document.getElementById("eth").value);
        console.log('Escrow Contract owner: ', await signer.getAddress());

        // Deploy Escrow
        const contractEscrowFactory = new ethers.Contract(
            contractEscrowFactoryAddress,
            EscrowFactory.abi,
            signer
        );
        let tx = await contractEscrowFactory.deployEscrow(arbiter, beneficiary);

        // Parse Deployed Escrow event
        const receipt = await tx.wait();
        const topic = contractEscrowFactory.interface.getEventTopic('DeployedEscrow');
        const log = receipt.logs.find(x => x.topics.indexOf(topic) >= 0);
        const deployedEvent = contractEscrowFactory.interface.parseLog(log);
        const contractEscrowAddress = deployedEvent.args['_escrow'];
        const filter = { address: contractEscrowAddress };

        provider.on(filter, (log, event) => {
            console.log('------ ESCROW CONTRACT LISTENER ------')
            console.log('LOG: ', log);
            console.log('EVENT: ', event);
        });

        // Deposit funds to Escrow
        await deposit(contractEscrowAddress, value);
        await fetchEscrows();
    }

    const fetchEscrowFactory = async () => {
        console.log('fetchEscrowFactory')
        const provider = getProvider();

        console.log('FETCH ESCROW FACTORY (ADDR): ', contractEscrowFactoryAddress)
        console.log('FETCH ESCROW FACTORY (BLOCK NUM): ', blockEscrowFactoryNumber)

        const factoryLogs = await provider.getLogs({
            address: contractEscrowFactoryAddress,
            fromBlock: parseInt(blockEscrowFactoryNumber),
            topics: [getEventSignature(EscrowFactory.abi, 'DeployedEscrow')]
        });
        console.log(factoryLogs)

        return factoryLogs;
    }

    const fetchEscrows = async () => {
        if (!contractEscrowFactoryAddress) { return }

        console.log('fetchEscrows')

        const provider = getProvider();
        const factoryLogs = await fetchEscrowFactory();
        console.log('FACTORY LOGS: ', factoryLogs)

        const allEscrows = await Promise.all(factoryLogs.map(async (factoryLog, id) => {
            const escrowAddress = ethers.utils.hexStripZeros(factoryLog.topics[2].match(/.{1,66}/g)[0], 32);
            const escrowBalance = ethers.utils.formatEther(await provider.getBalance(escrowAddress));
            const isHistoric = escrowBalance === '0.0';
            const eventName = isHistoric ? 'Approved' : 'Deposit';

            const logs = await provider.getLogs({
                address: escrowAddress,
                fromBlock: factoryLog.blockNumber,
                topics: [getEventSignature(Escrow.abi, eventName)]
            });

            if (logs.length > 0) {
                return {
                    id: id,
                    arbiter: ethers.utils.hexStripZeros(logs[0].topics[1], 32),
                    beneficiary: ethers.utils.hexStripZeros(logs[0].topics[2], 32),
                    depositor: ethers.utils.hexStripZeros(logs[0].topics[3], 32),
                    contract: escrowAddress,
                    value: ethers.utils.formatEther(logs[0].data.match(/.{1,66}/g)[0]),
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

    const deposit = async (escrowAddress, value) => {
        console.log('DEPOSITING TO: ', escrowAddress);

        const provider = getProvider();
        const signer = provider.getSigner(0);

        // Get instance of Escrow contract
        const rawTx = {
            to: escrowAddress,
            value: value
        };
        await signer.sendTransaction(rawTx);
        await fetchEscrows();
    }

    const renderEscrows = () => {
        if (escrows.length > 0) {
            const elements = (
                escrows.map(escrow => {
                    return (
                        <div className="existing-contract" key={`existing-contract-container-${escrow.id}`}>
                            <ul className="fields">
                                <li>
                                    <div> Arbiter </div>
                                    <div> {escrow.arbiter} </div>
                                </li>
                                <li>
                                    <div> Depositor </div>
                                    <div> {escrow.depositor} </div>
                                </li>
                                <li>
                                    <div> Beneficiary </div>
                                    <div> {escrow.beneficiary} </div>
                                </li>
                                <li>
                                    <div> Contract </div>
                                    <div> {escrow.contract} </div>
                                </li>
                                <li>
                                    <div> Value </div>
                                    <div id={escrow.valueId}> {escrow.value} ETH </div>
                                </li>

                                {!escrow.isHistoric &&
                                    <div className="container-deposit-group">
                                        <div
                                            className="button button-deposit container-button-deposit"
                                            id={escrow.depositButtonId}
                                        // onClick={() => deposit(escrow.contract, escrow.value)}
                                        >
                                            Deposit
                                        </div>
                                        <div className="container-text-deposit">
                                            <input
                                                type="text"
                                                className="text-deposit"
                                                id={escrow.depositUpgradeId} placeholder="ETH"
                                            />
                                        </div>
                                    </div>
                                }

                                <div className="button button-approve" id={escrow.approveButtonId}> Approve </div>
                            </ul>
                        </div>
                    )
                })
            );

            return elements;
        }
    }

    // Get from local storage
    useEffect(() => {
        const contractValues = JSON.parse(window.localStorage.getItem('contractValues'));
        setContractEscrowFactoryAddress(contractValues.contractEscrowFactoryAddress);
        setBlockEscrowFactoryNumber(contractValues.blockEscrowFactoryNumber);
    }, [])

    // Save to local storage
    useEffect(() => {
        const contractValues = { contractEscrowFactoryAddress, blockEscrowFactoryNumber };
        window.localStorage.setItem("contractValues", JSON.stringify(contractValues));
    });

    useEffect(() => {
        fetchEscrows()
    }, [contractEscrowFactoryAddress, blockEscrowFactoryNumber]);

    return (
        <div className="contract-container">
            <div className="create-contract">
                <h1> New Contract </h1>
                <label>
                    Arbiter Address
                    <input type="text" id="arbiter" defaultValue="0xB3010C222301a6F5479CAd8fAdD4D5C163FA7d8A" />
                </label>

                <label>
                    Beneficiary Address
                    <input type="text" id="beneficiary" defaultValue="0x2D35bD9BEC501955e82437c1A96e4bAade2b8eeb" />
                </label>

                <label>
                    Deposit Amount (in ETH)
                    <input type="text" id="eth" defaultValue="10" />
                </label>

                <div className="button button-deploy" id="deploy" onClick={deployEscrowFactory}>
                    Deploy
                </div>

                <div className="button button-transact" id="transact" onClick={deployEscrow}>
                    Transact
                </div>
            </div>

            <div className="all-existing-contracts">
                <h1> Existing Contracts </h1>
                <div className="existing-contracts-div" id="container">
                    {renderEscrows()}
                </div>
            </div>
        </div>
    )
}

export default ContractsCreation;
