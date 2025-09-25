import { getStore } from '@netlify/blobs';

export default async event => {
  try {
    const b = JSON.parse(event.body || '{}');

    // Validate required fields
    if (!b.response_id || !b.coaching_cue) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'missing_required_fields' }),
      };
    }

    // Create recruiter task
    const task = {
      id: `task_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      response_id: b.response_id,
      candidate_token_hash: b.candidate_token_hash || 'unknown',
      stage: b.stage || 'unknown',
      role_family: b.role_family || 'unknown',
      aspects: b.aspects || [],
      nss: b.nss || 0,
      index: b.index || 0,
      coaching_cue: b.coaching_cue,
      priority: calculatePriority(b.nss, b.index, b.aspects),
      status: 'pending',
      created_at: new Date().toISOString(),
      assigned_to: null,
      due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
    };

    // Store task data
    try {
      const tasksStore = getStore({ name: 'tasks' });
      const key = `${new Date().toISOString().slice(0, 10)}.ndjson`;
      await tasksStore.append(key, JSON.stringify(task) + '\n');
      // Also append to main task queue
      await tasksStore.append('queue.ndjson', JSON.stringify(task) + '\n');
    } catch (storageErr) {
      console.error('Tasks storage error:', storageErr);
      // continue
    }

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        ok: true,
        task_id: task.id,
        priority: task.priority,
        due_date: task.due_date,
      }),
    };
  } catch (error) {
    console.error('PushTask function error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'server_error', message: error.message }),
    };
  }
};

// Helper function to calculate task priority
function calculatePriority(nss, index, aspects) {
  // High priority: negative experience with critical aspects
  const criticalAspects = ['respect', 'conduct', 'dei'];
  const hasCriticalIssues = aspects.some(aspect => criticalAspects.includes(aspect));

  if (nss < -0.3 || index < 0.4 || hasCriticalIssues) {
    return 'high';
  }

  if (nss < 0 || index < 0.6) {
    return 'medium';
  }

  return 'low';
}
