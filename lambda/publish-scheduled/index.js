/**
 * AWS Lambda function to trigger scheduled post publishing
 *
 * This function is invoked by EventBridge every minute.
 * It calls the Next.js API endpoint to publish any due scheduled posts.
 */

const https = require('https');

exports.handler = async (event) => {
  console.log('Publish scheduled posts lambda triggered');

  const appUrl = process.env.APP_URL;
  const cronSecret = process.env.CRON_SECRET;

  if (!appUrl || !cronSecret) {
    console.error('Missing required environment variables: APP_URL or CRON_SECRET');
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Lambda misconfigured' }),
    };
  }

  try {
    const result = await callPublishEndpoint(appUrl, cronSecret);
    console.log('Publish result:', JSON.stringify(result));

    return {
      statusCode: 200,
      body: JSON.stringify(result),
    };
  } catch (error) {
    console.error('Error calling publish endpoint:', error);

    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};

function callPublishEndpoint(appUrl, cronSecret) {
  return new Promise((resolve, reject) => {
    const url = new URL('/api/cron/publish-scheduled', appUrl);

    const options = {
      hostname: url.hostname,
      port: 443,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${cronSecret}`,
        'Content-Type': 'application/json',
      },
    };

    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);

          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(parsed);
          } else {
            reject(new Error(`API returned ${res.statusCode}: ${JSON.stringify(parsed)}`));
          }
        } catch (e) {
          reject(new Error(`Failed to parse response: ${data}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.setTimeout(30000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    req.end();
  });
}
