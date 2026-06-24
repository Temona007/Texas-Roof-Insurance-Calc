/**
 * Calculator configuration — editable by your team (WordPress plugin or embed can load this).
 * Update labels, formulas, explanations, and disclaimers without touching core logic.
 */
const CALC_CONFIG = {
  brand: {
    name: 'Texas Roof Insurance Calculator',
    tagline: 'Understand your deductible, depreciation, and out-of-pocket costs',
  },

  labels: {
    replacementCost: 'Insurance-approved replacement cost (RCV)',
    settlementType: 'Policy settlement type',
    settlementRcv: 'Replacement cost value (RCV)',
    settlementAcv: 'Actual cash value (ACV)',
    settlementUnsure: 'Unsure — show both scenarios',
    deductibleType: 'Deductible type',
    deductibleFlat: 'Flat-dollar deductible',
    deductibleTypePercent: 'Percentage deductible',
    flatDeductible: 'Flat deductible amount',
    coverageA: 'Dwelling coverage (Coverage A)',
    deductiblePercent: 'Deductible percentage',
    totalDepreciation: 'Total depreciation',
    recoverableDepreciation: 'Recoverable depreciation',
    nonrecoverableDepreciation: 'Nonrecoverable depreciation',
    contractorPrice: 'Contractor price',
    optionalUpgrades: 'Optional upgrades',
    uncoveredWork: 'Uncovered / non-covered items',
    paymentsReceived: 'Insurance payments already received',
    calculate: 'Calculate my estimate',
    reset: 'Reset',
    loadDemo: 'Load demo data',
  },

  helpText: {
    replacementCost: 'The amount your insurer approved for the roof replacement.',
    settlementType: 'RCV policies may pay recoverable depreciation later. ACV policies typically do not.',
    deductibleType: 'Check your declarations page for a flat amount or a percentage of Coverage A.',
    totalDepreciation: 'Total depreciation on your claim estimate or adjuster worksheet.',
    recoverableDepreciation: 'Depreciation your insurer may pay after work is complete and documented.',
    nonrecoverableDepreciation: 'Depreciation you may not recover, depending on policy and age.',
    contractorPrice: 'Your contractor\'s total bid for the roof project.',
    optionalUpgrades: 'Optional improvements not covered by insurance (e.g., better shingles).',
    uncoveredWork: 'Work or items your policy does not cover.',
    paymentsReceived: 'Any claim checks or payments you have already received.',
  },

  formulas: {
    // Expression strings evaluated safely via custom parser (see calculator.js)
    acv: 'rcv - totalDepreciation',
    initialPayment: 'acv - deductible',
    finalInsuranceRcv: 'rcv - deductible - nonrecoverableDepreciation',
    finalInsuranceAcv: 'rcv - totalDepreciation - deductible',
    homeownerResponsibility: 'contractorPrice - finalInsuranceContribution',
    dueBeforeRecoverable: 'contractorPrice - initialPayment - paymentsReceived',
    dueAfterAllPayments: 'contractorPrice - finalInsuranceContribution - paymentsReceived',
  },

  explanations: {
    initialPayment:
      'This is typically what the insurer may pay first: actual cash value minus your deductible.',
    recoverableDepreciation:
      'If your policy includes replacement cost coverage, this amount may be paid after completion and proof of work.',
    nonrecoverableDepreciation:
      'Some depreciation may never be recoverable based on policy terms, roof age, or endorsements.',
    homeownerResponsibility:
      'Estimated gap between your contractor price and total expected insurance contribution, plus upgrades and uncovered items.',
    unsureNote:
      'Because you selected "Unsure," we show estimates for both RCV and ACV settlement types.',
  },

  disclaimers: [
    'This calculator provides estimates for educational purposes only and is not insurance or legal advice.',
    'Actual claim payments depend on your policy, endorsements, adjuster findings, and insurer procedures.',
    'Consult your insurance agent, adjuster, or contractor for amounts specific to your claim.',
  ],

  warnings: {
    depreciationMismatch:
      'Recoverable plus nonrecoverable depreciation does not equal total depreciation. Please verify your numbers.',
    depreciationExceedsTotal:
      'Recoverable and nonrecoverable depreciation exceed total depreciation.',
    contractorBelowRcv:
      'Contractor price is below the insurance-approved replacement cost. You may have room in the claim.',
    contractorAboveRcv:
      'Contractor price exceeds the insurance-approved amount. You may owe the difference out of pocket.',
    missingFields:
      'Some fields are empty. Results may be incomplete until required information is entered.',
    negativePrevented:
      'Some values were adjusted to zero to prevent negative amounts in the estimate.',
  },

  analytics: {
    gtmContainerId: 'GTM-XXXXXXX', // Replace with your GTM container ID
    events: {
      calculate: 'calculator_calculate',
      reset: 'calculator_reset',
      loadDemo: 'calculator_load_demo',
      warningShown: 'calculator_warning',
    },
  },

  demoDataId: 'demo-tx-home-2024',
};
