import { Redis } from '@upstash/redis';

const kv = Redis.fromEnv();

export default async function handler(request, response) {
  const TASKS_KEY = 'pomo_cloud_tasks';
  const COMPLETED_KEY = 'pomo_cloud_completed';
  const BUCKETS_KEY = 'pomo_cloud_buckets'; // New Key

  // 1. Authenticate Passcode
  const userPasscode = request.headers['x-app-passcode'];
  const correctPasscode = process.env.APP_SECRET_PASSCODE;

  if (!userPasscode || userPasscode !== correctPasscode) {
    return response.status(404).json({ error: 'Not Found' });
  }

  // 2. Save Data (POST)
  if (request.method === 'POST') {
    const { tasks, completedTasks, buckets } = request.body;
    
    if (tasks) await kv.set(TASKS_KEY, JSON.stringify(tasks));
    if (completedTasks) await kv.set(COMPLETED_KEY, JSON.stringify(completedTasks));
    if (buckets) await kv.set(BUCKETS_KEY, JSON.stringify(buckets)); // Save custom buckets
    
    return response.status(200).json({ success: true, message: 'Cloud sync successful' });
  }

  // 3. Load Data (GET)
  if (request.method === 'GET') {
    const rawTasks = await kv.get(TASKS_KEY);
    const rawCompleted = await kv.get(COMPLETED_KEY);
    const rawBuckets = await kv.get(BUCKETS_KEY); // Fetch custom buckets
    
    const parseData = (raw) => {
      if (!raw) return null;
      return typeof raw === 'string' ? JSON.parse(raw) : raw;
    };

    return response.status(200).json({
      tasks: parseData(rawTasks) || [],
      completedTasks: parseData(rawCompleted) || [],
      // Default buckets if none exist in cloud yet
      buckets: parseData(rawBuckets) || ['Project', 'Firm Initiative', 'Personal'] 
    });
  }

  return response.status(405).json({ error: 'Method not allowed' });
}