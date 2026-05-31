import { AppData, DecisionMatrix } from "../types";
import { rankMatrixOptions, topMatrices } from "./scoring";

const escapeCsv = (value: unknown) => {
  const text = Array.isArray(value) ? value.join("; ") : String(value ?? "");
  return `"${text.replaceAll('"', '""')}"`;
};

export const toCsv = (rows: Record<string, unknown>[]) => {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0]);
  return [headers.map(escapeCsv).join(","), ...rows.map((row) => headers.map((header) => escapeCsv(row[header])).join(","))].join("\n");
};

export const matrixSummaryRows = (matrices: DecisionMatrix[]) =>
  matrices.map((matrix) => {
    const leader = rankMatrixOptions(matrix)[0];
    return {
      title: matrix.title,
      category: matrix.category,
      leadingOption: leader?.option.name ?? "No options",
      leadingScore: leader ? leader.total.toFixed(2) : "N/A",
      criteria: matrix.criteria.map((criterion) => `${criterion.name} (${criterion.weight})`).join("; "),
    };
  });

export const buildExportPackage = (data: AppData) => {
  const approvedDecisions = data.decisions.filter((decision) => decision.status === "Approved");
  const openDecisions = data.decisions.filter((decision) => decision.status !== "Approved" && decision.status !== "Retired");
  const coveredRequirements = data.requirements.filter((requirement) => requirement.linkedTestIds.length && requirement.linkedDecisionIds.length);
  const partialRequirements = data.requirements.filter(
    (requirement) => !coveredRequirements.includes(requirement) && (requirement.linkedTestIds.length || requirement.linkedDecisionIds.length || requirement.linkedRiskIds.length),
  );
  const openRisks = data.risks.filter((risk) => risk.status !== "Complete" && risk.status !== "Retired");

  const executiveSummary = [
    `HERO Rover currently tracks ${data.research.length} research sources, ${data.decisions.length} decisions, ${data.matrices.length} decision matrices, ${data.requirements.length} requirements, ${data.tests.length} tests, and ${data.risks.length} risks.`,
    `${approvedDecisions.length} decisions are approved and ${openDecisions.length} remain open or under review.`,
    `${coveredRequirements.length} requirements are covered by both decisions and tests; ${partialRequirements.length} are partially covered.`,
  ].join(" ");

  const markdown = [
    "# HERO Rover DRR/CDR Export",
    "",
    "## Executive Summary",
    executiveSummary,
    "",
    "## Approved Decisions",
    ...approvedDecisions.map((decision) => `- **${decision.title}**: ${decision.decision}`),
    "",
    "## Open Decisions",
    ...openDecisions.map((decision) => `- **${decision.title}** (${decision.status}, ${decision.owner})`),
    "",
    "## Top Decision Matrices",
    ...topMatrices(data.matrices).map(({ matrix, leader }) => `- **${matrix.title}**: ${leader.option.name} leads with ${leader.total.toFixed(2)}/5 weighted score.`),
    "",
    "## Requirements Coverage Summary",
    `- Covered: ${coveredRequirements.length}`,
    `- Partially covered: ${partialRequirements.length}`,
    `- Uncovered: ${data.requirements.length - coveredRequirements.length - partialRequirements.length}`,
    "",
    "## Test Evidence Summary",
    ...data.tests.map((test) => `- **${test.title}**: ${test.passFail} (${test.date})`),
    "",
    "## Open Risks Summary",
    ...openRisks.map((risk) => `- **${risk.title}**: L${risk.likelihood} x I${risk.impact}; ${risk.mitigation}`),
    "",
    "## Source Bibliography",
    ...data.research.map((entry) => `- ${entry.sourceTitle}. ${entry.sourceUrl}. Notes: ${entry.citationNotes}`),
  ].join("\n");

  return {
    executiveSummary,
    approvedDecisions,
    openDecisions,
    matrixRows: matrixSummaryRows(data.matrices),
    coveredRequirements,
    partialRequirements,
    openRisks,
    markdown,
    csv: {
      research: toCsv(data.research as unknown as Record<string, unknown>[]),
      decisions: toCsv(data.decisions as unknown as Record<string, unknown>[]),
      requirements: toCsv(data.requirements as unknown as Record<string, unknown>[]),
      tests: toCsv(data.tests as unknown as Record<string, unknown>[]),
      risks: toCsv(data.risks as unknown as Record<string, unknown>[]),
      matrices: toCsv(matrixSummaryRows(data.matrices)),
    },
  };
};
