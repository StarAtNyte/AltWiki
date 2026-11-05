import { Injectable, Logger } from '@nestjs/common';
import { RepoMetadata, RepoFile, RepoAnalysis } from '../dto/generate-docs.dto';

interface GitHubTreeItem {
  path: string;
  mode: string;
  type: 'blob' | 'tree';
  sha: string;
  size?: number;
  url: string;
}

@Injectable()
export class GithubFetcherService {
  private readonly logger = new Logger(GithubFetcherService.name);

  private readonly EXCLUDE_PATTERNS = [
    /^node_modules\//,
    /^\.git\//,
    /^dist\//,
    /^build\//,
    /^out\//,
    /^\.next\//,
    /^vendor\//,
    /^__pycache__\//,
    /^\.venv\//,
    /^venv\//,
    /^\.idea\//,
    /^\.vscode\//,
    /^coverage\//,
    /^\.nyc_output\//,
    /\.min\.js$/,
    /\.min\.css$/,
    /\.map$/,
    /\.lock$/,
    /package-lock\.json$/,
    /pnpm-lock\.yaml$/,
    /yarn\.lock$/,
    /\.png$/i,
    /\.jpg$/i,
    /\.jpeg$/i,
    /\.gif$/i,
    /\.ico$/i,
    /\.svg$/i,
    /\.woff2?$/i,
    /\.ttf$/i,
    /\.eot$/i,
    /\.mp4$/i,
    /\.mp3$/i,
    /\.pdf$/i,
    /\.zip$/i,
    /\.tar$/i,
    /\.gz$/i,
  ];

  private readonly MAX_FILE_SIZE = 50 * 1024; // 50KB
  private readonly MAX_FILES = 100;

  private readonly PRIORITY_FILES = [
    'README.md',
    'readme.md',
    'README',
    'package.json',
    'Cargo.toml',
    'go.mod',
    'pyproject.toml',
    'setup.py',
    'requirements.txt',
    'composer.json',
    'pom.xml',
    'build.gradle',
  ];

  parseGithubUrl(url: string): { owner: string; repo: string } {
    const match = url.match(/github\.com\/([^\/]+)\/([^\/\?#]+)/);
    if (!match) {
      throw new Error('Invalid GitHub URL');
    }
    return {
      owner: match[1],
      repo: match[2].replace(/\.git$/, ''),
    };
  }

  async fetchRepoMetadata(owner: string, repo: string): Promise<RepoMetadata> {
    const response = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
      headers: {
        Accept: 'application/vnd.github.v3+json',
        'User-Agent': 'Docmost-GitHub-Docs',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch repository: ${response.statusText}`);
    }

    const data = await response.json();

    return {
      owner,
      repo,
      description: data.description || '',
      stars: data.stargazers_count,
      forks: data.forks_count,
      license: data.license?.name || null,
      defaultBranch: data.default_branch,
      language: data.language,
    };
  }

  async fetchRepoTree(
    owner: string,
    repo: string,
    branch: string,
  ): Promise<GitHubTreeItem[]> {
    const response = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`,
      {
        headers: {
          Accept: 'application/vnd.github.v3+json',
          'User-Agent': 'Docmost-GitHub-Docs',
        },
      },
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch repository tree: ${response.statusText}`);
    }

    const data = await response.json();
    return data.tree || [];
  }

  private shouldExclude(path: string): boolean {
    return this.EXCLUDE_PATTERNS.some((pattern) => pattern.test(path));
  }

  private isPriorityFile(path: string): boolean {
    const filename = path.split('/').pop() || '';
    return this.PRIORITY_FILES.includes(filename);
  }

  private isTextFile(path: string): boolean {
    const textExtensions = [
      '.md',
      '.txt',
      '.js',
      '.ts',
      '.jsx',
      '.tsx',
      '.py',
      '.rb',
      '.go',
      '.rs',
      '.java',
      '.c',
      '.cpp',
      '.h',
      '.hpp',
      '.cs',
      '.php',
      '.swift',
      '.kt',
      '.scala',
      '.vue',
      '.svelte',
      '.html',
      '.css',
      '.scss',
      '.sass',
      '.less',
      '.json',
      '.yaml',
      '.yml',
      '.toml',
      '.ini',
      '.cfg',
      '.conf',
      '.sh',
      '.bash',
      '.zsh',
      '.fish',
      '.ps1',
      '.dockerfile',
      '.sql',
      '.graphql',
      '.proto',
      '.xml',
      '.env',
      '.env.example',
      '.gitignore',
      '.eslintrc',
      '.prettierrc',
    ];

    const ext = '.' + (path.split('.').pop()?.toLowerCase() || '');
    const filename = path.split('/').pop() || '';

    return (
      textExtensions.includes(ext) ||
      filename === 'Dockerfile' ||
      filename === 'Makefile' ||
      filename === 'Rakefile' ||
      filename === '.gitignore' ||
      filename === '.env.example'
    );
  }

  async fetchFileContent(
    owner: string,
    repo: string,
    path: string,
    branch: string,
  ): Promise<string> {
    const response = await fetch(
      `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${path}`,
      {
        headers: {
          'User-Agent': 'Docmost-GitHub-Docs',
        },
      },
    );

    if (!response.ok) {
      this.logger.warn(`Failed to fetch file ${path}: ${response.statusText}`);
      return '';
    }

    return response.text();
  }

  async analyzeRepository(url: string): Promise<RepoAnalysis> {
    const { owner, repo } = this.parseGithubUrl(url);

    this.logger.log(`Fetching repository: ${owner}/${repo}`);
    const metadata = await this.fetchRepoMetadata(owner, repo);

    this.logger.log(`Fetching tree for branch: ${metadata.defaultBranch}`);
    const tree = await this.fetchRepoTree(owner, repo, metadata.defaultBranch);

    const eligibleFiles = tree
      .filter((item) => item.type === 'blob')
      .filter((item) => !this.shouldExclude(item.path))
      .filter((item) => this.isTextFile(item.path))
      .filter((item) => (item.size || 0) <= this.MAX_FILE_SIZE);

    const priorityFiles = eligibleFiles.filter((f) => this.isPriorityFile(f.path));
    const srcFiles = eligibleFiles.filter(
      (f) =>
        !this.isPriorityFile(f.path) &&
        (f.path.startsWith('src/') ||
          f.path.startsWith('lib/') ||
          f.path.startsWith('app/') ||
          f.path.startsWith('packages/')),
    );
    const otherFiles = eligibleFiles.filter(
      (f) =>
        !this.isPriorityFile(f.path) &&
        !f.path.startsWith('src/') &&
        !f.path.startsWith('lib/') &&
        !f.path.startsWith('app/') &&
        !f.path.startsWith('packages/'),
    );

    const sortedFiles = [...priorityFiles, ...srcFiles, ...otherFiles].slice(
      0,
      this.MAX_FILES,
    );

    this.logger.log(`Fetching ${sortedFiles.length} files...`);
    const files: RepoFile[] = [];

    for (const file of sortedFiles) {
      const content = await this.fetchFileContent(
        owner,
        repo,
        file.path,
        metadata.defaultBranch,
      );
      if (content) {
        files.push({
          path: file.path,
          content,
          size: file.size || content.length,
        });
      }
    }

    const treeString = this.buildTreeString(tree);
    const totalSize = files.reduce((acc, f) => acc + f.size, 0);
    const estimatedTokens = Math.ceil(totalSize / 4);

    return {
      metadata,
      files,
      tree: treeString,
      totalFiles: files.length,
      totalSize,
      estimatedTokens,
    };
  }

  private buildTreeString(tree: GitHubTreeItem[]): string {
    const filteredTree = tree.filter((item) => !this.shouldExclude(item.path));

    const dirs = new Set<string>();
    filteredTree.forEach((item) => {
      const parts = item.path.split('/');
      for (let i = 1; i < parts.length; i++) {
        dirs.add(parts.slice(0, i).join('/'));
      }
    });

    const lines: string[] = [];
    const addedPaths = new Set<string>();

    const sortedItems = [...filteredTree].sort((a, b) =>
      a.path.localeCompare(b.path),
    );

    for (const item of sortedItems.slice(0, 50)) {
      const parts = item.path.split('/');
      const indent = '  '.repeat(parts.length - 1);
      const name = parts[parts.length - 1];
      const icon = item.type === 'tree' ? '📁' : '📄';

      if (!addedPaths.has(item.path)) {
        lines.push(`${indent}${icon} ${name}`);
        addedPaths.add(item.path);
      }
    }

    if (sortedItems.length > 50) {
      lines.push(`  ... and ${sortedItems.length - 50} more files`);
    }

    return lines.join('\n');
  }
}
