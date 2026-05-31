import { AppData, DecisionMatrix } from "../types";

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const requireArray = (value: unknown, name: string, errors: string[]) => {
  if (!Array.isArray(value)) errors.push(`${name} must be an array.`);
};

export const validateAppData = (value: unknown): ValidationResult => {
  const errors: string[] = [];
  if (!isObject(value)) return { valid: false, errors: ["Backup must be a JSON object."] };

  ["research", "decisions", "requirements", "tests", "risks", "matrices"].forEach((key) =>
    requireArray(value[key], key, errors),
  );

  if (Array.isArray(value.matrices)) {
    value.matrices.forEach((matrix, index) => {
      if (!isObject(matrix)) {
        errors.push(`matrices[${index}] must be an object.`);
        return;
      }
      if (typeof matrix.id !== "string" || !matrix.id) errors.push(`matrices[${index}] is missing id.`);
      if (typeof matrix.title !== "string" || !matrix.title) errors.push(`matrices[${index}] is missing title.`);
      requireArray(matrix.criteria, `matrices[${index}].criteria`, errors);
      requireArray(matrix.options, `matrices[${index}].options`, errors);
    });
  }

  return { valid: errors.length === 0, errors };
};

export const validateRequired = (fields: Record<string, string | undefined>) =>
  Object.entries(fields)
    .filter(([, value]) => !value?.trim())
    .map(([key]) => `${key} is required.`);

export const normalizeMatrixScores = (matrix: DecisionMatrix): DecisionMatrix => ({
  ...matrix,
  options: matrix.options.map((option) => ({
    ...option,
    scores: {
      ...Object.fromEntries(matrix.criteria.map((criterion) => [criterion.id, 3])),
      ...option.scores,
    },
  })),
});

export const isAppData = (value: unknown): value is AppData => validateAppData(value).valid;
