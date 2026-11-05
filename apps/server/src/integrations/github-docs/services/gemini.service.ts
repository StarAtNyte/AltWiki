import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { RepoAnalysis, GeneratedDoc } from '../dto/generate-docs.dto';
import { WorkspaceRepo } from '@docmost/db/repos/workspace/workspace.repo';

interface GeminiResponse {
  candidates: Array<{
    content: {
      parts: Array<{
        text: string;
      }>;
    };
  }>;
}

@Injectable()
export class GeminiService {
  private readonly logger = new Logger(GeminiService.name);
  private readonly MODEL = 'gemini-flash-latest';

  constructor(private readonly workspaceRepo: WorkspaceRepo) {}

  private getApiUrl(): string {
    return `https://generativelanguage.googleapis.com/v1beta/models/${this.MODEL}:generateContent`;
  }

  private async getApiKey(workspaceId: string): Promise<string> {
    const workspaceKey = await this.workspaceRepo.getIntegrationSetting(
      workspaceId,
      'geminiApiKey',
    );

    if (workspaceKey) {
      return workspaceKey;
    }

    const envKey = process.env.GEMINI_API_KEY;
    if (envKey) {
      return envKey;
    }

    throw new BadRequestException(
      'Gemini API key not configured. Please configure it in Settings > AI settings.',
    );
  }

  private readonly SYSTEM_PROMPT = `You are a world-class technical documentation expert who has written documentation for major open-source projects. Your goal is to create documentation that developers will genuinely find useful and want to read.

## Your Documentation Philosophy

Great documentation answers three questions in order:
1. **Why should I care?** - What problem does this solve? Why does it exist?
2. **How does it work?** - The mental model, architecture, and key concepts
3. **How do I use it?** - Practical, copy-paste-ready examples

## Writing Style

Write like a senior engineer explaining the codebase to a new team member:
- Be direct and technical - developers appreciate precision over politeness
- Explain the "why" behind design decisions, not just the "what"
- Use concrete examples instead of abstract descriptions
- Acknowledge trade-offs and limitations honestly
- NO emojis, NO marketing speak, NO buzzwords like "blazingly fast" or "seamlessly"
- Prefer active voice: "The server handles requests" not "Requests are handled by the server"

## Content Quality Standards

**For Architecture Sections:**
- Explain the high-level design first, then drill into components
- Describe how data flows through the system
- Identify the key abstractions and why they exist
- Note important patterns used (e.g., "Uses the Repository pattern for data access")

**For Code Examples:**
- Every example must be realistic and runnable
- Show the common case first, then edge cases
- Include error handling in examples where appropriate
- Add brief comments explaining non-obvious parts

**For Mermaid Diagrams:**
Use diagrams to clarify architecture and flows. Examples:

Architecture diagram:
\`\`\`mermaid
graph TB
    subgraph "Client Layer"
        A[Web App]
        B[Mobile App]
    end
    subgraph "API Layer"
        C[REST API]
        D[WebSocket Server]
    end
    subgraph "Service Layer"
        E[Auth Service]
        F[Data Service]
    end
    A --> C
    B --> C
    C --> E
    C --> F
    D --> F
\`\`\`

Sequence diagram for flows:
\`\`\`mermaid
sequenceDiagram
    participant Client
    participant API
    participant Auth
    participant DB
    Client->>API: POST /login
    API->>Auth: validateCredentials()
    Auth->>DB: findUser()
    DB-->>Auth: user data
    Auth-->>API: token
    API-->>Client: 200 OK + token
\`\`\`

## Output Format

Generate documentation as sections marked with:
---SECTION: Title---
[content]
---END SECTION---

## Required Sections (generate in this order):

### 1. Overview
- One-paragraph summary of what this project does and why it exists
- Key features as a bullet list (5-8 items max)
- Who should use this and when
- Technology stack overview

### 2. Architecture
- High-level architecture diagram (Mermaid)
- Description of each major component/module
- How components communicate with each other
- Key design decisions and their rationale
- Data flow through the system

### 3. Core Concepts
- The fundamental abstractions developers need to understand
- Key terminology with clear definitions
- Mental models for how things work
- Relationships between concepts (consider an entity diagram)

### 4. Getting Started
- Prerequisites (runtime versions, dependencies)
- Installation steps (exact commands)
- Basic configuration
- "Hello World" example that proves it works
- Common first-time setup issues and solutions

### 5. Usage Guide
- Most common use cases with full code examples
- Step-by-step workflows for typical tasks
- Best practices and recommended patterns
- Anti-patterns to avoid

### 6. API Reference
- Main public functions/methods/classes
- Parameters with types and descriptions
- Return values
- Exceptions/errors that can be thrown
- Usage example for each major API

### 7. Configuration
- All configuration options in a table format
- Environment variables
- Configuration file format and location
- Default values and valid ranges
- Example configurations for common scenarios

### 8. Troubleshooting
- Common errors and their solutions
- Debugging tips
- How to get help (if mentioned in repo)
- Performance considerations`;

  async generateDocumentation(
    analysis: RepoAnalysis,
    workspaceId: string,
  ): Promise<GeneratedDoc[]> {
    const { metadata, files, tree } = analysis;

    const contextPrompt = this.buildContextPrompt(metadata, files, tree);

    this.logger.log(`Generating documentation with Gemini for ${metadata.owner}/${metadata.repo}`);

    const response = await this.callGemini(contextPrompt, workspaceId);
    const docs = this.parseGeneratedDocs(response);

    return docs;
  }

  private buildContextPrompt(
    metadata: RepoAnalysis['metadata'],
    files: RepoAnalysis['files'],
    tree: string,
  ): string {
    // Categorize files for better context
    const entryPoints = files.filter(f =>
      /^(index|main|app|server|cli)\.(ts|js|py|go|rs)$/.test(f.path.split('/').pop() || '')
    );
    const configs = files.filter(f =>
      /(package\.json|tsconfig|\.config\.|requirements|Cargo\.toml|go\.mod)/.test(f.path)
    );
    const readmes = files.filter(f =>
      /readme/i.test(f.path)
    );
    const sourceFiles = files.filter(f =>
      !entryPoints.includes(f) && !configs.includes(f) && !readmes.includes(f)
    );

    let prompt = `# Repository Analysis: ${metadata.owner}/${metadata.repo}

## Project Context
- **Description**: ${metadata.description || 'No description provided'}
- **Primary Language**: ${metadata.language || 'Unknown'}
- **Popularity**: ${metadata.stars} stars, ${metadata.forks || 0} forks
- **License**: ${metadata.license || 'Not specified'}

## Project Structure
\`\`\`
${tree}
\`\`\`

## Key Files Analysis

`;

    // Add README first if exists
    if (readmes.length > 0) {
      prompt += `### Existing Documentation\n`;
      for (const file of readmes) {
        prompt += `**${file.path}**:\n${file.content.slice(0, 4000)}\n\n`;
      }
    }

    // Add config files to understand the project setup
    if (configs.length > 0) {
      prompt += `### Configuration & Dependencies\n`;
      for (const file of configs) {
        const ext = file.path.split('.').pop() || 'txt';
        prompt += `**${file.path}**:\n\`\`\`${ext}\n${file.content.slice(0, 3000)}\n\`\`\`\n\n`;
      }
    }

    // Add entry points - these are crucial for understanding the app
    if (entryPoints.length > 0) {
      prompt += `### Entry Points\n`;
      for (const file of entryPoints) {
        const ext = file.path.split('.').pop() || 'txt';
        prompt += `**${file.path}**:\n\`\`\`${ext}\n${file.content.slice(0, 6000)}\n\`\`\`\n\n`;
      }
    }

    // Add source files
    prompt += `### Source Code\n`;
    for (const file of sourceFiles) {
      const ext = file.path.split('.').pop() || 'txt';
      const maxLen = sourceFiles.length > 20 ? 4000 : 6000;
      prompt += `**${file.path}**:\n\`\`\`${ext}\n${file.content.slice(0, maxLen)}\n\`\`\`\n\n`;
    }

    prompt += `
---

## Your Task

Analyze the codebase above and generate comprehensive documentation following the section format specified in the system prompt.

**Key Requirements:**
1. Start by understanding what problem this project solves
2. Identify the core architecture and how components interact
3. Trace the main code paths (e.g., what happens when a request comes in?)
4. Note any patterns, conventions, or idioms used
5. Find the public API surface that users interact with

**Generate documentation that:**
- Helps a new developer understand the codebase quickly
- Explains the "why" behind architectural decisions
- Includes practical, runnable code examples
- Uses Mermaid diagrams to visualize architecture and flows
- Is technically accurate based on the actual code, not assumptions

Remember: Quality over quantity. It's better to explain fewer things well than many things superficially.`;

    return prompt;
  }

  private async callGemini(prompt: string, workspaceId: string): Promise<string> {
    const apiKey = await this.getApiKey(workspaceId);

    const requestBody = {
      contents: [
        {
          parts: [
            { text: this.SYSTEM_PROMPT },
            { text: prompt },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.4,
        maxOutputTokens: 16384,
      },
    };

    const response = await fetch(`${this.getApiUrl()}?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const error = await response.text();
      this.logger.error(`Gemini API error: ${error}`);
      throw new Error(`Gemini API error: ${response.statusText}`);
    }

    const data: GeminiResponse = await response.json();

    if (!data.candidates?.[0]?.content?.parts?.[0]?.text) {
      throw new Error('Invalid response from Gemini API');
    }

    return data.candidates[0].content.parts[0].text;
  }

  private parseGeneratedDocs(response: string): GeneratedDoc[] {
    const docs: GeneratedDoc[] = [];
    const sectionRegex = /---SECTION:\s*(.+?)---\n([\s\S]*?)---END SECTION---/g;

    let match;
    let order = 0;

    while ((match = sectionRegex.exec(response)) !== null) {
      const title = match[1].trim();
      const content = match[2].trim();

      docs.push({
        title,
        content,
        order: order++,
      });
    }

    if (docs.length === 0) {
      this.logger.warn('No sections found in response, treating entire response as single doc');
      docs.push({
        title: 'Documentation',
        content: response,
        order: 0,
      });
    }

    return docs;
  }
}
