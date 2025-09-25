import { getStore } from '@netlify/blobs';

export default async (event, _context) => {
  try {
    const { email, token } = JSON.parse(event.body || '{}');

    if (!email || !token) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Email and token are required' }),
      };
    }

    const jobs = getStore('cxi-nudges');
    const now = Date.now();

    // Schedule 4-hour nudge
    const fourHourJob = {
      email,
      token,
      dueAt: now + 4 * 60 * 60 * 1000, // 4 hours from now
      createdAt: now,
      tries: 0,
    };

    // Schedule 24-hour nudge
    const twentyFourHourJob = {
      email,
      token,
      dueAt: now + 24 * 60 * 60 * 1000, // 24 hours from now
      createdAt: now,
      tries: 0,
    };

    // Store jobs with unique keys
    const fourHourKey = `job:${token}-4h-${now}`;
    const twentyFourHourKey = `job:${token}-24h-${now}`;

    await Promise.all([
      jobs.set(fourHourKey, JSON.stringify(fourHourJob)),
      jobs.set(twentyFourHourKey, JSON.stringify(twentyFourHourJob)),
    ]);

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Nudges scheduled successfully',
        jobs: [
          { key: fourHourKey, dueAt: fourHourJob.dueAt },
          { key: twentyFourHourKey, dueAt: twentyFourHourJob.dueAt },
        ],
      }),
    };
  } catch (error) {
    console.error('Error scheduling nudges:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to schedule nudges' }),
    };
  }
};
