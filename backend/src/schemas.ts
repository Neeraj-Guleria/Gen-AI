import { z } from 'zod';

export const TestCategorySchema = z.enum([
  'Positive',
  'Negative',
  'E2E',
  'Edge Case',
  'Performance',
]);

export const TestFormatSchema = z.enum(['Manual', 'BDD']);

export const GenerateRequestSchema = z.object({
  storyTitle: z.string().min(1, 'Story title is required'),
  acceptanceCriteria: z.string().min(1, 'Acceptance criteria is required'),
  description: z.string().optional(),
  additionalInfo: z.string().optional(),
  jiraId: z.string().optional(),
  categories: z
    .array(TestCategorySchema)
    .min(1, 'At least one test category is required'),
  format: TestFormatSchema,
});

const ManualTestCaseSchema = z.object({
  id: z.string(),
  title: z.string(),
  format: z.literal('Manual'),
  steps: z.array(z.string()),
  testData: z.string().optional(),
  expectedResult: z.string(),
  category: z.string(),
});

const BDDTestCaseSchema = z.object({
  id: z.string(),
  title: z.string(),
  format: z.literal('BDD'),
  testData: z.string().optional(),
  category: z.string(),
  given: z.array(z.string()),
  when: z.array(z.string()),
  then: z.array(z.string()),
  steps: z.array(z.string()).optional(),
  expectedResult: z.string().optional(),
});

export const TestCaseSchema = z.discriminatedUnion('format', [
  ManualTestCaseSchema,
  BDDTestCaseSchema,
]);

export const GenerateResponseSchema = z.object({
  cases: z.array(TestCaseSchema),
  model: z.string().optional(),
  promptTokens: z.number(),
  completionTokens: z.number(),
});

// Type exports
export type GenerateRequest = z.infer<typeof GenerateRequestSchema>;
export type TestCase = z.infer<typeof TestCaseSchema>;
export type GenerateResponse = z.infer<typeof GenerateResponseSchema>;
