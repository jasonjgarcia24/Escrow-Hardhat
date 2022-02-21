import { ethers } from 'ethers';
import getProvider from './utils/getProvider';

export default async function addContract(
  id, contract, arbiter, beneficiary, depositor, value, isHistoric = false
) {
  const buttonId = `approve-${id}`;

  const container = document.getElementById("container");
  container.innerHTML += createHTML(buttonId, arbiter, beneficiary, depositor, value);

  if (isHistoric) {
    document.getElementById(buttonId).className = "complete";
    document.getElementById(buttonId).innerText = "✓ It's been approved!";
  }
  else {
    contract.on('Approved', () => {
      document.getElementById(buttonId).className = "complete";
      document.getElementById(buttonId).innerText = "✓ It's been approved!";
    });

    document.getElementById(buttonId).addEventListener("click", async () => {
      const provider = getProvider();
      const signer = provider.getSigner(arbiter);
      value = ethers.BigNumber.from(value.toString());
      await contract.connect(signer).approve({ value });
    });
  }
}

function createHTML(buttonId, arbiter, beneficiary, depositor, value) {
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
          <div> ${value} </div>
        </li>
        <div class="button button-approve" id="${buttonId}">
          Approve
        </div>
        <div class="button button-deposit" id="${buttonId}">
          Deposit
        </div>
      </ul>
    </div>
  `;
}
