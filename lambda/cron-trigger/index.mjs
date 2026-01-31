// Cron Trigger Lambda
// Calls the Vercel endpoint to generate random posts

const VERCEL_URL = 'https://meroka-marketing-hub.vercel.app/api/cron/generate-random';
const CRON_SECRET = process.env.CRON_SECRET;

export const handler = async (event) => {
  console.log('Triggering random post generation...');

  try {
    const response = await fetch(VERCEL_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${CRON_SECRET}`,
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();

    console.log('Response:', JSON.stringify(data, null, 2));

    return {
      statusCode: response.status,
      body: JSON.stringify(data),
    };
  } catch (error) {
    console.error('Error calling Vercel:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
