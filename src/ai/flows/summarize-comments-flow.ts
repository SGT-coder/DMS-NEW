'use server';
/**
 * @fileOverview An AI flow to summarize comment threads on a document.
 *
 * - summarizeComments - A function that handles the comment summarization process.
 * - SummarizeCommentsInput - The input type for the summarizeComments function.
 * - SummarizeCommentsOutput - The return type for the summarizeComments function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const CommentDataSchema = z.object({
  userName: z.string().describe('The name of the user who made the comment.'),
  text: z.string().describe('The text of the comment.'),
});

const SummarizeCommentsInputSchema = z.object({
  comments: z.array(CommentDataSchema).describe('An array of comments to be summarized.'),
});
export type SummarizeCommentsInput = z.infer<typeof SummarizeCommentsInputSchema>;

const SummarizeCommentsOutputSchema = z.object({
  summary: z.string().describe('A concise summary of the key points, action items, and overall sentiment of the comments.'),
});
export type SummarizeCommentsOutput = z.infer<typeof SummarizeCommentsOutputSchema>;

export async function summarizeComments(input: SummarizeCommentsInput): Promise<SummarizeCommentsOutput> {
  return summarizeCommentsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'summarizeCommentsPrompt',
  input: {schema: SummarizeCommentsInputSchema},
  output: {schema: SummarizeCommentsOutputSchema},
  prompt: `You are an expert at summarizing discussions. Analyze the following list of comments from a document review and provide a concise summary. 
The summary should include the main points of discussion, any action items identified, and the general sentiment of the feedback.

Here are the comments:
{{#each comments}}
- {{userName}}: "{{text}}"
{{/each}}
`,
});

const summarizeCommentsFlow = ai.defineFlow(
  {
    name: 'summarizeCommentsFlow',
    inputSchema: SummarizeCommentsInputSchema,
    outputSchema: SummarizeCommentsOutputSchema,
  },
  async (input) => {
    if (input.comments.length === 0) {
        return { summary: "There are no comments to summarize." };
    }
    const {output} = await prompt(input);
    return output!;
  }
);
