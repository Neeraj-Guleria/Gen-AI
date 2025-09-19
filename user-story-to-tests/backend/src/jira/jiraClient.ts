import fetch from 'node-fetch';

type JiraIssue = {
  key: string;
  fields: any;
};

export async function fetchIssue(issueId: string) {
  const base = process.env.JIRA_BASE_URL;
  const email = process.env.JIRA_EMAIL;
  const token = process.env.JIRA_API_TOKEN;

  if (!base || !email || !token) {
    throw new Error(
      'Jira configuration missing on server (JIRA_BASE_URL/JIRA_EMAIL/JIRA_API_TOKEN)'
    );
  }

  const url = `${base.replace(/\/$/, '')}/rest/api/3/issue/${issueId}`;

  const auth = Buffer.from(`${email}:${token}`).toString('base64');

  try {
    const resp = await fetch(url, {
      headers: {
        Authorization: `Basic ${auth}`,
        Accept: 'application/json',
      },
    });

    if (resp.status === 404) {
      throw new Error('Issue not found');
    }
    if (resp.status === 401) {
      throw new Error('Unauthorized when contacting Jira. Check credentials');
    }
    if (!resp.ok) {
      const text = await resp.text().catch(() => '');
      throw new Error(`Failed to fetch Jira issue: ${resp.status} ${text}`);
    }

    const issue = (await resp.json()) as JiraIssue;

    // Try to extract summary, description, and acceptance criteria if present
    const title = issue.fields?.summary || '';
    let description = '';
    let acceptanceCriteria: string | undefined = undefined;

    if (issue.fields?.description) {
      // Jira description can be in Atlassian Document Format (ADF) or plain text
      if (typeof issue.fields.description === 'string') {
        description = issue.fields.description;
      } else if (issue.fields.description.content) {
        // naive ADF -> text extraction
        const walk = (node: any): string => {
          if (!node) return '';
          if (node.type === 'text') return node.text || '';
          if (Array.isArray(node.content))
            return node.content.map(walk).join('');
          return '';
        };
        description = issue.fields.description.content.map(walk).join('\n');
      }

      // Attempt to find an 'Acceptance Criteria' section in description
      const acMatch = description.match(
        /Acceptance Criteria[:\-\s]*([\s\S]+)/i
      );
      if (acMatch) {
        acceptanceCriteria = acMatch[1].trim();
      }
    }

    return {
      title,
      description,
      acceptanceCriteria,
      raw: issue,
    };
  } catch (err: any) {
    throw new Error(err.message || 'Failed to fetch Jira issue');
  }
}
