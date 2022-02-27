import React, { useEffect, useState } from "react";
import ethers from 'ethers';
import getProvider from '../utils/getProvider';
import Escrow from '../artifacts/contracts/Escrow.sol/Escrow.json';
import EscrowFactory from '../artifacts/contracts/EscrowFactory.sol/EscrowFactory.json';
import getEventSignature from '../utils/getEventSignature';


const Contracts = () => {
    const [escrowFactoryContractAddress, setContractEscrowFactoryAddress] = useState('');
    const [blockEscrowFactoryNumber, setBlockEscrowFactoryNumber] = useState('');
    const [escrows, setEscrows] = useState('');

    const setContractId = (escrowAddress) => `contract-${escrowAddress.toUpperCase()}`.replace(/\s/g, '');
    const setDepositButtonId = (escrowAddress) => `deposit-${escrowAddress.toUpperCase()}`;
    const setApproveButtonId = (escrowAddress) => `approve-${escrowAddress.toUpperCase()}`;
    const setDepositUpgradeId = (escrowAddress) => `eth-upgrade-${escrowAddress.toUpperCase()}`;
    const setValueId = (escrowAddress) => `value-${escrowAddress.toUpperCase()}`;

    const deployEscrowFactory = async () => {
        console.log('Deploying EscrowFactory contract...');

        const provider = getProvider();
        const signer = provider.getSigner(0);
        console.log('Factory Contract owner: ', await signer.getAddress());

        // Deploy Escrow Factory
        const escrowFactoryContract = new ethers.ContractFactory(EscrowFactory.abi, EscrowFactory.bytecode, signer);
        const tx = await escrowFactoryContract.deploy();
        const blockNumber = await tx.blockNumber();
        console.log('escrowFactoryContract: ', escrowFactoryContract);


        setContractEscrowFactoryAddress(tx.address);
        setBlockEscrowFactoryNumber(blockNumber.toNumber().toString());
        console.log('Factory Contract address: ', escrowFactoryContractAddress);

        // Parse Deployed Factory event
        const filter = { address: escrowFactoryContractAddress };
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
        const escrowFactoryContract = new ethers.Contract(
            escrowFactoryContractAddress,
            EscrowFactory.abi,
            signer
        );
        let tx = await escrowFactoryContract.deployEscrow(arbiter, beneficiary);

        // Parse Deployed Escrow event
        const receipt = await tx.wait();
        const topic = escrowFactoryContract.interface.getEventTopic('DeployedEscrow');
        const log = receipt.logs.find(x => x.topics.indexOf(topic) >= 0);
        const deployedEvent = escrowFactoryContract.interface.parseLog(log);
        const escrowContractAddress = deployedEvent.args['_escrow'];
        const escrowContract = new ethers.Contract(escrowContractAddress, Escrow.abi, signer);
        const filter = { address: escrowContractAddress };

        provider.on(filter, (log, event) => {
            console.log('------ ESCROW CONTRACT LISTENER ------')
            console.log('LOG: ', log);
            console.log('EVENT: ', event);
        });

        // Deposit funds to Escrow
        await deposit(escrowContractAddress, value);
        await fetchEscrows();

        // Set Contract approve listener
        const depositButtonId = setDepositButtonId(escrowContractAddress);
        const approveButtonId = setApproveButtonId(escrowContractAddress);
        const depositUpgradeId = setDepositUpgradeId(escrowContractAddress);

        escrowContract.on('Approved', () => {
            const depositButton = document.getElementById(depositButtonId);
            depositButton.parentNode.removeChild(depositButton);

            const depositUpgradeGroup = document.getElementById(depositUpgradeId);
            depositUpgradeGroup.parentNode.removeChild(depositUpgradeGroup);

            document.getElementById(approveButtonId).className = "complete";
            document.getElementById(approveButtonId).innerText = "✓ It's been approved!";
        });
    }

    const fetchEscrowFactory = async () => {
        const provider = getProvider();

        console.log('FACTORY ADDR: ', escrowFactoryContractAddress)
        console.log('FACTORY BLOCK: ', blockEscrowFactoryNumber)

        const factoryLogs = await provider.getLogs({
            address: escrowFactoryContractAddress,
            fromBlock: parseInt(blockEscrowFactoryNumber),
            topics: [getEventSignature(EscrowFactory.abi, 'DeployedEscrow')]
        });

        return factoryLogs;
    }

    const fetchEscrows = async () => {
        if (!escrowFactoryContractAddress) { return }

        const provider = getProvider();
        const factoryLogs = await fetchEscrowFactory();

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
                const latestLog = logs[logs.length - 1];
                const value = logs.reduce((prev, curr) => {
                    const reduced = parseInt(prev.match(/.{1,66}/g)[0]) + parseInt(curr.data.match(/.{1,66}/g)[0]);
                    const returns = ethers.utils.hexZeroPad(
                        ethers.utils.hexValue(ethers.BigNumber.from(
                            reduced.toString()
                        )), 32
                    ) + '0'.repeat(64 * (logs.length - 1))
                    return returns
                }, ethers.utils.hexZeroPad('0x00', 32 * logs.length));

                return {
                    id: id,
                    arbiter: ethers.utils.hexStripZeros(latestLog.topics[1], 32),
                    beneficiary: ethers.utils.hexStripZeros(latestLog.topics[2], 32),
                    depositor: ethers.utils.hexStripZeros(latestLog.topics[3], 32),
                    contract: escrowAddress,
                    value: ethers.utils.formatEther(value.match(/.{1,66}/g)[0]),
                    contractId: setContractId(escrowAddress),
                    depositButtonId: setDepositButtonId(escrowAddress),
                    approveButtonId: setApproveButtonId(escrowAddress),
                    depositUpgradeId: setDepositUpgradeId(escrowAddress),
                    valueId: setValueId(escrowAddress),
                    isHistoric: isHistoric,
                };
            }
        }));

        setEscrows(allEscrows)
    }

    const deposit = async (escrowAddress, value) => {
        console.log('DEPOSITING TO: ', escrowAddress);
        console.log('DEPOSITING VALUE: ', value);

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

    const approve = async (escrowAddress) => {
        console.log('Approving escrow: ', escrowAddress)

        const provider = getProvider();
        const contractId = setContractId(escrowAddress);

        // TODO: Signer will need to change to be queried from MetaMask
        const signerArbiter = provider.getSigner(2);

        const escrowContractAddress = document.getElementById(contractId).innerHTML.replace(/\s/g, '');
        const escrowContract = new ethers.Contract(escrowContractAddress, Escrow.abi, provider);

        await escrowContract.connect(signerArbiter).approve();
        console.log('APPROVED!!!!')
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
                                    <div id={escrow.contractId}> {escrow.contract} </div>
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
                                            onClick={(e) => {
                                                const depositUpgradeId = e.target.id.replace('deposit-', 'eth-upgrade-');
                                                const valueBigNumber = ethers.BigNumber.from(
                                                    ethers.utils.parseEther(document.getElementById(depositUpgradeId).value)
                                                );
                                                deposit(escrow.contract, valueBigNumber)
                                            }}
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

                                <div
                                    className={!escrow.isHistoric ? "button button-approve" : "complete"}
                                    id={escrow.approveButtonId}
                                    onClick={(e) => {
                                        if (escrow.isHistoric) return

                                        const address = e.target.id.replace('approve-', '');
                                        approve(address)
                                    }}
                                > {!escrow.isHistoric ? "Approve" : "✓ It's been approved!"}
                                </div>
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
        setContractEscrowFactoryAddress(contractValues.escrowFactoryContractAddress);
        setBlockEscrowFactoryNumber(contractValues.blockEscrowFactoryNumber);
    }, [])

    // Save to local storage
    useEffect(() => {
        const contractValues = { escrowFactoryContractAddress, blockEscrowFactoryNumber };
        window.localStorage.setItem("contractValues", JSON.stringify(contractValues));
    });

    // Update with Factory update
    useEffect(() => {
        fetchEscrows()
    }, [escrowFactoryContractAddress, blockEscrowFactoryNumber]);

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

export default Contracts;
