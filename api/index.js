import axios from axios
const admin = require('firebase-admin');
const BMKG_API_URL = 'https://data.bmkg.go.id/DataMKG/TEWS/autogempa.json';
const serviceAccount = require("/path/to/your/serviceAccount.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://belajar-firebase-777-default-rtdb.asia-southeast1.firebasedatabase.app"
});

const db = admin.database();

async function fetchAndStoreData() {
  try {
    const response = await axios.get(BMKG_API_URL);
    if (response.status === 200) {
      const latestData = response.data;
      const dateTime = latestData['Infogempa']['gempa']['DateTime'];
      const shakemapFile = latestData['Infogempa']['gempa']['Shakemap'];
      const shakemapUrl = `https://data.bmkg.go.id/DataMKG/TEWS/${shakemapFile}`;
      latestData['Infogempa']['gempa']['shakemapUrl'] = shakemapUrl;

      const refDate = db.ref(dateTime);
      const ref = db.ref();
      const snapshot = await ref.once('value');

      if (snapshot.exists()) {
        ref.orderByKey().limitToLast(1).on('value', async (snapshot) => {
          const data = snapshot.val();
          const latestKey = Object.keys(data)[0];

          if (latestKey !== dateTime) {
            await refDate.set(latestData);
            console.log('New earthquake data has been saved in Firebase Realtime Database!');
          } else {
            console.log('No new earthquake data.');
          }
        });
      } else {
        await refDate.set(latestData);
        console.log('New earthquake data has been saved in Firebase Realtime Database!');
      }
    } else {
      console.log('Failed to load data');
    }
  } catch (e) {
    console.error('Error fetching data:', e);
  }
}

module.exports = async (req, res) => {
  await fetchAndStoreData();
  res.status(200).send('Data fetched and stored');
};
