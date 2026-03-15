import { Queue, Worker, Job } from 'bullmq';
import { Redis } from 'ioredis';
import { prisma } from '@vibe/database';
import { fetchTwitterUser } from '@vibe/core';
import * as dotenv from 'dotenv';

dotenv.config();

const connection = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
});

export const metricsQueue = new Queue('metrics-tracker', { connection: connection as any });

export async function addProjectToTracker(projectId: string): Promise<void> {
  try {
    await metricsQueue.add('update-project', { projectId }, {
      repeat: {
        every: 1000 * 60 * 60 * 24 // Every 24 hours
      },
      removeOnComplete: true,
      removeOnFail: false,
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000
      }
    });
  } catch (error) {
    console.error(`Failed to add project ${projectId} to tracker:`, error);
    throw error;
  }
}

const worker = new Worker(
  'metrics-tracker',
  async (job: Job) => {
    if (job.name === 'update-project') {
      const { projectId } = job.data as { projectId: string };
      
      const project = await prisma.project.findUnique({ where: { id: projectId } });

      if (!project) {
        console.warn(`Project ${projectId} not found`);
        return;
      }

      const twitterUser = await fetchTwitterUser(project.handle);
      if (!twitterUser) {
        console.warn(`Could not fetch Twitter data for project @${project.handle}`);
        return;
      }

      // 1. Update Project Stats
      await prisma.project.update({
        where: { id: projectId },
        data: {
          followersCount: twitterUser.followers,
          followingCount: twitterUser.following,
          lastUpdated: new Date(),
        }
      });

      // 2. Create Metric Snapshot
      await prisma.metricSnapshot.create({
        data: {
          projectId,
          followers: twitterUser.followers,
        }
      });

      // 3. Update Call ROI for all active calls for this project
      const calls = await prisma.call.findMany({
        where: { projectId, status: 'ACTIVE' }
      });

      for (const call of calls) {
        const growth = ((twitterUser.followers - call.followersAtCall) / call.followersAtCall) * 100;

        // Update ROI metrics
        const hoursElapsed = (Date.now() - call.createdAt.getTime()) / (1000 * 60 * 60);

        if (hoursElapsed >= 24) {
          await prisma.call.update({
            where: { id: call.id },
            data: { roi24h: growth }
          });
        }
        if (hoursElapsed >= 168) {
          await prisma.call.update({
            where: { id: call.id },
            data: { roi7d: growth }
          });
        }
        if (hoursElapsed >= 720) {
          await prisma.call.update({
            where: { id: call.id },
            data: { roi30d: growth }
          });
        }
      }

      console.log(`✅ Updated metrics for project @${project.handle}`);
    }
  },
  { connection: connection as any }
);

worker.on('completed', (job) => {
  console.log(`✅ Job ${job?.id} completed!`);
});

worker.on('failed', (job, err) => {
  console.error(`❌ Job ${job?.id} failed with error: ${err.message}`);
});

worker.on('error', (err) => {
  console.error(`Worker error: ${err.message}`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully...');
  await worker.close();
  await metricsQueue.close();
  process.exit(0);
});

export default worker;
