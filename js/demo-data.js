/**
 * Demo dataset — simulates stored scenarios (WordPress would load from DB).
 */
const DEMO_SCENARIOS = {
  'demo-tx-home-2024': {
    id: 'demo-tx-home-2024',
    name: 'Typical Texas hail claim (RCV, 1% deductible)',
    description: 'Example: $28,000 approved RCV, 1% wind/hail deductible on $450k Coverage A.',
    values: {
      replacementCost: 28000,
      settlementType: 'rcv',
      deductibleType: 'percent',
      flatDeductible: 2500,
      coverageA: 450000,
      deductiblePercent: 1,
      totalDepreciation: 8400,
      recoverableDepreciation: 5600,
      nonrecoverableDepreciation: 2800,
      contractorPrice: 29500,
      optionalUpgrades: 1200,
      uncoveredWork: 350,
      paymentsReceived: 0,
    },
  },
  'demo-acv-policy': {
    id: 'demo-acv-policy',
    name: 'ACV policy example',
    description: 'Actual cash value settlement with flat $2,500 deductible.',
    values: {
      replacementCost: 22000,
      settlementType: 'acv',
      deductibleType: 'flat',
      flatDeductible: 2500,
      coverageA: 320000,
      deductiblePercent: 2,
      totalDepreciation: 6600,
      recoverableDepreciation: 0,
      nonrecoverableDepreciation: 6600,
      contractorPrice: 23500,
      optionalUpgrades: 0,
      uncoveredWork: 200,
      paymentsReceived: 12800,
    },
  },
  'demo-unsure': {
    id: 'demo-unsure',
    name: 'Homeowner unsure of policy type',
    description: 'Shows side-by-side RCV vs ACV when settlement type is unknown.',
    values: {
      replacementCost: 31500,
      settlementType: 'unsure',
      deductibleType: 'percent',
      flatDeductible: 1000,
      coverageA: 525000,
      deductiblePercent: 2,
      totalDepreciation: 9450,
      recoverableDepreciation: 6300,
      nonrecoverableDepreciation: 3150,
      contractorPrice: 33000,
      optionalUpgrades: 800,
      uncoveredWork: 0,
      paymentsReceived: 0,
    },
  },
};

function getDemoScenario(id) {
  return DEMO_SCENARIOS[id] || DEMO_SCENARIOS[CALC_CONFIG.demoDataId];
}

function listDemoScenarios() {
  return Object.values(DEMO_SCENARIOS);
}
