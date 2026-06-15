// ===================================================================
// ShopSphere SQL Course — TypeScript Type Definitions
// ===================================================================

// -------------------------------------------------------------------
// Core SQL Types
// -------------------------------------------------------------------

export type ColumnType = "TEXT" | "NUMBER" | "DATE" | "BOOL" | "NULL" | "UNKNOWN";

export interface Column {
  name: string;
  type: ColumnType;
}

/** A single cell value in a query result row */
export type CellValue = string | number | boolean | null;

/** A row is a record of column name -> cell value */
export type Row = Record<string, CellValue>;

// -------------------------------------------------------------------
// Exercise Types
// -------------------------------------------------------------------

export type Difficulty = "easy" | "medium" | "hard";
export type ExerciseStatus = "not_started" | "in_progress" | "completed";
export type ValidationMode = "exact_ordered" | "exact_unordered" | "schema_match";

export interface Hint {
  /** Zero-indexed level: 0 = conceptual, 1 = syntactic, 2 = near-solution */
  level: 0 | 1 | 2;
  /** Human-readable label for the hint level */
  levelLabel: "Conceptual" | "Sintáctico" | "Casi la solución";
  /** XP cost to reveal this hint */
  xpCost: number;
  /** The hint content */
  content: string;
}

export interface ShopSphereCharacter {
  id: string;
  name: string;
  role: string;
  /** Path to avatar image or initials for fallback */
  avatarUrl?: string;
  /** Initials for avatar fallback */
  initials: string;
  /** Background color for avatar (Tailwind class) */
  avatarColor: string;
}

export interface Exercise {
  id: string;
  levelId: number;
  title: string;
  /** Narrative context — written in-character from a ShopSphere employee */
  briefing: string;
  /** Technical instructions for the student */
  instructions: string;
  difficulty: Difficulty;
  /** XP awarded for correct answer (full points, no hints) */
  xpReward: number;
  /** Hints in order of increasing specificity */
  hints: Hint[];
  /** Character who "assigned" this exercise */
  character: ShopSphereCharacter;
  /** Initial SQL query to show in the editor */
  initialQuery?: string;
  validationMode: ValidationMode;
  orderIndex: number;
}

// -------------------------------------------------------------------
// Query Result Types
// -------------------------------------------------------------------

export interface QueryResult {
  columns: Column[];
  rows: Row[];
  totalRows: number;
  /** Execution time in milliseconds (client-side WASM) */
  executionMs?: number;
}

export type PlaygroundStatus = "idle" | "running" | "success" | "error";

// -------------------------------------------------------------------
// Validation Types
// -------------------------------------------------------------------

export type ValidationErrorType =
  | "extra_rows"       // Student returned more rows than expected
  | "missing_rows"     // Student returned fewer rows than expected
  | "wrong_columns"    // Column names or types don't match
  | "wrong_order"      // Rows are correct but order is wrong (for exact_ordered)
  | "wrong_types"      // Data types don't match
  | "syntax_error"     // SQL syntax error
  | "execution_error"  // Runtime SQL error
  | "timeout"          // Query took too long
  | "unknown";         // Unexpected error

export interface ValidationResult {
  valid: boolean;
  /** XP points earned (0 if invalid or previously completed) */
  xpEarned: number;
  errorType?: ValidationErrorType;
  /** Human-friendly error message for the student */
  userMessage?: string;
  /** Raw SQL error message (if applicable) */
  technicalMessage?: string;
  /** Hint level to auto-show after N failed attempts */
  hintLevel?: 0 | 1 | 2;
  /** Row counts for feedback */
  rowCountGot?: number;
  rowCountExpected?: number;
}

// -------------------------------------------------------------------
// User Progress Types
// -------------------------------------------------------------------

export interface UserExerciseProgress {
  exerciseId: string;
  status: ExerciseStatus;
  attemptsCount: number;
  hintsUsed: number;
  xpEarned: number;
  /** Last saved query draft */
  lastQuery?: string;
  completedAt?: Date;
}

export interface UserLevel {
  /** 0-10 */
  currentLevel: number;
  xpTotal: number;
  xpForCurrentLevel: number;
  xpForNextLevel: number;
}

// -------------------------------------------------------------------
// Component Prop Types
// -------------------------------------------------------------------

export interface SQLEditorProps {
  value: string;
  onChange: (value: string) => void;
  onExecute: () => void;
  readOnly?: boolean;
  placeholder?: string;
  height?: string;
}

export interface ResultsTableProps {
  columns: Column[];
  rows: Row[];
  totalRows: number;
  error?: string;
  isLoading?: boolean;
  /** Max rows to display per page */
  pageSize?: number;
}

export interface HintPanelProps {
  hints: Hint[];
  hintsUsed: number;
  maxHints: number;
  onRequestHint: () => void;
  /** Whether hints panel is expanded */
  expanded?: boolean;
}

export interface PlaygroundContainerProps {
  exerciseId: string;
  onSubmit: (query: string) => void;
  initialQuery?: string;
  /** Called when user resets the dataset (reload from WASM) */
  onReset?: () => void;
  /** Called when user clicks the hint button in the action bar */
  onHint?: () => void;
}

// -------------------------------------------------------------------
// Mock Data Types (dev only)
// -------------------------------------------------------------------

export interface MockExercise extends Exercise {
  /** Expected result for client-side mock validation */
  _mockExpectedResult?: QueryResult;
}
