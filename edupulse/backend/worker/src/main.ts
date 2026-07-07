import { Worker } from 'bullmq';

const redisUrl = process.env.REDIS_URL ?? 'redis://localhost:6379';
const parsed = new URL(redisUrl);

async function main() {
  const worker = new Worker(
    'edupulse-jobs',
    async (job) => {
      console.log(
        JSON.stringify({
          correlationId: job.id,
          action: 'job_received',
          name: job.name,
          durationMs: 0,
        }),
      );
      return { ok: true };
    },
    {
      connection: {
        host: parsed.hostname,
        port: Number(parsed.port || 6379),
        maxRetriesPerRequest: null,
      },
    },
  );

  worker.on('ready', () => {
    console.log('EduPulse AI worker ready (queue: edupulse-jobs)');
  });

  worker.on('failed', (job, err) => {
    console.error(
      JSON.stringify({
        action: 'job_failed',
        jobId: job?.id,
        error: err.message,
      }),
    );
  });

  const shutdown = async () => {
    await worker.close();
    process.exit(0);
  };

  process.on('SIGINT', () => void shutdown());
  process.on('SIGTERM', () => void shutdown());
}

void main();
