// import { ethers } from 'ethers';
// import deposit from './deposit';
// import getProvider from './utils/getProvider';

async function addContract(
  id, contract, arbiter, beneficiary, depositor, value, isHistoric = false
) {
  const depositButtonId = `deposit-${id}`;
  const approveButtonId = `approve-${id}`;
  const depositUpgradeId = `eth-upgrad-${id}`;
  const valueId = `value-${id}`;

  const container = document.getElementById("container");
  container.innerHTML += createHTML(id, arbiter, beneficiary, depositor, value, isHistoric);

  if (isHistoric) {
    document.getElementById(approveButtonId).className = "complete";
    document.getElementById(approveButtonId).innerText = "✓ It's been approved!";
  }
  else {
    // Set contract listener
    contract.on('Approved', () => {
      const depositButton = document.getElementById(depositButtonId);
      depositButton.parentNode.removeChild(depositButton);

      const depositUpgradeGroup = document.getElementById(depositUpgradeId);
      depositUpgradeGroup.parentNode.removeChild(depositUpgradeGroup);

      document.getElementById(approveButtonId).className = "complete";
      document.getElementById(approveButtonId).innerText = "✓ It's been approved!";
    });

    // Set deposit button listener
    // document.getElementById(depositButtonId).addEventListener("click", async function () {
    //   const provider = getProvider();
    //   const signer = provider.getSigner(0);
    //   const escrowAddress = contract.address;

    //   // Deposit funds to Escrow
    //   let value = document.getElementById(depositUpgradeId).value;
    //   value = ethers.BigNumber.from(ethers.utils.parseEther(value));
    //   await deposit(escrowAddress, signer, value);

    //   // Display updated Escrow balance
    //   const newBalance = await provider.getBalance(escrowAddress);
    //   document.getElementById(valueId).innerHTML = ethers.utils.formatEther(newBalance) + ' ETH';
    // });
  }
}

async function approveCallback(contract, arbiter) {
  console.log('In approve callback ')
  console.log(arbiter)
  // const provider = getProvider();
  // const signer = provider.getSigner(arbiter);
  // await contract.connect(signer).approve();
}

function createHTML(id, arbiter, beneficiary, depositor, value, isHistoric) {
  const depositButtonId = `deposit-${id}`;
  const approveButtonId = `approve-${id}`;
  const depositUpgradeId = `eth-upgrad-${id}`;
  const valueId = `value-${id}`;

  const depositGroup = isHistoric ? '' :
    `<div class="container-deposit-group">
      <div class="button button-deposit container-button-deposit" id="${depositButtonId}">
        Deposit
      </div>
      <div class="container-text-deposit"><input type="text" class="text-deposit" id="${depositUpgradeId}" placeholder="ETH" /></div>
    </div>`;

  return `
    <div class="existing-contract">
      <ul className="fields">
        <li>
          <div> Arbiter </div>
          <div> ${arbiter} </div>
        </li>
        <li>
          <div> Depositor </div>
          <div> ${depositor} </div>
        </li>
        <li>
          <div> Beneficiary </div>
          <div> ${beneficiary} </div>
        </li>
        <li>
          <div> Value </div>
          <div id="${valueId}"> ${value} ETH</div>
        </li>
        ${depositGroup}
        <div class="button button-approve" id="${approveButtonId}">
          Approve
        </div>
      </ul>
    </div>
  `;
}

module.exports = { addContract, approveCallback };