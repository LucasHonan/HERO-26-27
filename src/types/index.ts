export type Priority = "Critical" | "High" | "Medium" | "Low";
export type Status = "Draft" | "In Review" | "Approved" | "Open" | "In Progress" | "Blocked" | "Complete" | "Retired";
export type Confidence = "High" | "Medium" | "Low";
export type Applicability = "Direct" | "Related" | "Background" | "Rejected";
export type PassFail = "Pass" | "Fail" | "Partial" | "Not Run";
export type CoverageStatus = "Covered" | "Partially covered" | "Uncovered";

export interface BaseEntity {
  id: string;
  title: string;
  subsystem: string;
  owner: string;
  priority: Priority;
  status: Status;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface ResearchEntry extends BaseEntity {
  category: string;
  summary: string;
  sourceUrl: string;
  sourceTitle: string;
  sourceType: string;
  citationNotes: string;
  applicability: Applicability;
  confidence: Confidence;
  linkedDecisionIds: string[];
  linkedRequirementIds: string[];
  linkedTestIds: string[];
  linkedRiskIds: string[];
  linkedMatrixIds: string[];
}

export interface Decision extends BaseEntity {
  category: string;
  decision: string;
  rationale: string;
  alternatives: string[];
  linkedResearchIds: string[];
  linkedRequirementIds: string[];
  linkedTestIds: string[];
  linkedRiskIds: string[];
  linkedMatrixIds: string[];
}

export interface Requirement extends BaseEntity {
  requirementId: string;
  description: string;
  verificationMethod: string;
  acceptanceCriteria: string;
  linkedDecisionIds: string[];
  linkedTestIds: string[];
  linkedRiskIds: string[];
}

export interface TestEntry extends BaseEntity {
  date: string;
  setup: string;
  procedure: string;
  expectedResult: string;
  actualResult: string;
  passFail: PassFail;
  evidenceLinks: string[];
  codeVersion: string;
  hardwareVersion: string;
  linkedRequirementIds: string[];
  linkedDecisionIds: string[];
  linkedResearchIds: string[];
}

export interface Risk extends BaseEntity {
  description: string;
  likelihood: number;
  impact: number;
  mitigation: string;
  contingency: string;
  linkedRequirementIds: string[];
  linkedDecisionIds: string[];
  linkedTestIds: string[];
}

export interface MatrixCriterion {
  id: string;
  name: string;
  weight: number;
  description: string;
}

export interface MatrixOption {
  id: string;
  name: string;
  notes: string;
  pros: string[];
  cons: string[];
  scores: Record<string, number>;
}

export interface DecisionMatrix {
  id: string;
  title: string;
  description: string;
  category: string;
  criteria: MatrixCriterion[];
  options: MatrixOption[];
  createdAt: string;
  updatedAt: string;
}

export interface AppData {
  schemaVersion: number;
  research: ResearchEntry[];
  decisions: Decision[];
  requirements: Requirement[];
  tests: TestEntry[];
  risks: Risk[];
  matrices: DecisionMatrix[];
  snapshots: SavedSnapshot[];
}

export interface SavedSnapshot {
  id: string;
  label: string;
  createdAt: string;
  data: Omit<AppData, "snapshots">;
}

export type PageId =
  | "dashboard"
  | "research"
  | "decisions"
  | "matrices"
  | "requirements"
  | "tests"
  | "risks"
  | "traceability"
  | "export";

export interface FilterState {
  subsystem: string;
  category: string;
  status: string;
  priority: string;
  owner: string;
  applicability: string;
}
