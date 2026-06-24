/**
 * UI controller, analytics hooks, and form handling.
 */

(function initApp() {
  const form = document.getElementById('calc-form');
  const resultsEl = document.getElementById('results');
  const warningsEl = document.getElementById('warnings');
  const demoSelect = document.getElementById('demo-select');
  const deductibleFlatGroup = document.getElementById('group-flat-deductible');
  const deductiblePercentGroup = document.getElementById('group-percent-deductible');
  const coverageGroup = document.getElementById('group-coverage-a');

  applyConfigLabels();
  populateDemoSelect();
  toggleDeductibleFields();
  initGTM();

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    runCalculation();
  });

  form.addEventListener('reset', () => {
    setTimeout(() => {
      resultsEl.hidden = true;
      warningsEl.hidden = true;
      toggleDeductibleFields();
      trackEvent(CALC_CONFIG.analytics.events.reset);
    }, 0);
  });

  document.getElementById('btn-load-demo').addEventListener('click', loadSelectedDemo);

  form.deductibleType.addEventListener('change', toggleDeductibleFields);

  // Auto-sync nonrecoverable when total and recoverable change
  ['totalDepreciation', 'recoverableDepreciation'].forEach((name) => {
    form.elements[name].addEventListener('input', syncNonrecoverable);
  });

  function applyConfigLabels() {
    const L = CALC_CONFIG.labels;
    document.querySelectorAll('[data-label]').forEach((el) => {
      const key = el.dataset.label;
      if (L[key]) el.textContent = L[key];
    });
    document.getElementById('brand-name').textContent = CALC_CONFIG.brand.name;
    document.getElementById('brand-tagline').textContent = CALC_CONFIG.brand.tagline;

    const disclaimerList = document.getElementById('disclaimers');
    disclaimerList.innerHTML = CALC_CONFIG.disclaimers.map((d) => `<li>${d}</li>`).join('');
  }

  function populateDemoSelect() {
    listDemoScenarios().forEach((scenario) => {
      const opt = document.createElement('option');
      opt.value = scenario.id;
      opt.textContent = scenario.name;
      demoSelect.appendChild(opt);
    });
    demoSelect.value = CALC_CONFIG.demoDataId;
  }

  function toggleDeductibleFields() {
    const type = form.deductibleType.value;
    const isFlat = type === 'flat';
    deductibleFlatGroup.hidden = !isFlat;
    deductiblePercentGroup.hidden = isFlat;
    coverageGroup.hidden = isFlat;
    deductibleFlatGroup.querySelector('input').required = isFlat;
    deductiblePercentGroup.querySelector('input').required = !isFlat;
    coverageGroup.querySelector('input').required = !isFlat;
  }

  function syncNonrecoverable() {
    const total = parseMoney(form.totalDepreciation.value) ?? 0;
    const rec = parseMoney(form.recoverableDepreciation.value) ?? 0;
    if (total >= rec) {
      form.nonrecoverableDepreciation.value = Math.max(0, total - rec);
    }
  }

  function getFormData() {
    return {
      replacementCost: form.replacementCost.value,
      settlementType: form.settlementType.value,
      deductibleType: form.deductibleType.value,
      flatDeductible: form.flatDeductible.value,
      coverageA: form.coverageA.value,
      deductiblePercent: form.deductiblePercent.value,
      totalDepreciation: form.totalDepreciation.value,
      recoverableDepreciation: form.recoverableDepreciation.value,
      nonrecoverableDepreciation: form.nonrecoverableDepreciation.value,
      contractorPrice: form.contractorPrice.value,
      optionalUpgrades: form.optionalUpgrades.value,
      uncoveredWork: form.uncoveredWork.value,
      paymentsReceived: form.paymentsReceived.value,
    };
  }

  function fillForm(values) {
    Object.entries(values).forEach(([key, val]) => {
      if (form.elements[key]) form.elements[key].value = val ?? '';
    });
    toggleDeductibleFields();
  }

  function loadSelectedDemo() {
    const scenario = getDemoScenario(demoSelect.value);
    fillForm(scenario.values);
    trackEvent(CALC_CONFIG.analytics.events.loadDemo, { scenario_id: scenario.id });
    runCalculation();
  }

  function runCalculation() {
    const result = calculateFromForm(getFormData());
    renderWarnings(result.warnings);
    renderResults(result);
    trackEvent(CALC_CONFIG.analytics.events.calculate, {
      settlement_type: result.input.settlementType,
      deductible_type: result.input.deductibleType,
      scenario_count: result.scenarios.length,
      warning_count: result.warnings.length,
    });
    result.warnings.forEach((w) => {
      trackEvent(CALC_CONFIG.analytics.events.warningShown, { warning_type: w.type });
    });

    resultsEl.hidden = false;
    resultsEl.classList.remove('results-enter');
    void resultsEl.offsetWidth;
    resultsEl.classList.add('results-enter');
    resultsEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function renderWarnings(warnings) {
    if (!warnings.length) {
      warningsEl.hidden = true;
      warningsEl.innerHTML = '';
      return;
    }
    warningsEl.hidden = false;
    warningsEl.innerHTML = warnings
      .map((w) => `<div class="warning-item" role="alert">${w.message}</div>`)
      .join('');
  }

  function renderResults(result) {
    const E = CALC_CONFIG.explanations;
    const cards = result.scenarios
      .map((s) => renderScenarioCard(s, result.input.settlementType === 'unsure'))
      .join('');

    const unsureNote =
      result.input.settlementType === 'unsure'
        ? `<p class="unsure-note">${E.unsureNote}</p>`
        : '';

    resultsEl.innerHTML = `
      ${unsureNote}
      <div class="results-grid ${result.scenarios.length > 1 ? 'results-grid--dual' : ''}">
        ${cards}
      </div>
      <section class="assumptions" aria-labelledby="assumptions-heading">
        <h3 id="assumptions-heading">Assumptions &amp; explanations</h3>
        <ul>
          <li><strong>Initial payment:</strong> ${E.initialPayment}</li>
          <li><strong>Recoverable depreciation:</strong> ${E.recoverableDepreciation}</li>
          <li><strong>Nonrecoverable depreciation:</strong> ${E.nonrecoverableDepreciation}</li>
          <li><strong>Homeowner responsibility:</strong> ${E.homeownerResponsibility}</li>
        </ul>
      </section>
    `;
  }

  function renderScenarioCard(s, showLabel) {
    const title =
      showLabel
        ? s.settlementType === 'rcv'
          ? 'Replacement cost (RCV) estimate'
          : 'Actual cash value (ACV) estimate'
        : 'Your estimate';

    const b = s.breakdown;

    return `
      <article class="result-card">
        <header class="result-card__header">
          <h3>${title}</h3>
        </header>
        <div class="result-highlight">
          <div class="result-highlight__item result-highlight__item--primary">
            <span class="result-label">Est. homeowner responsibility</span>
            <span class="result-value">${formatCurrency(s.detailedHomeownerTotal)}</span>
          </div>
          <div class="result-highlight__row">
            <div class="result-highlight__item">
              <span class="result-label">Due before recoverable released</span>
              <span class="result-value result-value--secondary">${formatCurrency(s.dueBeforeRecoverable + (b.optionalUpgrades + b.uncoveredWork))}</span>
            </div>
            <div class="result-highlight__item">
              <span class="result-label">Due after all expected payments</span>
              <span class="result-value result-value--secondary">${formatCurrency(s.dueAfterAllPayments + (b.optionalUpgrades + b.uncoveredWork))}</span>
            </div>
          </div>
        </div>
        <dl class="result-breakdown">
          <div class="result-row"><dt>Calculated deductible</dt><dd>${formatCurrency(s.deductible)}</dd></div>
          <div class="result-row"><dt>Actual cash value (ACV)</dt><dd>${formatCurrency(s.acv)}</dd></div>
          <div class="result-row result-row--highlight"><dt>Est. initial insurance payment</dt><dd>${formatCurrency(s.initialPayment)}</dd></div>
          <div class="result-row"><dt>Recoverable depreciation (later)</dt><dd>${formatCurrency(b.recoverableDepreciation)}</dd></div>
          <div class="result-row"><dt>Nonrecoverable depreciation</dt><dd>${formatCurrency(b.nonrecoverableDepreciation)}</dd></div>
          <div class="result-row result-row--total"><dt>Est. total insurance contribution</dt><dd>${formatCurrency(s.finalInsuranceContribution)}</dd></div>
        </dl>
        <details class="detail-breakdown">
          <summary>Detailed homeowner breakdown</summary>
          <dl class="result-breakdown result-breakdown--nested">
            <div class="result-row"><dt>Deductible</dt><dd>${formatCurrency(b.deductible)}</dd></div>
            <div class="result-row"><dt>Nonrecoverable depreciation</dt><dd>${formatCurrency(b.nonrecoverableDepreciation)}</dd></div>
            <div class="result-row"><dt>Optional upgrades</dt><dd>${formatCurrency(b.optionalUpgrades)}</dd></div>
            <div class="result-row"><dt>Uncovered items</dt><dd>${formatCurrency(b.uncoveredWork)}</dd></div>
            <div class="result-row"><dt>Contractor price above approved RCV</dt><dd>${formatCurrency(b.rcvGap)}</dd></div>
            <div class="result-row"><dt>Payments already received (credit)</dt><dd>−${formatCurrency(b.paymentsReceivedCredit)}</dd></div>
          </dl>
        </details>
      </article>
    `;
  }

  function initGTM() {
    const id = CALC_CONFIG.analytics.gtmContainerId;
    if (!id || id === 'GTM-XXXXXXX') return;

    window.dataLayer = window.dataLayer || [];
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtm.js?id=${id}`;
    document.head.appendChild(script);

    const noscript = document.createElement('noscript');
    noscript.innerHTML = `<iframe src="https://www.googletagmanager.com/ns.html?id=${id}" height="0" width="0" style="display:none;visibility:hidden"></iframe>`;
    document.body.prepend(noscript);
  }

  function trackEvent(eventName, params = {}) {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({
      event: eventName,
      calculator: 'roof_insurance_oop',
      ...params,
    });
  }
})();
