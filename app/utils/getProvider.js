import ethers from 'ethers';
import { NETWORK, RPC_PORT } from '../../utils/config';


export default function getProvider() {
    let provider;
    switch (NETWORK) {
        case 'GANACHE':
            const url = `http://127.0.0.1:${RPC_PORT.GANACHE}`;
            provider = new ethers.providers.JsonRpcProvider(url);
            break;
        default:
            provider = new ethers.providers.AlchemyProvider('rinkeby', process.env.ALCHEMY_RINKEBY_KEY);
    }

return provider;
};