# GitHub Copilot Usage Guide for CXI Web

This guide provides comprehensive instructions for using GitHub Copilot effectively in the CXI Web project, covering both Copilot Chat and Coding Agent features.

## Table of Contents

- [What GitHub Copilot Can Do](#what-github-copilot-can-do)
- [Writing Effective Prompts](#writing-effective-prompts)
- [Copy-Paste Templates](#copy-paste-templates)
- [Repository-Specific Best Practices](#repository-specific-best-practices)
- [Creating Issues and PRs with Copilot](#creating-issues-and-prs-with-copilot)
- [Common Use Cases](#common-use-cases)

## What GitHub Copilot Can Do

GitHub Copilot offers several powerful capabilities to enhance your development workflow:

### Code Generation and Completion
- **Auto-complete functions and classes** based on comments and context
- **Generate boilerplate code** for common patterns
- **Create test cases** based on existing functions
- **Write documentation** from code structure

### Code Analysis and Explanation
- **Explain complex code sections** in plain language
- **Suggest optimizations** and best practices
- **Identify potential bugs** and security issues
- **Provide alternative implementations**

### Project Management
- **Create detailed issue descriptions** from brief summaries
- **Generate comprehensive PR descriptions** 
- **Write commit messages** that follow conventions
- **Draft project documentation** and README updates

### Debugging and Testing
- **Suggest debugging strategies** for specific errors
- **Generate test scenarios** for edge cases
- **Create mock data** for testing
- **Propose fixes** for failing tests

## Writing Effective Prompts

### General Principles

1. **Be Specific and Clear**
   - Provide context about what you're trying to achieve
   - Include relevant details about the project structure
   - Specify the technology stack (JavaScript, Node.js, Netlify Functions)

2. **Provide Context**
   - Mention this is a customer feedback collection system
   - Reference existing code patterns when relevant
   - Include error messages or logs when debugging

3. **Use Examples**
   - Show input/output examples for data transformations
   - Provide sample API requests/responses
   - Include code snippets of similar existing functionality

### Effective Prompt Examples

#### Good Prompt for Code Generation
```
Create a new Netlify function for calculating Net Satisfaction Score (NSS) 
from feedback data. The function should:
- Accept POST requests with feedback objects containing 'overall' rating (1-5)
- Calculate NSS using the formula: (positive - negative) / total * 100
- Return JSON response with calculated score
- Follow the same error handling pattern as existing functions in netlify/functions/
```

#### Good Prompt for Debugging
```
I'm getting a 500 error in the nudge-cron.js function when trying to send emails. 
The error occurs at line 45 where we call the Resend API. Here's the error message:
[error details]. Can you help me identify what might be causing this and suggest a fix?
```

#### Good Prompt for Documentation
```
Write documentation for the schedule-nudge.js function that explains:
- What the function does (schedules follow-up emails)
- Required parameters (email, token)
- When nudges are sent (4 hours and 24 hours later)
- How it integrates with the nudge-cron.js function
- Example usage
```

## Copy-Paste Templates

### Feature Request Template
```
Create a new feature for [feature name] in the CXI Web project that:

**Context:**
- This is a customer feedback collection system built with JavaScript and Netlify Functions
- We use GitHub API for data persistence and Resend for email notifications
- The main feedback flow is handled in src/app.js

**Requirements:**
- [Specific requirement 1]
- [Specific requirement 2]
- [Specific requirement 3]

**Technical Details:**
- Should integrate with existing [specific component/function]
- Follow the same error handling patterns as [reference function]
- Maintain compatibility with [specific API/service]

**Acceptance Criteria:**
- [ ] [Specific measurable outcome 1]
- [ ] [Specific measurable outcome 2]
- [ ] [Tests are included/updated]
- [ ] [Documentation is updated]
```

### Bug Report Template
```
Fix bug in [component/function name]:

**Current Behavior:**
[Describe what's happening now]

**Expected Behavior:**
[Describe what should happen]

**Steps to Reproduce:**
1. [Step 1]
2. [Step 2]
3. [Step 3]

**Error Details:**
```
[Include error messages, console logs, or stack traces]
```

**Environment:**
- Node.js version: [version]
- Browser: [if applicable]
- Netlify deployment: [if relevant]

**Additional Context:**
[Any other relevant information about the CXI Web project]
```

### Code Review Template
```
Review this code for [specific purpose] in the CXI Web project:

**Code to Review:**
```[language]
[paste code here]
```

**Review Focus:**
- [ ] Code quality and best practices
- [ ] Security considerations (especially for Netlify Functions)
- [ ] Performance implications
- [ ] Consistency with existing codebase
- [ ] Error handling patterns
- [ ] Integration with GitHub API and Resend email service

**Context:**
This code is part of [describe purpose within the feedback collection system]
```

### Test Generation Template
```
Generate comprehensive tests for [function/feature name] in the CXI Web project:

**Function to Test:**
```javascript
[paste function code here]
```

**Test Requirements:**
- [ ] Unit tests for all public methods
- [ ] Edge case testing (empty inputs, invalid data)
- [ ] Error handling validation
- [ ] Integration tests for API endpoints
- [ ] Mock external services (GitHub API, Resend)

**Context:**
- This is part of a customer feedback collection system
- Follow existing test patterns from src/app.test.js
- Use appropriate mocking for Netlify Functions
```

### Documentation Template
```
Create documentation for [component/feature] in the CXI Web project:

**Component Details:**
- File: [file path]
- Purpose: [brief description]
- Dependencies: [list key dependencies]

**Documentation Requirements:**
- [ ] Clear overview of functionality
- [ ] API reference (parameters, return values)
- [ ] Usage examples with code samples
- [ ] Integration points with other components
- [ ] Configuration options
- [ ] Error handling information

**Audience:** Developers contributing to the CXI Web feedback collection system
```

## Repository-Specific Best Practices

### Code Style and Structure
- **Follow existing JavaScript patterns** used in netlify/functions/
- **Use ES6 modules** (`import`/`export`) as configured in package.json
- **Maintain consistent error handling** with try/catch blocks and proper HTTP status codes
- **Use descriptive variable names** that reflect the feedback collection domain

### Working with Netlify Functions
- **Always validate input parameters** in function handlers
- **Return proper HTTP status codes** (200, 400, 500)
- **Use JSON responses** consistently
- **Handle async operations** with proper error catching
- **Log important events** for debugging in production

### GitHub Integration
- **Use environment variables** for sensitive data (GITHUB_TOKEN, RESEND_API_KEY)
- **Follow existing API patterns** for data persistence
- **Maintain consistent data structure** for feedback objects
- **Handle API rate limits** gracefully

### Email Functionality
- **Use Resend API** for email notifications
- **Follow email template patterns** from nudge-cron.js
- **Include proper error handling** for email failures
- **Log email events** for tracking and debugging

### Testing Considerations
- **Mock external services** (GitHub API, Resend)
- **Test both success and failure scenarios**
- **Validate input/output data structures**
- **Test async functionality** properly

## Creating Issues and PRs with Copilot

### Creating Issues

Use Copilot to generate detailed issue descriptions:

```
@copilot Create a GitHub issue for implementing [feature description] in the CXI Web project.

Include:
- Clear problem statement
- Acceptance criteria as checklist
- Technical requirements specific to our Netlify Functions setup
- Labels: [feature/bug/documentation]
- Relevant context about customer feedback collection system
```

### Creating Pull Requests

Generate comprehensive PR descriptions:

```
@copilot Create a PR description for the changes I made to implement [feature/fix].

The changes include:
- [List of file changes]
- [New functionality added]
- [Issues resolved]

Include:
- Summary of changes
- Testing performed
- Checklist for reviewers
- Any breaking changes or migration notes
- Reference to related issues (#issue-number)
```

### Commit Message Generation

Get well-formatted commit messages:

```
@copilot Generate a commit message for these changes:
[Describe what you changed]

Follow conventional commit format and be specific about the impact on the CXI Web feedback system.
```

## Common Use Cases

### Adding New Feedback Features

```
I need to add a new feedback aspect called "Accessibility" to the CXI Web system. 
Help me:
1. Update the ASPECTS array configuration
2. Modify any validation logic
3. Update tests to include the new aspect
4. Document the change

Please maintain compatibility with existing feedback data and follow the established patterns.
```

### Debugging Netlify Functions

```
My Netlify function [function-name] is failing with [error description]. 
The function handles [brief description of purpose]. 
Help me debug this by:
1. Analyzing the error pattern
2. Suggesting fixes
3. Recommending prevention strategies
4. Improving error logging

Here's the relevant code: [paste code]
```

### Optimizing Performance

```
Review the [component/function] for performance optimization opportunities in the CXI Web project:
1. Identify bottlenecks in feedback processing
2. Suggest caching strategies for GitHub API calls
3. Optimize email notification batching
4. Recommend monitoring improvements

Consider the serverless environment constraints and existing architecture.
```

### Security Review

```
Perform a security review of [component] focusing on:
1. Input validation for feedback data
2. Authentication and authorization
3. Secure handling of API keys
4. Protection against common vulnerabilities
5. Compliance with data privacy requirements

This component handles customer feedback data, so privacy and security are critical.
```

---

## Getting Help

If you need assistance with any Copilot features or have questions about implementing these practices:

1. **Use Copilot Chat** with specific questions about the CXI Web codebase
2. **Reference this guide** when crafting prompts
3. **Open an issue** if you find gaps in this documentation
4. **Share successful prompt patterns** with the team

Remember: The more context you provide about the CXI Web project structure and requirements, the better Copilot can assist you!