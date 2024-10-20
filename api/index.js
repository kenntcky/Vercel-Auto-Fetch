const axios = require('axios');
const admin = require('firebase-admin');
const BMKG_API_URL = 'https://data.bmkg.go.id/DataMKG/TEWS/autogempa.json';
const serviceAccount = require("../firebase-adminsdk.json");

console.log("run");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://belajar-firebase-777-default-rtdb.asia-southeast1.firebasedatabase.app"
});

const db = admin.database();
const fcm = admin.messaging();  // Firebase Cloud Messaging instance

async function fetchAndStoreData() {
  try {
    const response = await axios.get(BMKG_API_URL);
    
    if (response.status === 200) {
      const latestData = response.data;
      const gempaInfo = latestData['Infogempa']['gempa'];
      
      const dateTime = gempaInfo['DateTime'];
      const shakemapFile = gempaInfo['Shakemap'];
      const shakemapUrl = `https://data.bmkg.go.id/DataMKG/TEWS/${shakemapFile}`;
      gempaInfo['shakemapUrl'] = shakemapUrl;

      const ref = db.ref();
      const snapshot = await ref.orderByKey().limitToLast(1).once('value');

      if (snapshot.exists()) {
        const data = snapshot.val();
        const latestKey = Object.keys(data)[0];

        if (latestKey !== dateTime) {
          await ref.child(dateTime).set(latestData);
          console.log('New earthquake data has been saved in Firebase Realtime Database!');

          // Call FCM notification function here
          await sendEarthquakeNotification(gempaInfo);  // Send notification
          
          return 'New earthquake data has been saved in Firebase Realtime Database!';
        } else {
          console.log('No new earthquake data.');
          return 'No new earthquake data.';
        }
      } else {
        await ref.child(dateTime).set(latestData);
        console.log('Initial earthquake data has been saved in Firebase Realtime Database!');
        
        // Call FCM notification function here
        await sendEarthquakeNotification(gempaInfo);  // Send notification
        
        return 'Initial earthquake data has been saved in Firebase Realtime Database!';
      }
    } else {
      console.error('Failed to load data from BMKG API.');
      return 'Failed to load data from BMKG API.';
    }
  } catch (error) {
    console.error('Error fetching data:', error);
    return `Error fetching data: ${error.message}`;
  }
}

// Function to send FCM notification
async function sendEarthquakeNotification(gempaInfo) {
  const message = {
    notification: {
      title: `Gempa ber-magnitudo ${gempaInfo['Magnitude']}`,
      body: `${gempaInfo['Wilayah']} Klik untuk melihat lebih detail`
    },
        "android": {
            "notification": {
                "sound": "default"
            }
        },
        "apns": {
            "payload": {
                "aps": {
                    "sound": "default"
                }
            }
        }
    topic: 'earthquake-updates',  // Send to a specific topic or replace with specific tokens if needed
  };

  try {
    const response = await fcm.send(message);
    console.log('FCM Notification sent successfully:', response);
  } catch (error) {
    console.error('Error sending FCM notification:', error);
  }
}

async function main() {
  console.log("Fetching earthquake data...");

  await fetchAndStoreData();

  let fetchCount = 0;
  const fetchInterval = 2500;  // 5 detik interval setiap fetch
  const executionTime = 21300000;  // Total waktu eksekusi 5 jam 55 menit

  const intervalId = setInterval(async () => {
    fetchCount++;
    console.log(`Fetch attempt ${fetchCount}`);

    await fetchAndStoreData();

  }, fetchInterval);

  // Stop interval jika sudah mencapai 20 detik (failsafe jika ada error).
  setTimeout(() => {
    clearInterval(intervalId);
    console.log("20 detik sudah berlalu.");
    process.exit(0);
  }, executionTime);
};

main();
