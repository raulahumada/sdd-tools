export interface Requirement {
    id: string;
    text: string;
    keywords: string[];
    section: string;
  }
  
  export interface TestCase {
    name: string;
    file: string;
    line: number;
    body: string;
    assertions: string[];
  }
  
  export interface RequirementCoverage {
    requirement: Requirement;
    tests: TestCase[];
    verified: boolean;
    confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  }
  
  export interface AffectedModule {
    path: string;
    coupling: 'LOW' | 'MEDIUM' | 'HIGH';
    risk: 'LOW' | 'MEDIUM' | 'HIGH';
    testsAtRisk: number;
  }
  
  export interface ImpactResult {
    riskScore: number;
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
    affectedModules: AffectedModule[];
    recommendedOrder: string[];
    breakingChanges: string[];
    testsAtRisk: string[];
  }
  
  export interface Decision {
    id: string;
    title: string;
    context: string;
    decision: string;
    consequences: string;
    feature: string;
    filesAffected: string[];
    createdAt: string;
  }
  
  export interface Session {
    id: string;
    feature: string;
    label: string;
    createdAt: string;
    tasksCompleted: string[];
    tasksPending: string[];
    decisions: string[];
    filesModified: string[];
    gitBranch: string;
    gitHead: string;
  }
  
  export interface ReviewIssue {
    severity: 'error' | 'warning' | 'info';
    confidence: 'HIGH' | 'MEDIUM' | 'LOW';
    file?: string;
    line?: number;
    issue: string;
    suggestion: string;
    pattern: string;
    patternFrequency: number;
  }
  
  export interface DebtModule {
    name: string;
    score: number;
    trend: 'up' | 'down' | 'stable';
    topIssue: string;
  }
  
  export interface DebtReport {
    overallScore: number;
    modules: DebtModule[];
    trend: 'up' | 'down' | 'stable';
    suggestedSpecs: string[];
  }
  
  export interface HandoffData {
    feature: string;
    exportedFrom: string;
    exportedAt: string;
    tasks: { name: string; status: string }[];
    git: {
      branch: string;
      head: string;
      dirtyFiles: string[];
    };
    decisions: Decision[];
    resolvedIssues: { issue: string; resolution: string }[];
    pending: string[];
    suggestedPrompt: string;
  }
  
  export interface SkillResult {
    success: boolean;
    message: string;
    outputPath?: string;
  }
  
  export interface SDDConfig {
    specs_dir: string;
    output_dir: string;
    spec_format: string;
    ide: string;
    tools: Record<string, { enabled: boolean; auto_trigger: boolean }>;
  }
  