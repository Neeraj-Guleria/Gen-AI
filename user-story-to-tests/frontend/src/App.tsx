import React, { useState } from 'react'
import { generateTests, fetchJira, generateTestData, fetchCsvForCases } from './api'
import { GenerateRequest, GenerateResponse, TestCase, TestCategory, TestFormat, JiraFetchResponse } from './types'

const TEST_CATEGORIES: TestCategory[] = ['Positive', 'Negative', 'E2E', 'Edge Case', 'Performance']
const TEST_FORMATS: TestFormat[] = ['Manual', 'BDD']

function App() {
  const [formData, setFormData] = useState<GenerateRequest>({
    storyTitle: '',
    acceptanceCriteria: '',
    description: '',
    additionalInfo: '',
    categories: [],
    format: 'Manual'
    , jiraId: ''
  })
  const [jiraInput, setJiraInput] = useState<string>('')
  const [jiraLoading, setJiraLoading] = useState<boolean>(false)
  const [jiraError, setJiraError] = useState<string | null>(null)
  const [results, setResults] = useState<GenerateResponse | null>(null)
  const [testDataResults, setTestDataResults] = useState<GenerateResponse | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [expandedTestCases, setExpandedTestCases] = useState<Set<string>>(new Set())

  const toggleTestCaseExpansion = (testCaseId: string) => {
    const newExpanded = new Set(expandedTestCases)
    if (newExpanded.has(testCaseId)) {
      newExpanded.delete(testCaseId)
    } else {
      newExpanded.add(testCaseId)
    }
    setExpandedTestCases(newExpanded)
  }

  const handleInputChange = (field: keyof GenerateRequest, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleCategoryChange = (category: TestCategory) => {
    setFormData(prev => {
      const newCategories = prev.categories.includes(category)
        ? prev.categories.filter(c => c !== category)
        : [...prev.categories, category]
      return { ...prev, categories: newCategories }
    })
  }

  const handleFormatChange = (format: TestFormat) => {
    setFormData(prev => ({ ...prev, format }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.storyTitle.trim() || !formData.acceptanceCriteria.trim()) {
      setError('Story Title and Acceptance Criteria are required')
      return
    }

    if (formData.categories.length === 0) {
      setError('Please select at least one test category')
      return
    }

    setIsLoading(true)
    setError(null)
    
    try {
      const response = await generateTests(formData)
      setResults(response)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate tests')
    } finally {
      setIsLoading(false)
    }
  }

  const handleGenerateTestData = async () => {
    if (!formData.storyTitle.trim() || !formData.acceptanceCriteria.trim()) {
      setError('Story Title and Acceptance Criteria are required')
      return
    }
    if (formData.categories.length === 0) {
      setError('Please select at least one test category')
      return
    }

    setIsLoading(true)
    setError(null)
    try {
      const resp = await generateTestData(formData)
      setTestDataResults(resp)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate test data')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDownloadCsv = async (cases?: any[]) => {
    const toUse = cases ?? testDataResults?.cases ?? results?.cases
    if (!toUse || toUse.length === 0) {
      setError('No test cases available to download')
      return
    }
    try {
      const blob = await fetchCsvForCases(toUse)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'test-cases.csv'
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to download CSV')
    }
  }

  return (
    <div>
      <style>{`
        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }
        
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
          background-color: #f5f5f5;
          color: #333;
          line-height: 1.6;
        }
        
        .container {
          max-width: 95%;
          width: 100%;
          margin: 0 auto;
          padding: 20px;
          min-height: 100vh;
        }
        
        @media (min-width: 768px) {
          .container {
            max-width: 90%;
            padding: 30px;
          }
        }
        
        @media (min-width: 1024px) {
          .container {
            max-width: 85%;
            padding: 40px;
          }
        }
        
        @media (min-width: 1440px) {
          .container {
            max-width: 1800px;
            padding: 50px;
          }
        }
        
        .header {
          text-align: center;
          margin-bottom: 40px;
        }
        
        .title {
          font-size: 2.5rem;
          color: #2c3e50;
          margin-bottom: 10px;
        }
        
        .subtitle {
          color: #666;
          font-size: 1.1rem;
        }
        
        .form-container {
          background: white;
          border-radius: 8px;
          padding: 30px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
          margin-bottom: 30px;
        }
        
        .form-group {
          margin-bottom: 20px;
        }
        
        .form-label {
          display: block;
          font-weight: 600;
          margin-bottom: 8px;
          color: #2c3e50;
        }
        
        .form-input, .form-textarea {
          width: 100%;
          padding: 12px;
          border: 2px solid #e1e8ed;
          border-radius: 6px;
          font-size: 14px;
          transition: border-color 0.2s;
        }

        /* Jira input styles */
        .jira-row { display: flex; gap: 12px; align-items: center; margin-bottom: 20px; }
        .jira-input { flex: 1; padding: 10px 12px; border: 2px solid #e1e8ed; border-radius: 6px; }
        .jira-btn { background: #2d7aef; color: white; border: none; padding: 10px 16px; border-radius: 6px; cursor: pointer; }
        .jira-btn:disabled { background: #9fbff8; cursor: not-allowed; }
        .jira-status { font-size: 13px; color: #666; margin-left: 8px; }
        
        .form-input:focus, .form-textarea:focus {
          outline: none;
          border-color: #3498db;
        }
        
        .form-textarea {
          resize: vertical;
          min-height: 100px;
        }
        
        .submit-btn {
          background: #3498db;
          color: white;
          border: none;
          padding: 12px 24px;
          border-radius: 6px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: background-color 0.2s;
        }
        
        .submit-btn:hover:not(:disabled) {
          background: #2980b9;
        }
        
        .submit-btn:disabled {
          background: #bdc3c7;
          cursor: not-allowed;
        }
        
        .error-banner {
          background: #e74c3c;
          color: white;
          padding: 15px;
          border-radius: 6px;
          margin-bottom: 20px;
        }
        
        .loading {
          text-align: center;
          padding: 40px;
          color: #666;
          font-size: 18px;
        }
        
        .results-container {
          background: white;
          border-radius: 8px;
          padding: 30px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        
        .results-header {
          margin-bottom: 20px;
          padding-bottom: 15px;
          border-bottom: 2px solid #e1e8ed;
        }
        
        .results-title {
          font-size: 1.8rem;
          color: #2c3e50;
          margin-bottom: 10px;
        }
        
        .results-meta {
          color: #666;
          font-size: 14px;
        }
        
        .table-container {
          overflow-x: auto;
        }
        
        .results-table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 20px;
        }
        
        .results-table th,
        .results-table td {
          padding: 12px;
          text-align: left;
          border-bottom: 1px solid #e1e8ed;
        }
        
        .results-table th {
          background: #f8f9fa;
          font-weight: 600;
          color: #2c3e50;
        }
        
        .results-table tr:hover {
          background: #f8f9fa;
        }
        
        .category-positive { color: #27ae60; font-weight: 600; }
        .category-negative { color: #e74c3c; font-weight: 600; }
        .category-edge { color: #f39c12; font-weight: 600; }
        .category-E2E { color: #9b59b6; font-weight: 600; }
        .category-Performance { color: #34495e; font-weight: 600; }
        
        .checkbox-group {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          margin-bottom: 20px;
        }
        
        .checkbox-label {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 16px;
          border: 2px solid #e1e8ed;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .checkbox-label:hover {
          border-color: #3498db;
        }
        
        .checkbox-label input[type="checkbox"] {
          width: 18px;
          height: 18px;
          accent-color: #3498db;
        }
        
        .checkbox-label.checked {
          background-color: #ebf5fb;
          border-color: #3498db;
        }
        
        .radio-group {
          display: flex;
          gap: 16px;
          margin-bottom: 20px;
        }
        
        .radio-label {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px 20px;
          border: 2px solid #e1e8ed;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.2s;
          font-weight: 500;
        }
        
        .radio-label:hover {
          border-color: #3498db;
        }
        
        .radio-label input[type="radio"] {
          width: 18px;
          height: 18px;
          accent-color: #3498db;
        }
        
        .radio-label.checked {
          background-color: #ebf5fb;
          border-color: #3498db;
        }
        
        .test-case-id {
          cursor: pointer;
          color: #3498db;
          font-weight: 600;
          padding: 8px 12px;
          border-radius: 4px;
          transition: background-color 0.2s;
          display: inline-flex;
          align-items: center;
          gap: 8px;
        }
        
        .test-case-id:hover {
          background: #f8f9fa;
        }
        
        .test-case-id.expanded {
          background: #e3f2fd;
          color: #1976d2;
        }
        
        .expand-icon {
          font-size: 10px;
          transition: transform 0.2s;
        }
        
        .expand-icon.expanded {
          transform: rotate(90deg);
        }
        
        .expanded-details {
          margin-top: 15px;
          background: #fafbfc;
          border: 1px solid #e1e8ed;
          border-radius: 8px;
          padding: 20px;
        }
        
        .step-item {
          background: white;
          border: 1px solid #e1e8ed;
          border-radius: 6px;
          padding: 15px;
          margin-bottom: 12px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.05);
        }
        
        .step-header {
          display: grid;
          grid-template-columns: 80px 1fr 1fr 1fr;
          gap: 15px;
          align-items: start;
        }
        
        .step-id {
          font-weight: 600;
          color: #2c3e50;
          background: #f8f9fa;
          padding: 4px 8px;
          border-radius: 4px;
          text-align: center;
          font-size: 12px;
        }
        
        .step-description {
          color: #2c3e50;
          line-height: 1.5;
        }
        
        .step-test-data {
          color: #666;
          font-style: italic;
          font-size: 14px;
        }
        
        .step-expected {
          color: #27ae60;
          font-weight: 500;
          font-size: 14px;
        }

        .bdd-section {
          margin-bottom: 15px;
          padding: 10px 15px;
          border-radius: 6px;
        }

        .bdd-given {
          background-color: #e8f5e9;
          border: 1px solid #c8e6c9;
        }

        .bdd-when {
          background-color: #e3f2fd;
          border: 1px solid #bbdefb;
        }

        .bdd-then {
          background-color: #f3e5f5;
          border: 1px solid #e1bee7;
        }

        .bdd-keyword {
          font-weight: 600;
          margin-right: 8px;
        }
        
        .step-labels {
          display: grid;
          grid-template-columns: 80px 1fr 1fr 1fr;
          gap: 15px;
          margin-bottom: 10px;
          font-weight: 600;
          color: #666;
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
      `}</style>
      
      <div className="container">
        <div className="header">
          <h1 className="title">User Story to Tests</h1>
          <p className="subtitle">Generate comprehensive test cases from your user stories</p>
        </div>
        
        <form onSubmit={handleSubmit} className="form-container">
          <div className="form-group">
            <label htmlFor="jiraId" className="form-label">Jira Issue Key</label>
            <div className="jira-row">
              <input
                id="jiraId"
                className="jira-input"
                value={jiraInput}
                onChange={(e) => setJiraInput(e.target.value)}
                placeholder="Enter Jira issue key (e.g., PROJ-123)"
                aria-label="Jira Issue Key"
              />
              <button
                type="button"
                className="jira-btn"
                onClick={async () => {
                  const raw = jiraInput.trim()
                  if (!raw) return setJiraError('Please enter an issue key or URL')
                  // Try to extract issue key like PROJ-123 from a pasted URL or raw input
                  const keyMatch = raw.match(/[A-Z][A-Z0-9]+-\d+/i)
                  let issueId = keyMatch ? keyMatch[0].toUpperCase() : raw
                  // Remove query/hash parts if someone pasted a URL-like string
                  issueId = issueId.split('?')[0].split('#')[0]

                  // Basic validation
                  if (!/[A-Z][A-Z0-9]+-\d+/.test(issueId)) {
                    setJiraError('Invalid Jira issue key or URL. Example: PROJ-123 or https://your.atlassian.net/browse/PROJ-123')
                    return
                  }

                  setJiraError(null)
                  setJiraLoading(true)
                  try {
                    const issue: JiraFetchResponse = await fetchJira(issueId)
                    setFormData(prev => ({
                      ...prev,
                      jiraId: issueId,
                      storyTitle: issue.title || prev.storyTitle,
                      description: issue.description ?? prev.description,
                      acceptanceCriteria: issue.acceptanceCriteria ?? prev.acceptanceCriteria,
                    }))
                  } catch (err) {
                    setJiraError(err instanceof Error ? err.message : 'Failed to fetch Jira issue')
                  } finally {
                    setJiraLoading(false)
                  }
                }}
                disabled={jiraLoading}
              >
                {jiraLoading ? 'Fetching...' : 'Fetch'}
              </button>
              <div className="jira-status">
                {jiraError && <span style={{color: '#e74c3c'}}>{jiraError}</span>}
              </div>
            </div>
          </div>
          <div className="form-group">
            <label htmlFor="storyTitle" className="form-label">
              Story Title *
            </label>
            <input
              type="text"
              id="storyTitle"
              className="form-input"
              value={formData.storyTitle}
              onChange={(e) => handleInputChange('storyTitle', e.target.value)}
              placeholder="Enter the user story title..."
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="description" className="form-label">
              Description
            </label>
            <textarea
              id="description"
              className="form-textarea"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Additional description (optional)..."
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="acceptanceCriteria" className="form-label">
              Acceptance Criteria *
            </label>
            <textarea
              id="acceptanceCriteria"
              className="form-textarea"
              value={formData.acceptanceCriteria}
              onChange={(e) => handleInputChange('acceptanceCriteria', e.target.value)}
              placeholder="Enter the acceptance criteria..."
              required
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="additionalInfo" className="form-label">
              Additional Info
            </label>
            <textarea
              id="additionalInfo"
              className="form-textarea"
              value={formData.additionalInfo}
              onChange={(e) => handleInputChange('additionalInfo', e.target.value)}
              placeholder="Any additional information (optional)..."
            />
          </div>

          <div className="form-group">
            <label className="form-label">Test Categories *</label>
            <div className="checkbox-group">
              {TEST_CATEGORIES.map((category) => (
                <label
                  key={category}
                  className={`checkbox-label ${formData.categories.includes(category) ? 'checked' : ''}`}
                >
                  <input
                    type="checkbox"
                    checked={formData.categories.includes(category)}
                    onChange={() => handleCategoryChange(category)}
                  />
                  {category}
                </label>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Test Format *</label>
            <div className="radio-group">
              {TEST_FORMATS.map((format) => (
                <label
                  key={format}
                  className={`radio-label ${formData.format === format ? 'checked' : ''}`}
                >
                  <input
                    type="radio"
                    checked={formData.format === format}
                    onChange={() => handleFormatChange(format)}
                    name="testFormat"
                  />
                  {format}
                </label>
              ))}
            </div>
          </div>
          
          <button
            type="submit"
            className="submit-btn"
            disabled={isLoading}
          >
            {isLoading ? 'Generating...' : 'Generate'}
          </button>
        </form>

        {error && (
          <div className="error-banner">
            {error}
          </div>
        )}

        {isLoading && (
          <div className="loading">
            Generating test cases...
          </div>
        )}

        <div style={{display: 'flex', gap: 12, marginBottom: 16}}>
          <button
            type="button"
            className="submit-btn"
            onClick={() => handleGenerateTestData()}
            disabled={isLoading}
          >
            {isLoading ? 'Generating...' : 'Generate Test Data'}
          </button>
          <button
            type="button"
            className="submit-btn"
            onClick={() => handleDownloadCsv()}
            disabled={isLoading}
            style={{background: '#2d7aef'}}
          >
            Download CSV (All)
          </button>
        </div>

        {testDataResults && (
          <div className="results-container" style={{marginBottom: 20}}>
            <div className="results-header">
              <h2 className="results-title">Generated Test Data</h2>
              <div className="results-meta">
                {testDataResults.cases.length} test data case(s) generated
                {testDataResults.model && ` • Model: ${testDataResults.model}`}
              </div>
            </div>
            <div style={{marginBottom: 12}}>
              <button
                type="button"
                className="submit-btn"
                onClick={() => handleDownloadCsv(testDataResults.cases)}
                style={{background: '#27ae60'}}
              >
                Download CSV (Test Data)
              </button>
            </div>
            <div className="table-container">
              <table className="results-table">
                <thead>
                  <tr>
                    <th>Test Case ID</th>
                    <th>Title</th>
                    <th>Category</th>
                    <th>Test Data</th>
                  </tr>
                </thead>
                <tbody>
                  {testDataResults.cases.map((tc: TestCase) => (
                    <tr key={tc.id}>
                      <td>{tc.id}</td>
                      <td>{tc.title}</td>
                      <td>{tc.category}</td>
                      <td>{tc.testData || 'N/A'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {results && (
          <div className="results-container">
            <div className="results-header">
              <h2 className="results-title">Generated Test Cases</h2>
              <div className="results-meta">
                {results.cases.length} test case(s) generated
                {results.model && ` • Model: ${results.model}`}
                {results.promptTokens > 0 && ` • Tokens: ${results.promptTokens + results.completionTokens}`}
              </div>
            </div>
            
            <div className="table-container">
              <table className="results-table">
                <thead>
                  <tr>
                    <th>Test Case ID</th>
                    <th>Title</th>
                    <th>Category</th>
                    <th>Expected Result</th>
                  </tr>
                </thead>
                <tbody>
                  {results.cases.map((testCase: TestCase) => (
                    <React.Fragment key={testCase.id}>
                      <tr>
                        <td>
                          <div 
                            className={`test-case-id ${expandedTestCases.has(testCase.id) ? 'expanded' : ''}`}
                            onClick={() => toggleTestCaseExpansion(testCase.id)}
                          >
                            <span className={`expand-icon ${expandedTestCases.has(testCase.id) ? 'expanded' : ''}`}>
                              ▶
                            </span>
                            {testCase.id}
                          </div>
                        </td>
                        <td>{testCase.title}</td>
                        <td>
                          <span className={`category-${testCase.category.toLowerCase()}`}>
                            {testCase.category}
                          </span>
                        </td>
                        <td>{testCase.expectedResult}</td>
                      </tr>
                      {expandedTestCases.has(testCase.id) && (
                        <tr key={`${testCase.id}-details`}>
                          <td colSpan={4}>
                            <div className="expanded-details">
                              <h4 style={{marginBottom: '15px', color: '#2c3e50'}}>Test Details for {testCase.id}</h4>
                              {testCase.format === 'BDD' ? (
                                <>
                                  {testCase.given && testCase.given.length > 0 && (
                                    <div className="bdd-section bdd-given">
                                      <h5 style={{marginBottom: '10px', color: '#2e7d32'}}>Given (Preconditions)</h5>
                                      {testCase.given.map((text, index) => (
                                        <div key={index} style={{marginBottom: '8px'}}>
                                          {text}
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                  {testCase.when && testCase.when.length > 0 && (
                                    <div className="bdd-section bdd-when">
                                      <h5 style={{marginBottom: '10px', color: '#1565c0'}}>When (Actions)</h5>
                                      {testCase.when.map((text, index) => (
                                        <div key={index} style={{marginBottom: '8px'}}>
                                          {text}
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                  {testCase.then && testCase.then.length > 0 && (
                                    <div className="bdd-section bdd-then">
                                      <h5 style={{marginBottom: '10px', color: '#6a1b9a'}}>Then (Expected Results)</h5>
                                      {testCase.then.map((text, index) => (
                                        <div key={index} style={{marginBottom: '8px'}}>
                                          {text}
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </>
                              ) : (
                                <>
                                  <div className="step-labels">
                                    <div>Step ID</div>
                                    <div>Step Description</div>
                                    <div>Test Data</div>
                                    <div>Expected Result</div>
                                  </div>
                                  {testCase.steps && testCase.steps.map((step, index) => (
                                    <div key={index} className="step-item">
                                      <div className="step-header">
                                        <div className="step-id">S{String(index + 1).padStart(2, '0')}</div>
                                        <div className="step-description">{step}</div>
                                        <div className="step-test-data">{testCase.testData || 'N/A'}</div>
                                        <div className="step-expected">
                                          {index === testCase.steps.length - 1 ? testCase.expectedResult : 'Step completed successfully'}
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default App