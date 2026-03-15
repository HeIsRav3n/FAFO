import { Queue, Worker, Job } from 'bullmq';
import { Redis } from 'ioredis';
import { prisma } from '@vibe/database';
import { fetchTwitterUser } from '@vibe/core';
import * as dotenv from 'dotenv';

dotenv.config();

const connection = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
});

export const metricsQueue = new Queue('metrics-tracker', { connection });

export async function addProjectToTracker(projectId: string) {
  await metricsQueue.add('update-project', { projectId }, {
    repeat: { every: 1000 * 60 * 60 * 24 } // Every 24 hours
  });
}

const worker = new Worker('metrics-tracker', async (job: Job) => {
  if (job.name === 'update-project') {
    const { projectId } = job.data;
    const project = await prisma.project.findUnique({ where: { id: projectId } });
    
    if (!project) return;

    const twitterUser = await fetchTwitterUser(project.handle);
    if (!twitterUser) return;

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
      
      // Basic ROI tracking (simplified for demo)
      await prisma.call.update({
        where: { id: call.id },
        data: {
          roi24h: growth, // In a real app, we'd check if 24h has passed
        }
      });
    }
  }
}, { connection });

worker.on('completed', job => {
  console.log(`Job ${job.id} completed!`);
});

worker.on('failed', (job, err) => {
  console.error(`Job ${job?.id} failed with error: ${err.message}`);
});
