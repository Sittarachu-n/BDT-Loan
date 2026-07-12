const assert = require("node:assert/strict");

const loanTypes = {
  "1.1": { max: 50000, baseTerm: 24, annualRate: 3 },
  "1.2": { max: 60000, baseTerm: 36, annualRate: 3 },
  "1.3": { max: 50000, baseTerm: 24, annualRate: 3 },
  "1.4": { max: 50000, baseTerm: 24, annualRate: 3 },
  "1.5": { max: 10000, baseTerm: 5, annualRate: 5 },
  "1.6": { max: 50000, baseTerm: 24, annualRate: 3 },
};

function maxNewPaymentFromSalary(salaryRemaining, currentMonthlyPayment) {
  return Math.max(0, Math.floor((salaryRemaining / 3) - currentMonthlyPayment));
}

function maxTermForLoan(typeKey, amount) {
  if (typeKey === "1.2") return amount > 30000 ? 36 : 24;
  return loanTypes[typeKey].baseTerm;
}

function principalOnlyCapacity(payment, months) {
  return Math.floor(Math.max(0, payment) * Math.max(1, months));
}

function principalOnlyPayment(principal, months) {
  if (principal <= 0) return 0;
  return Math.ceil(principal / Math.max(1, months));
}

function preliminaryEligibleAmount(desiredMonthlyPayment, months, employeeRemaining, typeRemainingTotal) {
  return Math.floor(Math.min(
    principalOnlyCapacity(desiredMonthlyPayment, months),
    Math.max(0, employeeRemaining),
    Math.max(0, typeRemainingTotal)
  ));
}

function resolveDesiredMonthlyPayment(maxNewPaymentLimit, desiredPaymentRaw, paymentBaseInputActive) {
  return maxNewPaymentLimit > 0
    ? Math.min(maxNewPaymentLimit, desiredPaymentRaw > 0 ? desiredPaymentRaw : paymentBaseInputActive ? 0 : maxNewPaymentLimit)
    : 0;
}

function salaryEstimateForType(typeKey, maxNewPayment, months, currentLoans = {}) {
  const loanType = loanTypes[typeKey];
  const maxTerm = maxTermForLoan(typeKey, loanType.max);
  const termValid = months <= maxTerm;
  const typeRemaining = Math.max(0, loanType.max - (currentLoans[typeKey] || 0));
  const salaryCapacity = termValid ? principalOnlyCapacity(maxNewPayment, months) : 0;
  const eligible = Math.floor(Math.min(typeRemaining, salaryCapacity));
  const payment = principalOnlyPayment(eligible, months);

  return { termValid, eligible, payment };
}

assert.equal(maxNewPaymentFromSalary(10000, 0), 3333);
assert.equal(maxNewPaymentFromSalary(10000, 1000), 2333);
assert.equal(maxNewPaymentFromSalary(1000, 1000), 0);

assert.equal(principalOnlyPayment(24000, 24), 1000);
assert.equal(principalOnlyPayment(24001, 24), 1001);
assert.equal(principalOnlyCapacity(1000, 24), 24000);
assert.equal(preliminaryEligibleAmount(3333, 24, 80000, 270000), 79992);
assert.equal(preliminaryEligibleAmount(3333, 24, 50000, 270000), 50000);
assert.equal(preliminaryEligibleAmount(3333, 24, 80000, 60000), 60000);
assert.equal(resolveDesiredMonthlyPayment(3333, 0, true), 0);
assert.equal(resolveDesiredMonthlyPayment(3333, 0, false), 3333);
assert.equal(resolveDesiredMonthlyPayment(3333, 5000, false), 3333);
assert.equal(resolveDesiredMonthlyPayment(3333, 1000, true), 1000);

assert.equal(maxTermForLoan("1.2", 30000), 24);
assert.equal(maxTermForLoan("1.2", 30001), 36);
assert.equal(maxTermForLoan("1.5", 10000), 5);
assert.equal(maxTermForLoan("1.2", 0), 24);
assert.equal(principalOnlyPayment(30000, 24), 1250);
assert.equal(principalOnlyPayment(48000, 36), 1334);
assert.equal(preliminaryEligibleAmount(2000, 24, 40000, 50000), 40000);
assert.equal(preliminaryEligibleAmount(2000, 24, 80000, 10000), 10000);

assert.deepEqual(salaryEstimateForType("1.5", 3333, 24), {
  termValid: false,
  eligible: 0,
  payment: 0,
});

assert.deepEqual(salaryEstimateForType("1.3", 1000, 24), {
  termValid: true,
  eligible: 24000,
  payment: 1000,
});

assert.deepEqual(salaryEstimateForType("1.3", 1000, 24, { "1.3": 30000 }), {
  termValid: true,
  eligible: 20000,
  payment: 834,
});

assert.deepEqual(salaryEstimateForType("1.5", 2000, 5), {
  termValid: true,
  eligible: 10000,
  payment: 2000,
});

console.log("Formula tests passed");
