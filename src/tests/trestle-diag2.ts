import dotenv from 'dotenv';
dotenv.config();
import axios from 'axios';

const TOKEN_URL = 'https://api-trestle.corelogic.com/trestle/oidc/connect/token';
const API_URL = 'https://api-trestle.corelogic.com/trestle/odata';

async function getToken(): Promise<string> {
  const params = new URLSearchParams();
  params.append('grant_type', 'client_credentials');
  params.append('client_id', process.env.TRESTLE_CLIENT_ID!);
  params.append('client_secret', process.env.TRESTLE_CLIENT_SECRET!);
  params.append('scope', 'api');
  const res = await axios.post(TOKEN_URL, params, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    timeout: 15000,
  });
  return res.data.access_token;
}

async function query(token: string, filter: string, select: string, top = 5, label = '') {
  try {
    const res = await axios.get(`${API_URL}/Property`, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      params: { '$filter': filter, '$select': select, '$top': top },
      timeout: 30000,
    });
    const records = res.data?.value || [];
    const total = res.data?.['@odata.count'];
    const countStr = total !== undefined ? ` (total: ${total})` : '';
    console.log(`  [${label}] ${records.length} results${countStr}`);
    return records;
  } catch (err: any) {
    const msg = err.response?.data?.error?.message || err.response?.data || err.message;
    console.log(`  [${label}] ERROR ${err.response?.status}: ${String(msg).substring(0, 200)}`);
    return [];
  }
}

async function run() {
  console.log('=== Trestle LV Diagnostic #2 — Field & Status Deep Dive ===\n');
  const token = await getToken();
  console.log('Auth: OK\n');

  // 1. Look at the actual records we CAN get — inspect all status fields
  console.log('--- 1. Inspect existing records (Closed) for field values ---');
  const closed = await query(token,
    "StandardStatus eq 'Closed'",
    'ListingKey,StandardStatus,MlsStatus,PropertyType,PropertySubType,CountyOrParish,City,ListPrice,ModificationTimestamp',
    5, 'Closed-inspect');
  for (const r of closed) {
    console.log(`    Key=${r.ListingKey} Standard=${r.StandardStatus} Mls=${r.MlsStatus} Type=${r.PropertyType} Sub=${r.PropertySubType} County=${r.CountyOrParish} City=${r.City} Price=${r.ListPrice}`);
    console.log(`    Modified=${r.ModificationTimestamp}`);
  }

  // 2. Try MlsStatus instead of StandardStatus
  console.log('\n--- 2. Query by MlsStatus instead of StandardStatus ---');
  for (const status of ['Active', 'ACT', 'A', 'active', 'ACTIVE']) {
    await query(token, `MlsStatus eq '${status}'`, 'ListingKey,StandardStatus,MlsStatus', 3, `MlsStatus=${status}`);
  }

  // 3. Try contains/startswith on MlsStatus
  console.log('\n--- 3. Try contains on MlsStatus ---');
  try {
    await query(token, "contains(MlsStatus, 'Act')", 'ListingKey,MlsStatus,StandardStatus', 3, 'contains-Act');
  } catch {}
  try {
    await query(token, "startswith(MlsStatus, 'A')", 'ListingKey,MlsStatus,StandardStatus', 3, 'startswith-A');
  } catch {}

  // 4. Check total count of ALL records
  console.log('\n--- 4. Count all records by status ---');
  for (const status of ['Active', 'ActiveUnderContract', 'Closed', 'Expired', 'Withdrawn', 'Pending', 'Hold', 'Delete', 'Canceled']) {
    const res = await query(token, `StandardStatus eq '${status}'`, 'ListingKey', 1, `Count-${status}`);
  }

  // 5. Try $count to get totals
  console.log('\n--- 5. Try $count query ---');
  try {
    const res = await axios.get(`${API_URL}/Property/$count`, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      params: { '$filter': "StandardStatus eq 'Closed'" },
      timeout: 30000,
    });
    console.log(`  Total Closed records: ${res.data}`);
  } catch (err: any) {
    console.log(`  $count error: ${err.response?.status}`);
  }

  try {
    const res = await axios.get(`${API_URL}/Property/$count`, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      params: { '$filter': "PropertyType eq 'Residential'" },
      timeout: 30000,
    });
    console.log(`  Total Residential records: ${res.data}`);
  } catch (err: any) {
    console.log(`  $count error: ${err.response?.status}`);
  }

  // 6. Check available resources/metadata
  console.log('\n--- 6. Check what the MlsStatus values look like in Closed records ---');
  const sample = await query(token,
    "PropertyType eq 'Residential'",
    'ListingKey,StandardStatus,MlsStatus,ListPrice,City',
    10, 'Residential-sample');
  const statuses = new Set<string>();
  const mlsStatuses = new Set<string>();
  for (const r of sample) {
    statuses.add(r.StandardStatus);
    mlsStatuses.add(r.MlsStatus);
    console.log(`    ${r.ListingKey}: Standard=${r.StandardStatus} Mls=${r.MlsStatus} $${r.ListPrice} ${r.City}`);
  }
  console.log(`  Unique StandardStatus values seen: ${[...statuses].join(', ')}`);
  console.log(`  Unique MlsStatus values seen: ${[...mlsStatuses].join(', ')}`);

  console.log('\nDone.');
}

run().catch(e => { console.error('Fatal:', e.message); });
