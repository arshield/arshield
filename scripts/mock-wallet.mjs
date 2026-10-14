// Injects a deterministic EIP-1193 mock provider (test wallet on ARC) into the
// page so the wallet flow can be exercised headlessly. Run BEFORE the app's
// useWallet reads window.ethereum.
// Usage: inject in browser_console on the target page.
import { secp256k1 } from '@noble/curves/secp256k1.js';
import { keccak_256 } from '@noble/hashes/sha3.js';
import { bytesToHex, hexToBytes } from '@noble/hashes/utils.js';

const TEST_PK = hexToBytes('ac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80');
const ADDR = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';
const DERIVATION_MSG =
  'ArShield keypair derivation v1\n\n' +
  'This signature derives your personal post-quantum encryption keypair.\n' +
  'It grants no permissions and costs no gas.\n\n' +
  'Domain: arc-shield.xyz';

// EIP-191 personal_sign message hash
function personalHash(msg) {
  const body = new TextEncoder().encode(msg);
  const prefix = new TextEncoder().encode(`\x19Ethereum Signed Message:\n${body.length}`);
  return keccak_256(new Uint8Array([...prefix, ...body]));
}

const msgHash = personalHash(DERIVATION_MSG);
const sig = secp256k1.sign(msgHash, TEST_PK);
const sigHex = '0x' + bytesToHex(sig.toCompactRawBytes()) + (sig.recovery ? '1c' : '1b');

let accounts = [ADDR];
let chainId = '0x1'; // start on Ethereum mainnet to exercise the switch path

const listeners = {};
const emit = (e) => (listeners[e] || []).forEach((fn) => fn());

const provider = {
  isMetaMask: true,
  request: async ({ method, params }) => {
    switch (method) {
      case 'eth_requestAccounts':
        return accounts;
      case 'eth_accounts':
        return accounts;
      case 'eth_chainId':
        return chainId;
      case 'wallet_switchEthereumChain':
        if (chainId === '0x13b2') return null;
        const err = new Error('Unrecognized chain ID');
        err.code = 4902;
        throw err;
      case 'wallet_addEthereumChain': {
        const p = params?.[0];
        if (p?.chainId === '0x13b2') { chainId = '0x13b2'; emit('chainChanged'); return null; }
        throw new Error('Bad chain params');
      }
      case 'personal_sign': {
        const [msgParam, addr] = params;
        if (addr !== ADDR) throw new Error('Wrong account');
        return sigHex;
      }
      default:
        throw new Error(`Unsupported method: ${method}`);
    }
  },
  on: (e, fn) => { (listeners[e] ||= []).push(fn); },
  removeListener: (e, fn) => { listeners[e] = (listeners[e] || []).filter((x) => x !== fn); },
};

window.ethereum = provider;
window.__mockWallet = { address: ADDR, sigHex, chainId: () => chainId };
console.log('[mock] injected provider; chainId=' + chainId);