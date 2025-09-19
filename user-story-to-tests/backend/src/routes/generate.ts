import express from 'express';
import { GroqClient } from '../llm/groqClient';
import {
  GenerateRequestSchema,
  GenerateResponseSchema,
  GenerateResponse,
} from '../schemas';
import { SYSTEM_PROMPT, buildPrompt } from '../prompt';
import { fetchIssue } from '../jira/jiraClient';

export const generateRouter = express.Router();

generateRouter.post(
  '/',
  async (req: express.Request, res: express.Response): Promise<void> => {
    try {
      // Validate request body
      const validationResult = GenerateRequestSchema.safeParse(req.body);

      if (!validationResult.success) {
        res.status(400).json({
          error: `Validation error: ${validationResult.error.message}`,
        });
        return;
      }

      const request = validationResult.data;

      // If jiraId is provided, attempt to fetch and merge fields
      if ((request as any).jiraId) {
        try {
          const issue = await fetchIssue((request as any).jiraId);
          // Merge only if fields are missing on the incoming request
          request.storyTitle =
            request.storyTitle || issue.title || request.storyTitle;
          request.description =
            request.description || issue.description || request.description;
          request.acceptanceCriteria =
            request.acceptanceCriteria ||
            issue.acceptanceCriteria ||
            request.acceptanceCriteria;
        } catch (jiraErr) {
          console.warn('Failed to fetch Jira issue for generation:', jiraErr);
          // continue without failing; client-side Jira fetch is preferred
        }
      }

      // Build prompts
      const userPrompt = buildPrompt(request);

      // Create GroqClient instance here to ensure env vars are loaded
      const groqClient = new GroqClient();

      // Generate tests using Groq
      try {
        const groqResponse = await groqClient.generateTests(
          SYSTEM_PROMPT,
          userPrompt
        );

        // Parse the JSON content
        let parsedResponse: GenerateResponse;
        try {
          parsedResponse = JSON.parse(groqResponse.content);
        } catch (parseError) {
          res.status(502).json({
            error: 'LLM returned invalid JSON format',
          });
          return;
        }

        // Validate the response schema
        const responseValidation =
          GenerateResponseSchema.safeParse(parsedResponse);
        if (!responseValidation.success) {
          console.error(
            'Schema validation error:',
            JSON.stringify(responseValidation.error.errors, null, 2)
          );
          res.status(502).json({
            error: 'LLM response does not match expected schema',
            details: responseValidation.error.errors.map((err) => ({
              path: err.path.join('.'),
              message: err.message,
            })),
          });
          return;
        }

        // Add token usage info if available
        const finalResponse = {
          ...responseValidation.data,
          model: groqResponse.model,
          promptTokens: groqResponse.promptTokens,
          completionTokens: groqResponse.completionTokens,
        };

        res.json(finalResponse);
      } catch (llmError) {
        console.error('LLM error:', llmError);
        res.status(502).json({
          error: 'Failed to generate tests from LLM service',
        });
        return;
      }
    } catch (error) {
      console.error('Error in generate route:', error);
      res.status(500).json({
        error: 'Internal server error',
      });
    }
  }
);
