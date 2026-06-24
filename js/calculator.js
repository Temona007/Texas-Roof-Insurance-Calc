/**
 * Core calculation engine with safeguards.
 */

function clampNonNegative(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, n);
}

function parseMoney(value) {
  if (value === '' || value === null || value === undefined) return null;
  const cleaned = String(value).replace(/[^0-9.-]/g, '');
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : null;
}

function formatCurrency(amount) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(clampNonNegative(amount));
}

function evaluateFormula(formulaKey, vars, config) {
  const expr = config.formulas[formulaKey];
  if (!expr) return 0;

  const tokens = expr.replace(/\s+/g, '');
  const parts = tokens.split(/([+\-])/);
  let total = 0;
  let op = '+';

  for (const part of parts) {
    if (part === '+' || part === '-') {
      op = part;
      continue;
    }
    const val = clampNonNegative(vars[part] ?? 0);
    total = op === '+' ? total + val : total - val;
  }

  return clampNonNegative(total);
}

function computeDeductible(input) {
  if (input.deductibleType === 'flat') {
    return clampNonNegative(input.flatDeductible ?? 0);
  }
  const coverage = clampNonNegative(input.coverageA ?? 0);
  const pct = clampNonNegative(input.deductiblePercent ?? 0);
  return clampNonNegative((coverage * pct) / 100);
}

function buildWarnings(input, derived) {
  const warnings = [];
  const config = CALC_CONFIG;

  const missing = [];
  if (input.replacementCost === null) missing.push('replacement cost');
  if (input.contractorPrice === null) missing.push('contractor price');
  if (missing.length) {
    warnings.push({ type: 'missing', message: config.warnings.missingFields });
  }

  const totalDep = clampNonNegative(input.totalDepreciation ?? 0);
  const rec = clampNonNegative(input.recoverableDepreciation ?? 0);
  const nonrec = clampNonNegative(input.nonrecoverableDepreciation ?? 0);

  if (totalDep > 0 && Math.abs(rec + nonrec - totalDep) > 1) {
    warnings.push({ type: 'depreciation', message: config.warnings.depreciationMismatch });
  }

  if (rec + nonrec > totalDep + 1 && totalDep >= 0) {
    warnings.push({ type: 'depreciation-exceed', message: config.warnings.depreciationExceedsTotal });
  }

  const rcv = clampNonNegative(input.replacementCost ?? 0);
  const contractor = clampNonNegative(input.contractorPrice ?? 0);

  if (rcv > 0 && contractor > 0) {
    if (contractor < rcv * 0.95) {
      warnings.push({ type: 'contractor-low', message: config.warnings.contractorBelowRcv });
    } else if (contractor > rcv * 1.05) {
      warnings.push({ type: 'contractor-high', message: config.warnings.contractorAboveRcv });
    }
  }

  if (derived.hadNegativeAdjustment) {
    warnings.push({ type: 'negative', message: config.warnings.negativePrevented });
  }

  return warnings;
}

function computeScenario(input, settlementType) {
  const rcv = clampNonNegative(input.replacementCost ?? 0);
  const totalDepreciation = clampNonNegative(input.totalDepreciation ?? 0);
  const recoverableDepreciation = clampNonNegative(input.recoverableDepreciation ?? 0);
  const nonrecoverableDepreciation = clampNonNegative(input.nonrecoverableDepreciation ?? 0);
  const contractorPrice = clampNonNegative(input.contractorPrice ?? 0);
  const optionalUpgrades = clampNonNegative(input.optionalUpgrades ?? 0);
  const uncoveredWork = clampNonNegative(input.uncoveredWork ?? 0);
  const paymentsReceived = clampNonNegative(input.paymentsReceived ?? 0);

  const deductible = computeDeductible(input);

  const vars = {
    rcv,
    totalDepreciation,
    recoverableDepreciation,
    nonrecoverableDepreciation,
    contractorPrice,
    optionalUpgrades,
    uncoveredWork,
    paymentsReceived,
    deductible,
  };

  vars.acv = evaluateFormula('acv', vars, CALC_CONFIG);
  vars.initialPayment = evaluateFormula('initialPayment', vars, CALC_CONFIG);

  if (settlementType === 'acv') {
    vars.finalInsuranceContribution = evaluateFormula('finalInsuranceAcv', vars, CALC_CONFIG);
    vars.recoverableShown = 0;
  } else {
    vars.finalInsuranceContribution = evaluateFormula('finalInsuranceRcv', vars, CALC_CONFIG);
    vars.recoverableShown = recoverableDepreciation;
  }

  vars.homeownerResponsibility = evaluateFormula('homeownerResponsibility', vars, CALC_CONFIG);
  vars.dueBeforeRecoverable = evaluateFormula('dueBeforeRecoverable', vars, CALC_CONFIG);
  vars.dueAfterAllPayments = evaluateFormula('dueAfterAllPayments', vars, CALC_CONFIG);

  // Detailed breakdown additions
  const rcvGap = clampNonNegative(contractorPrice - rcv);
  vars.breakdown = {
    deductible,
    nonrecoverableDepreciation: settlementType === 'acv' ? totalDepreciation : nonrecoverableDepreciation,
    optionalUpgrades,
    uncoveredWork,
    rcvGap,
    paymentsReceivedCredit: paymentsReceived,
    recoverableDepreciation: vars.recoverableShown,
  };

  // Enriched homeowner responsibility including explicit add-ons
  vars.detailedHomeownerTotal =
    vars.homeownerResponsibility + optionalUpgrades + uncoveredWork + rcvGap;

  const rawInitial = (input.replacementCost ?? 0) - totalDepreciation - deductible;
  const hadNegativeAdjustment =
    rawInitial < 0 ||
    vars.finalInsuranceContribution !==
      (settlementType === 'acv'
        ? rcv - totalDepreciation - deductible
        : rcv - deductible - nonrecoverableDepreciation);

  return { ...vars, settlementType, hadNegativeAdjustment: rawInitial < 0 };
}

function calculateFromForm(formData) {
  const input = {
    replacementCost: parseMoney(formData.replacementCost),
    settlementType: formData.settlementType || 'rcv',
    deductibleType: formData.deductibleType || 'flat',
    flatDeductible: parseMoney(formData.flatDeductible),
    coverageA: parseMoney(formData.coverageA),
    deductiblePercent: parseMoney(formData.deductiblePercent),
    totalDepreciation: parseMoney(formData.totalDepreciation),
    recoverableDepreciation: parseMoney(formData.recoverableDepreciation),
    nonrecoverableDepreciation: parseMoney(formData.nonrecoverableDepreciation),
    contractorPrice: parseMoney(formData.contractorPrice),
    optionalUpgrades: parseMoney(formData.optionalUpgrades),
    uncoveredWork: parseMoney(formData.uncoveredWork),
    paymentsReceived: parseMoney(formData.paymentsReceived),
  };

  const scenarios = [];
  if (input.settlementType === 'unsure') {
    scenarios.push(computeScenario(input, 'rcv'));
    scenarios.push(computeScenario(input, 'acv'));
  } else {
    scenarios.push(computeScenario(input, input.settlementType));
  }

  const warnings = buildWarnings(input, {
    hadNegativeAdjustment: scenarios.some((s) => s.hadNegativeAdjustment),
  });

  return { input, scenarios, warnings };
}
