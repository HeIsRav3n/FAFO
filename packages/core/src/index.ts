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
    if (!handle || handle.trim().length === 0) {
      console.error('Invalid Twitter handle provided');
      return null;
    }

    const cleanHandle = handle.replace(/^@/, '').trim();
    const user = await twitterClient.v2.userByUsername(cleanHandle, {
      "user.fields": ["public_metrics", "profile_image_url", "created_at", "verified"]
    });

    if (!user.data) {
      console.warn(`No data found for Twitter user: @${cleanHandle}`);
      return null;
    }

    const { id, name, profile_image_url, public_metrics, created_at, verified } = user.data;

    return {
      id,
      handle: cleanHandle,
      name: name || cleanHandle,
      followers: public_metrics?.followers_count || 0,
      following: public_metrics?.following_count || 0,
      profileImageUrl: profile_image_url,
      verified: !!verified,
      createdAt: created_at ? new Date(created_at) : undefined,
    };
  } catch (error) {
    console.error(`Error fetching Twitter user @${handle}:`, error);
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

export async function analyzeTweet(tweet: string): Promise<AIAnalysis | null> {
  try {
    if (!tweet || tweet.trim().length === 0) {
      console.warn('Empty tweet content provided for analysis');
      return null;
    }

    const response: any = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: [
        {
          role: "system",
          content: "You are an expert crypto analyst. Analyze the following tweet content and return a JSON object with: narrative, projectType, sentiment (positive/neutral/negative), riskScore (0-100), and a brief summary."
        },
        {
          role: "user",
          content: tweet.slice(0, 2000) // Limit to 2000 chars to prevent token overflow
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
      max_tokens: 1024
    });

    const responseContent = response.choices?.[0]?.message?.content;
    if (!responseContent) {
      console.warn('No response content from OpenAI');
      return null;
    }

    const result = JSON.parse(responseContent);
    const validated = AIAnalysisSchema.parse(result);
    return validated;
  } catch (error) {
    console.error('Error analyzing tweet:', error);
    return null;
  }
}
