import { Redis } from '@upstash/redis';
import crypto from 'crypto';

const kv = Redis.fromEnv();

// Helper: Securely hash a password using native PBKDF2
function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return { salt, hash };
}

export default async function handler(request, response) {
  const method = request.method;

  // --------------------------------------------------------
  // ACTION 1: SIGN UP & ACCOUNT INITIALIZATION
  // --------------------------------------------------------
  if (method === 'POST' && request.headers['x-action'] === 'signup') {
    const { username, password } = request.body;
    if (!username || !password) return response.status(400).json({ error: 'Missing inputs' });

    const cleanUser = username.trim().toLowerCase();
    const userKey = `pomo_user:${cleanUser}`;

    const existingUser = await kv.get(userKey);
    if (existingUser) return response.status(409).json({ error: 'Username already taken' });

    // Hash the password cleanly using native crypto node logic
    const { salt, hash } = hashPassword(password.trim());
    await kv.set(userKey, JSON.stringify({ salt, hash }));

    // Provision default bucket metadata categories for their profile
    const defaultBuckets = ['Project', 'Firm Initiative', 'Personal'];
    await kv.set(`pomo_buckets:${cleanUser}`, JSON.stringify(defaultBuckets));

    return response.status(200).json({ success: true, message: 'Account deployed!' });
  }

  // --------------------------------------------------------
  // ACTION 2: SIGN IN / HANDSHAKE AUTHENTICATION
  // --------------------------------------------------------
  if (method === 'POST' && request.headers['x-action'] === 'login') {
    const { username, password } = request.body;
    if (!username || !password) return response.status(400).json({ error: 'Missing inputs' });

    const cleanUser = username.trim().toLowerCase();
    const userDbRecord = await kv.get(`pomo_user:${cleanUser}`);
    if (!userDbRecord) return response.status(401).json({ error: 'Invalid credentials' });

    const { salt, hash } = typeof userDbRecord === 'string' ? JSON.parse(userDbRecord) : userDbRecord;
    const verify = hashPassword(password.trim(), salt);

    if (verify.hash !== hash) return response.status(401).json({ error: 'Invalid credentials' });
    return response.status(200).json({ success: true, message: 'Authenticated' });
  }

  // --------------------------------------------------------
  // IDENTITY BOUNDARY GATEWAY
  // --------------------------------------------------------
  const activeUser = request.headers['x-app-user']?.trim().toLowerCase();
  const rawPassToken = request.headers['x-app-passcode'];

  if (!activeUser || !rawPassToken) {
    return response.status(401).json({ error: 'Authorization header keys missing' });
  }

  // Verify credentials on every transactional call to ensure data boundary isolation
  const userRecord = await kv.get(`pomo_user:${activeUser}`);
  if (!userRecord) return response.status(401).json({ error: 'Identity mismatch' });
  const credentials = typeof userRecord === 'string' ? JSON.parse(userRecord) : userRecord;
  if (hashPassword(rawPassToken, credentials.salt).hash !== credentials.hash) {
    return response.status(401).json({ error: 'Tamper warning: Auth mismatch' });
  }

  const TASKS_KEY = `pomo_tasks:${activeUser}`;
  const COMPLETED_KEY = `pomo_completed:${activeUser}`;
  const BUCKETS_KEY = `pomo_buckets:${activeUser}`;

  // --------------------------------------------------------
  // ACTION 3: PROFILE CLOUD SAVE DATA (POST)
  // --------------------------------------------------------
  if (method === 'POST') {
    const { tasks, completedTasks, buckets } = request.body;
    if (tasks) await kv.set(TASKS_KEY, JSON.stringify(tasks));
    if (completedTasks) await kv.set(COMPLETED_KEY, JSON.stringify(completedTasks));
    if (buckets) await kv.set(BUCKETS_KEY, JSON.stringify(buckets));
    return response.status(200).json({ success: true });
  }

  // --------------------------------------------------------
  // ACTION 4: PROFILE HYDRATION LOAD DATA (GET)
  // --------------------------------------------------------
  if (method === 'GET') {
    const rawTasks = await kv.get(TASKS_KEY);
    const rawCompleted = await kv.get(COMPLETED_KEY);
    const rawBuckets = await kv.get(BUCKETS_KEY);

    const parseData = (raw) => {
      if (!raw) return null;
      return typeof raw === 'string' ? JSON.parse(raw) : raw;
    };

    return response.status(200).json({
      tasks: parseData(rawTasks) || [],
      completedTasks: parseData(rawCompleted) || [],
      buckets: parseData(rawBuckets) || ['Project', 'Firm Initiative', 'Personal']
    });
  }

  return response.status(405).json({ error: 'Method signature rejected' });
}