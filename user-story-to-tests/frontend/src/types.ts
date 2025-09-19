export type TestCategory =
  | 'Positive'
  | 'Negative'
  | 'E2E'
  | 'Edge Case'
  | 'Performance';

export type TestFormat = 'Manual' | 'BDD';

export interface GenerateRequest {
  storyTitle: string;
  acceptanceCriteria: string;
  description?: string;
  additionalInfo?: string;
  categories: TestCategory[];
  format: TestFormat;
  jiraId?: string;
}

export interface TestCase {
  id: string;
  title: string;
  steps: string[];
  testData?: string;
  expectedResult: string;
  category: string;
  format: TestFormat;
  given?: string[];
  when?: string[];
  then?: string[];
}

export interface GenerateResponse {
  cases: TestCase[];
  model?: string;
  promptTokens: number;
  completionTokens: number;
}

export interface JiraFetchRequest {
  issueId: string;
}

export interface JiraFetchResponse {
  title: string;
  description?: string;
  acceptanceCriteria?: string;
  raw?: any;
}
