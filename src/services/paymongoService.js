// ─── PayMongo Integration ─────────────────────────────────────────
// Docs: https://developers.paymongo.com
//
// NOTE: For production, move API calls to a backend/edge function
// so the secret key is never exposed in the browser bundle.
// For this MVP/demo, test keys are used directly from the frontend.

// Use proxy in development to bypass CORS, fallback to direct URL in production
const BASE_URL = process.env.NODE_ENV === 'development' ? '/v1' : 'https://api.paymongo.com/v1';

function authHeader() {
  const key = process.env.REACT_APP_PAYMONGO_SECRET_KEY;
  // PayMongo uses HTTP Basic Auth: base64(secret_key + ":")
  return 'Basic ' + btoa(key + ':');
}

// ─── Create a Payment Link ────────────────────────────────────────
// Returns the full PayMongo link object including checkout_url
// Amount is in PHP (e.g. 50000 = ₱50,000). Max per link: ₱100,000
// For large contracts, split into milestone payments.
export async function createPaymentLink({ amount, description, remarks }) {
  const amountCentavos = Math.round(Number(amount) * 100);

  if (amountCentavos < 10000) {
    throw new Error('Minimum PayMongo payment is ₱100.00');
  }
  if (amountCentavos > 10000000) {
    throw new Error('Maximum per PayMongo link is ₱100,000. Please split into milestone payments.');
  }

  const res = await fetch(`${BASE_URL}/links`, {
    method:  'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': authHeader(),
    },
    body: JSON.stringify({
      data: {
        attributes: {
          amount:      amountCentavos,
          description: description || 'BuildBid PH Payment',
          remarks:     remarks     || '',
        },
      },
    }),
  });

  const json = await res.json();

  if (!res.ok) {
    const detail = json.errors?.[0]?.detail || 'PayMongo error. Check your API key.';
    throw new Error(detail);
  }

  return json.data; // { id, attributes: { checkout_url, status, amount, ... } }
}

// ─── Check Payment Link Status ────────────────────────────────────
// Possible statuses: 'unpaid' | 'paid' | 'expired'
export async function getPaymentLinkStatus(linkId) {
  const res = await fetch(`${BASE_URL}/links/${linkId}`, {
    headers: { 'Authorization': authHeader() },
  });

  const json = await res.json();

  if (!res.ok) {
    throw new Error(json.errors?.[0]?.detail || 'Failed to check payment status.');
  }

  return json.data.attributes.status; // 'unpaid' | 'paid' | 'expired'
}
