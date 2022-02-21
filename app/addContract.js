import { ethers } from 'ethers';
import getProvider from './utils/getProvider';

export default async function addContract(
  id, contract, arbiter, beneficiary, depositor, value, isHistoric = false
) {
  const depositButtonId = `deposit-${id}`;
  const approveButtonId = `approve-${id}`;

  const container = document.getElementById("container");
  container.innerHTML += createHTML(
    depositButtonId, approveButtonId, arbiter, beneficiary, depositor, value, isHistoric
  );

  if (isHistoric) {
    document.getElementById(approveButtonId).className = "complete";
    document.getElementById(approveButtonId).innerText = "✓ It's been approved!";
  }
  else {
    contract.on('Approved', () => {
      const depositGroup = document.getElementById(depositButtonId);
      depositGroup.parentNode.removeChild(depositGroup);

      document.getElementById(approveButtonId).className = "complete";
      document.getElementById(approveButtonId).innerText = "✓ It's been approved!";
    });

    document.getElementById(approveButtonId).addEventListener("click", async () => {
      const provider = getProvider();
      const signer = provider.getSigner(arbiter);
      await contract.connect(signer).approve();
    });
  }
}

function createHTML(
  depositButtonId, approveButtonId, arbiter, beneficiary, depositor, value, isHistoric
) {
  const depositGroup = isHistoric ? '' :
    `<div class="container-deposit-group">
      <div class="button button-deposit container-button-deposit" id="${depositButtonId}">
        Deposit
      </div>
      <div class="container-text-deposit"><input type="text" class="text-deposit" id="eth" placeholder="ETH" /></div>
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
          <div> ${value} ETH</div>
        </li>
        ${depositGroup}
        <div class="button button-approve" id="${approveButtonId}">
          Approve
        </div>
      </ul>
    </div>
  `;
}
