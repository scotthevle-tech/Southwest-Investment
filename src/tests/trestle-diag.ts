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
    console.log(`  [${label}] ${records.length} results (filter: ${filter})`);
    return records;
  } catch (err: any) {
    const status = err.response?.status;
    const data = err.response?.data;
    console.log(`  [${label}] ERROR ${status}: ${JSON.stringify(data)?.substring(0, 300)}`);
    return [];
  }
}

async function run() {
  console.log('=== Trestle Las Vegas Diagnostic ===\n');

  const token = await getToken();
  console.log('Auth: OK\n');

  const basicFields = 'ListingKey,ListPrice,StandardStatus,MlsStatus,PropertyType,PropertySubType,CountyOrParish,City,SeniorCommunityYN';

  // Test 1: No filter at all — does the data plan have ANY records?
  console.log('--- Test 1: No filter (any records at all?) ---');
  const any = await query(token, '', 'ListingKey,StandardStatus,PropertyType', 5, 'no-filter');
  for (const r of any) {
    console.log(`    Key=${r.ListingKey} Status=${r.StandardStatus} Type=${r.PropertyType}`);
  }

  // Test 2: What statuses exist?
  console.log('\n--- Test 2: Check each status ---');
  for (const status of ['Active', 'ActiveUnderContract', 'Closed', 'Expired', 'Withdrawn', 'Pending', 'Coming Soon']) {
    await query(token, `StandardStatus eq '${status}'`, 'ListingKey,StandardStatus', 3, status);
  }

  // Test 3: What property types exist?
  console.log('\n--- Test 3: Check property types ---');
  for (const pt of ['Residential', 'Land', 'Commercial', 'Residential Income', 'ResidentialIncome']) {
    await query(token, `PropertyType eq '${pt}'`, 'ListingKey,PropertyType,PropertySubType', 3, pt);
  }

  // Test 4: Active + Residential only (no other filters)
  console.log('\n--- Test 4: Active + Residential ---');
  const activeRes = await query(token,
    "StandardStatus eq 'Active' and PropertyType eq 'Residential'",
    basicFields, 5, 'Active+Residential');
  for (const r of activeRes) {
    console.log(`    Key=${r.ListingKey} SubType=${r.PropertySubType} County=${r.CountyOrParish} City=${r.City} Senior=${r.SeniorCommunityYN}`);
  }

  // Test 5: If Active+Residential works, add SubType
  if (activeRes.length > 0) {
    console.log('\n--- Test 5: Active + Residential + SFR SubType ---');
    const withSub = await query(token,
      "StandardStatus eq 'Active' and PropertyType eq 'Residential' and (PropertySubType eq 'SingleFamilyResidence' or PropertySubType eq 'Single Family Residence' or PropertySubType eq 'Detached')",
      basicFields, 5, '+SubType');
    for (const r of withSub) {
      console.log(`    Key=${r.ListingKey} SubType=${r.PropertySubType} County=${r.CountyOrParish}`);
    }

    console.log('\n--- Test 6: Active + Residential + Clark County ---');
    await query(token,
      "StandardStatus eq 'Active' and PropertyType eq 'Residential' and CountyOrParish eq 'Clark'",
      basicFields, 5, '+Clark');

    console.log('\n--- Test 7: Active + Residential + SeniorCommunityYN ---');
    await query(token,
      "StandardStatus eq 'Active' and PropertyType eq 'Residential' and SeniorCommunityYN ne true",
      basicFields, 5, '+NoSenior');
  }

  // Test 6: Grab a sample of whatever exists to see field values
  console.log('\n--- Test 8: Sample 10 records, any status ---');
  const sample = await query(token, '', basicFields, 10, 'sample');
  for (const r of sample) {
    console.log(`    Key=${r.ListingKey} Status=${r.StandardStatus} Type=${r.PropertyType} Sub=${r.PropertySubType} County=${r.CountyOrParish} City=${r.City} Price=${r.ListPrice}`);
  }

  console.log('\nDone.');
}

run().catch(e => { console.error('Fatal:', e.message); });
