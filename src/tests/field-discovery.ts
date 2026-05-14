import dotenv from 'dotenv';
dotenv.config();
import axios from 'axios';

async function discoverFields() {
  try {
    const res = await axios.get('https://replication.sparkapi.com/Version/3/Reso/OData/Property', {
      headers: {
        'Authorization': `Bearer ${process.env.SPARK_WASHINGTON_ACCESS_TOKEN}`,
        'Accept': 'application/json',
      },
      params: { '$top': 1 },
    });
    const record = res.data.value[0];
    const keys = Object.keys(record);

    const bath = keys.filter(k => k.toLowerCase().includes('bath'));
    const area = keys.filter(k => k.toLowerCase().includes('area') || k.toLowerCase().includes('living') || k.toLowerCase().includes('building'));
    const bed = keys.filter(k => k.toLowerCase().includes('bed'));
    const hoa = keys.filter(k => k.toLowerCase().includes('assoc') || k.toLowerCase().includes('hoa'));
    const water = keys.filter(k => k.toLowerCase().includes('water'));
    const sewer = keys.filter(k => k.toLowerCase().includes('sewer'));

    console.log('Bathroom fields:', bath.join(', '));
    console.log('Area fields:', area.join(', '));
    console.log('Bedroom fields:', bed.join(', '));
    console.log('HOA fields:', hoa.join(', '));
    console.log('Water fields:', water.join(', '));
    console.log('Sewer fields:', sewer.join(', '));
    console.log();
    console.log('PropertyType:', record.PropertyType);
    console.log('PropertySubType:', record.PropertySubType);
    console.log('StandardStatus:', record.StandardStatus);
    console.log('City:', record.City);
    console.log('Total fields:', keys.length);
  } catch (error: any) {
    console.log('Error:', error.response?.status, JSON.stringify(error.response?.data).substring(0, 300));
  }
}

discoverFields();
