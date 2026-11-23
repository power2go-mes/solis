const webpush = require('web-push');
const { Pool } = require('pg');

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "BDr870e2VZY_CI2KphF_dUqqkMKCUan-BsUrHBV0AFdHdeMwp85oqna2Y5mnE6A_f7d1afO4sQPsrJjARKDnPFA";
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || "qKI7NDePKdnxaoHZ4_6npCe3QysBuyK1PbRzzpymehQ";

webpush.setVapidDetails(
  'mailto:mes@power2go.energy',
  VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY
);

const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL ||
    process.env.SUPABASE_DB_URL ||
    "postgresql://postgres.jimlvgbbgomrhaqrzllx:Abdul1367453390@aws-1-ap-south-1.pooler.supabase.com:6543/postgres",
  ssl: { rejectUnauthorized: false }
});

/**
 * Send Web Push Notification to all subscribed devices (Mobile PWA & Laptop browsers)
 */
async function sendWebPushNotification({ title, body, url = '/', tag = 'p2g-alarm' }) {
  try {
    const res = await pool.query('SELECT endpoint, p256dh, auth FROM web_push_subscriptions');
    const subscriptions = res.rows;

    if (!subscriptions || subscriptions.length === 0) {
      console.log('ℹ️ No active web push subscriptions found.');
      return { sent: 0, failed: 0 };
    }

    const payload = JSON.stringify({
      title,
      body,
      url,
      tag,
      timestamp: Date.now()
    });

    let sent = 0;
    let failed = 0;

    await Promise.allSettled(
      subscriptions.map(async (sub) => {
        const pushSubscription = {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth
          }
        };

        try {
          await webpush.sendNotification(pushSubscription, payload);
          sent++;
        } catch (err) {
          failed++;
          // If expired (410 or 404), clean up
          if (err.statusCode === 410 || err.statusCode === 404) {
            await pool.query('DELETE FROM web_push_subscriptions WHERE endpoint = $1', [sub.endpoint]).catch(() => {});
          }
        }
      })
    );

    console.log(`🔔 Web Push dispatch completed: ${sent} delivered, ${failed} failed.`);
    return { sent, failed };
  } catch (error) {
    console.error('❌ Error sending web push notification:', error);
    return { sent: 0, failed: 0, error: error.message };
  }
}

module.exports = {
  sendWebPushNotification,
  VAPID_PUBLIC_KEY
};
