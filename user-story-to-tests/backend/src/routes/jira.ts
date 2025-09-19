import express from 'express';
import { z } from 'zod';
import { fetchIssue } from '../jira/jiraClient';

export const jiraRouter = express.Router();

const JiraFetchSchema = z.object({ issueId: z.string().min(1) });

jiraRouter.post(
  '/fetch',
  async (req: express.Request, res: express.Response) => {
    try {
      const parse = JiraFetchSchema.safeParse(req.body);
      if (!parse.success) {
        res.status(400).json({ error: 'Invalid request: issueId is required' });
        return;
      }

      const { issueId } = parse.data;
      // Ensure server has Jira configuration before attempting fetch
      const base = process.env.JIRA_BASE_URL;
      const email = process.env.JIRA_EMAIL;
      const token = process.env.JIRA_API_TOKEN;

      if (!base || !email || !token) {
        res.status(500).json({
          error:
            'Jira is not configured on the server. Please set JIRA_BASE_URL, JIRA_EMAIL, and JIRA_API_TOKEN in the server environment.',
        });
        return;
      }

      const issue = await fetchIssue(issueId);
      res.json({ issue });
    } catch (err: any) {
      console.error('Jira fetch error:', err);
      res
        .status(500)
        .json({ error: err.message || 'Failed to fetch Jira issue' });
    }
  }
);
