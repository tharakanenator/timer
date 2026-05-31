import { Redis } from '@upstash/redis';

// Connects instantly using the environment variables automatically provided by the Upstash integration
const kv = Redis.fromEnv();

export default async function handler(request, response) {
  const TASKS_KEY = 'pomo_cloud_tasks';
  const COMPLETED_KEY = 'pomo_cloud_completed';

  // 1. Authenticate against your Vercel Environment Variable
  const userPasscode = request.headers['x-app-passcode'];
  const correctPasscode = process.env.APP_SECRET_PASSCODE;

  if (!userPasscode || userPasscode !== correctPasscode) {
    return response.status(401).json({ error: 'Unauthorized: Invalid or missing passcode' });
  }

  // 2. Handle Data Posting (Saving)
  if (request.method === 'POST') {
    const { tasks, completedTasks } = request.body;
    
    if (tasks) await kv.set(TASKS_KEY, JSON.stringify(tasks));
    if (completedTasks) await kv.set(COMPLETED_KEY, JSON.stringify(completedTasks));
    
    return response.status(200).json({ success: true, message: 'Cloud sync successful' });
  }

  // 3. Handle Data Fetching (Loading)
  if (request.method === 'GET') {
    const rawTasks = await kv.get(TASKS_KEY);
    const rawCompleted = await kv.get(COMPLETED_KEY);
    
    const parseData = (raw) => {
      if (!raw) return [];
      return typeof raw === 'string' ? JSON.parse(raw) : raw;
    };

    return response.status(200).json({
      tasks: parseData(rawTasks),
      completedTasks: parseData(rawCompleted)
    });
  }

  return response.status(405).json({ error: 'Method not allowed' });
}