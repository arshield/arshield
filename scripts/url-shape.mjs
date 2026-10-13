// Verify the recipient-only URL structure produced by the /m page.
import { parseMessageUrl } from '../packages/core/dist/index.js';

const url = process.env.URL;
if (!url) {
  console.log('USAGE: URL=<message url> node scripts/url-shape.mjs');
  process.exit(2);
}

const parsed = parseMessageUrl(url);
console.log('parsed OK');
console.log('has ephemeralSecret (harus false utk recipient-only):', !!parsed.ephemeralSecret);
console.log('signer mlkem pk len:', parsed.signerPublic.mlkem.length);
console.log('blob len:', parsed.blob.length);

// Recipient-only fragment = blob + signer key (2 segmen setelah prefix v1.).
const frag = url.split('#')[1];
const segs = frag.slice(frag.indexOf('.') + 1).split('.');
console.log('segments after prefix:', segs.length);

const ok = !parsed.ephemeralSecret && segs.length === 2;
console.log(ok ? 'URL-SHAPE: PASS ✓ (recipient-only, no embedded key)' : 'URL-SHAPE: FAIL ✗');
process.exit(ok ? 0 : 1);