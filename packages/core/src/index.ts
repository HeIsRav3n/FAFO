import { TwitterApi } from 'twitter-api-v2';
import OpenAI from 'openai';
import * as dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const twitterClient = new TwitterApi(process.env.TWITTER_BEARER_TOKEN || '');
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export const TwitterInfoSchema = z.object({
  id: z.string(),
  handle: z.string(),
  name: z.string(),
  followers: z.number(),
  following: z.number(),
  profileImageUrl: z.string().optional(),
  verified: z.boolean(),
  createdAt: z.date().optional(),
});

export type TwitterInfo = z.infer<typeof TwitterInfoSchema>;

export async function fetchTwitterUser(handle: string): Promise<TwitterInfo | null> {
  try {
    const user = await twitterClient.v2.userByUsername(handle, {
      "user.fields": ["public_metrics", "profile_image_url", "created_at", "verified"]
    });

    if (!user.data) return null;

    const { id, name, profile_image_url, public_metrics, created_at, verified } = user.data;

    return {
      id,
      handle,
      name,
      followers: public_metrics?.followers_count || 0,
      following: public_metrics?.following_count || 0,
      profileImageUrl: profile_image_url,
      verified: !!verified,
      createdAt: created_at ? new Date(created_at) : undefined,
    };
  } catch (error) {
    console.error('Error fetching Twitter user:', error);
    return null;
  }
}

export const AIAnalysisSchema = z.object({
  narrative: z.string(),
  projectType: z.string(),
  sentiment: z.enum(['positive', 'neutral', 'negative']),
  riskScore: z.number().min(0).max(100),
  summary: z.string(),
});

export type AIAnalysis = z.infer<typeof AIAnalysisSchema>;

export async function analyzeTweet(content: string): Promise<AIAnalysis | null> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: [
        {
          role: "system",
          content: "You are an expert crypto analyst. Analyze the following tweet content and return a JSON object with: narrative, projectType, sentiment (positive/neutral/negative), riskScore (0-100), and a brief summary."
        },
        {
          role: "user",
          content
        }
      ],
      response_format: { type: "json_object" }
    });

    const result = JSON.parse(response.choices[0].message.content || '{}');
    return AIAnalysisSchema.parse(result);
  } catch (error) {
    console.error('Error analyzing tweet:', error);
    return null;
  }
}
