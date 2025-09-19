import express from 'express';
import { z } from 'zod';
import {
  GenerateRequestSchema,
  GenerateResponseSchema,
  GenerateRequest,
} from '../schemas';

export const testDataRouter = express.Router();

const TestDataGenerateSchema = GenerateRequestSchema;

// Simple generator that returns the same shape as generate route but with dummy content
testDataRouter.post(
  '/generate',
  async (req: express.Request, res: express.Response) => {
    try {
      const parsed = TestDataGenerateSchema.safeParse(req.body);
      if (!parsed.success) {
        res
          .status(400)
          .json({ error: 'Invalid request for test data generation' });
        return;
      }

      const request = parsed.data as GenerateRequest;

      // Create a few synthetic test cases based on categories
      const cases = request.categories.flatMap((cat, catIndex) => {
        return [1, 2].map((n) => {
          const id = `${cat.replace(/\s+/g, '').toUpperCase()}-${
            catIndex + 1
          }-${n}`;
          if (request.format === 'BDD') {
            return {
              id,
              title: `${request.storyTitle} - ${cat} BDD ${n}`,
              format: 'BDD',
              category: cat,
              testData: `sample data ${n}`,
              given: [`Given precondition ${n}`],
              when: [`When action ${n}`],
              then: [`Then expected ${n}`],
              steps: [`BDD step ${n}`],
              expectedResult: `Expected result ${n}`,
            };
          }

          return {
            id,
            title: `${request.storyTitle} - ${cat} Manual ${n}`,
            format: 'Manual',
            steps: [`Step 1 for ${n}`, `Step 2 for ${n}`],
            testData: `field1=value${n};field2=value${n * 2}`,
            expectedResult: `Expected result ${n}`,
            category: cat,
          };
        });
      });

      const response = {
        cases,
        model: 'test-data-generator',
        promptTokens: 0,
        completionTokens: 0,
      };

      res.json(response);
    } catch (err: any) {
      console.error('Test data generation error:', err);
      res
        .status(500)
        .json({ error: err.message || 'Failed to generate test data' });
    }
  }
);

// Endpoint to return CSV for provided generated cases
testDataRouter.post(
  '/csv',
  async (req: express.Request, res: express.Response) => {
    try {
      const body = req.body;
      if (!body || !Array.isArray(body.cases)) {
        res.status(400).json({ error: 'Request must include cases array' });
        return;
      }

      const cases = body.cases;

      // Build CSV header and rows
      const headers = [
        'id',
        'title',
        'category',
        'format',
        'testData',
        'expectedResult',
        'steps',
        'given',
        'when',
        'then',
      ];
      const escape = (v: any) => {
        if (v === undefined || v === null) return '';
        const s = Array.isArray(v) ? v.join(' | ') : String(v);
        if (s.includes(',') || s.includes('\n') || s.includes('"')) {
          return '"' + s.replace(/"/g, '""') + '"';
        }
        return s;
      };

      const rows = cases.map((c: any) => {
        return headers
          .map((h) => {
            if (h === 'steps') return escape(c.steps);
            if (h === 'given') return escape(c.given);
            if (h === 'when') return escape(c.when);
            if (h === 'then') return escape(c.then);
            return escape(c[h]);
          })
          .join(',');
      });

      const csv = [headers.join(','), ...rows].join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader(
        'Content-Disposition',
        'attachment; filename="test-cases.csv"'
      );
      res.send(csv);
    } catch (err: any) {
      console.error('CSV generation error:', err);
      res.status(500).json({ error: err.message || 'Failed to create CSV' });
    }
  }
);
