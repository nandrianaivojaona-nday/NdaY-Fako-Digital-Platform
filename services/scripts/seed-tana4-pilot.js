require('dotenv').config();
const admin = require('firebase-admin');
const fs = require('fs');

const serviceAccount = JSON.parse(fs.readFileSync('./serviceAccountKey.json', 'utf8'));
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

const seed = JSON.parse(fs.readFileSync('./nday-fako-pilot-6fok.json', 'utf8'));

const batchWrite = async (collection, docs) => {
  const batch = db.batch();
  docs.forEach(doc => batch.set(db.collection(collection).doc(doc.id), doc));
  await batch.commit();
  console.log(`✅ ${collection}: ${docs.length} docs`);
};

async function run() {
  await db.collection('municipalities').doc('tananarivo4').set(seed.municipalities.tananarivo4);
  await db.collection('operators').doc('nday-fako').set(seed.operators['nday-fako']);
  await db.collection('subscriptions').doc('plans').set(seed.subscriptions.plans);
  await batchWrite('collectors', seed.collectors);   // 12
  await batchWrite('vehicles',   seed.vehicles);     // 6
  await batchWrite('citizens',   seed.citizens);     // 114
  await batchWrite('bins',       seed.bins.sample);  // 48
  console.log('🎉 Pilot seed complete!');
  process.exit(0);
}

run().catch(err => { console.error('❌', err); process.exit(1); });
