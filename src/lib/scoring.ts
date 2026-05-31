import { DecisionMatrix, MatrixOption } from "../types";

export interface MatrixRankingRow {
  option: MatrixOption;
  total: number;
  normalizedTotal: number;
  rank: number;
}

export const clampScore = (score: number) => Math.min(5, Math.max(1, Math.round(score || 1)));

export const calculateOptionTotal = (matrix: DecisionMatrix, option: MatrixOption) => {
  const weightTotal = matrix.criteria.reduce((sum, criterion) => sum + Number(criterion.weight || 0), 0) || 1;
  return matrix.criteria.reduce((sum, criterion) => {
    const score = clampScore(option.scores[criterion.id] ?? 1);
    return sum + score * (Number(criterion.weight || 0) / weightTotal);
  }, 0);
};

export const rankMatrixOptions = (matrix: DecisionMatrix): MatrixRankingRow[] => {
  const ranked = matrix.options
    .map((option) => {
      const total = calculateOptionTotal(matrix, option);
      return {
        option,
        total,
        normalizedTotal: (total / 5) * 100,
        rank: 0,
      };
    })
    .sort((a, b) => b.total - a.total);

  return ranked.map((row, index) => ({ ...row, rank: index + 1 }));
};

export const topMatrices = (matrices: DecisionMatrix[], limit = 4) =>
  matrices
    .map((matrix) => ({
      matrix,
      leader: rankMatrixOptions(matrix)[0],
    }))
    .filter((entry) => entry.leader)
    .slice(0, limit);
