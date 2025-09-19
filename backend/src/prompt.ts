import { GenerateRequest } from './schemas';

export const SYSTEM_PROMPT = `You are a senior QA engineer with expertise in creating comprehensive test cases from user stories. Your task is to analyze user stories and generate detailed test cases in either Manual or BDD format.

CRITICAL: You must return ONLY valid JSON following these exact schemas based on format:

For Manual Format:
{
  "cases": [
    {
      "id": "TC-001",
      "title": "string",
      "format": "Manual",
      "steps": ["string"],
      "testData": "string (optional)",
      "expectedResult": "string",
      "category": "string"
    }
  ],
  "model": "string (optional)",
  "promptTokens": 0,
  "completionTokens": 0
}

For BDD Format:
{
  "cases": [
    {
      "id": "TC-001",
      "title": "string",
      "format": "BDD",
      "testData": "string (optional)",
      "category": "string",
      "given": ["string"],
      "when": ["string"],
      "then": ["string"]
    }
  ],
  "model": "string (optional)",
  "promptTokens": 0,
  "completionTokens": 0
}

Guidelines:
- Generate test case IDs like TC-001, TC-002, etc.
- For Manual format:
  * Use concise, imperative steps
  * Focus on actions and verifications
  * Example steps: ["Navigate to login page", "Enter valid credentials", "Click login button"]

- For BDD format (Gherkin syntax):
  * given: Preconditions and setup
    - First statement starts with "Given"
    - Additional statements start with "And"
    Example: ["Given the user is on the login page", "And the user has valid credentials"]
  * when: Actions being performed
    - First statement starts with "When"
    - Additional statements start with "And"
    Example: ["When the user enters valid username and password", "And the user clicks the login button"]
  * then: Expected outcomes
    - First statement starts with "Then"
    - Additional statements start with "And"
    Example: ["Then the user should be redirected to dashboard", "And the welcome message should be displayed"]
  * Do not use steps array for BDD format
  * Use proper Gherkin keywords and phrasing
  * Always use "And" for multiple statements in each section

Return ONLY the JSON object, no additional text or formatting.`;

export function buildPrompt(request: GenerateRequest): string {
  const {
    storyTitle,
    acceptanceCriteria,
    description,
    additionalInfo,
    categories,
    format,
  } = request;

  let userPrompt = `Generate comprehensive test cases in ${format} format for the following user story, focusing on these test categories: ${categories.join(
    ', '
  )}.

${
  format === 'BDD'
    ? `Use Gherkin-style Given-When-Then format for all test cases. Follow these strict rules:

1. Each test case MUST have all three arrays:
   - "given" array for preconditions
   - "when" array for actions
   - "then" array for outcomes

2. Statement formatting:
   - Given statements MUST start with "Given" and describe the initial state or preconditions
   - When statements MUST start with "When" and describe the actions taken
   - Then statements MUST start with "Then" and describe verifiable outcomes

3. Content guidelines:
   - Given: Focus on system state, user state, or data setup
   - When: Focus on user interactions or system events
   - Then: Focus on verifiable outcomes or system responses

4. Do NOT use the "steps" array at all for BDD format.

Example structure:
"given": ["Given the user is on the login page", "And the user has valid credentials", "And the user has not exceeded login attempts"]
"when": ["When the user enters their username", "And the user enters their password", "And the user clicks the login button"]
"then": ["Then the user should be redirected to dashboard", "And a welcome message should be displayed", "And the user's last login time should be updated"]`
    : 'Use clear, imperative steps for all test cases.'
}

Story Title: ${storyTitle}

Acceptance Criteria:
${acceptanceCriteria}
`;

  if (description) {
    userPrompt += `\nDescription:
${description}
`;
  }

  if (additionalInfo) {
    userPrompt += `\nAdditional Information:
${additionalInfo}
`;
  }

  const formatReminder =
    format === 'BDD'
      ? `\nCRITICAL BDD Format Reminders:
1. Each test case MUST have all three arrays (given, when, then)
2. Every statement MUST start with its respective keyword (Given/When/Then)
3. NO steps array should be included
4. Given statements should establish preconditions
5. When statements should describe specific actions
6. Then statements should specify verifiable outcomes
7. Use clear, business-focused language
8. Make each statement independently verifiable`
      : `\nRemember to:
- Use clear, imperative steps
- Include all necessary actions and verifications
- Make steps concise and actionable`;

  userPrompt += `\nGenerate test cases covering the specified categories: ${categories.join(
    ', '
  )}. ${formatReminder}\n\nReturn only the JSON response.`;

  return userPrompt;
}
