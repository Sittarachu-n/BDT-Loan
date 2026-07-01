const loanTypes = {
  "1.1": {
    label: "1.1 ศึกษา อบรม นำเสนอผลงานวิจัย/สัมมนา",
    max: 50000,
    baseTerm: 24,
    annualRate: 3,
  },
  "1.2": {
    label: "1.2 ศึกษาต่อภายในประเทศ/นำเสนอผลงาน/สัมมนา",
    max: 60000,
    baseTerm: 36,
    annualRate: 3,
  },
  "1.3": {
    label: "1.3 จัดซื้ออุปกรณ์หรือเครื่องมือทางวิชาการ",
    max: 50000,
    baseTerm: 24,
    annualRate: 3,
  },
  "1.4": {
    label: "1.4 ซ่อมแซมปรับปรุงที่อยู่อาศัย",
    max: 50000,
    baseTerm: 24,
    annualRate: 3,
  },
  "1.5": {
    label: "1.5 กู้พิเศษฉุกเฉิน",
    max: 10000,
    baseTerm: 5,
    annualRate: 5,
  },
  "1.6": {
    label: "1.6 ค่าเล่าเรียนบุตร",
    max: 50000,
    baseTerm: 24,
    annualRate: 3,
  },
};

const employeeTypes = {
  civil: { label: "ข้าราชการ", cap: 80000 },
  permanentEmployee: { label: "พนักงานมหาวิทยาลัยประจำ", cap: 80000 },
  permanentWorker: { label: "ลูกจ้างประจำ", cap: 60000 },
  temporaryEmployee: { label: "พนักงานมหาวิทยาลัยชั่วคราว", cap: 40000, temporary: true },
};

const fields = {
  employeeType: document.querySelector("#employeeType"),
  salaryRemaining: document.querySelector("#salaryRemaining"),
  currentMonthlyPayment: document.querySelector("#currentMonthlyPayment"),
  interestRate: document.querySelector("#interestRate"),
  contractMonths: document.querySelector("#contractMonths"),
  currentLoanTable: document.querySelector("#currentLoanTable"),
  requestedLoanTable: document.querySelector("#requestedLoanTable"),
};

const output = {
  summaryPanel: document.querySelector(".summary-panel"),
  statusText: document.querySelector("#statusText"),
  approvedAmount: document.querySelector("#approvedAmount"),
  summaryText: document.querySelector("#summaryText"),
  salaryAlert: document.querySelector("#salaryAlert"),
  salaryEligible: document.querySelector("#salaryEligible"),
  maxNewPayment: document.querySelector("#maxNewPayment"),
  disposableAfterCurrent: document.querySelector("#disposableAfterCurrent"),
  termMonths: document.querySelector("#termMonths"),
  salaryLoanTable: document.querySelector("#salaryLoanTable"),
  personnelRemainingFormula: document.querySelector("#personnelRemainingFormula"),
  currentPaymentDisplay: document.querySelector("#currentPaymentDisplay"),
  newLoanPayment: document.querySelector("#newLoanPayment"),
  totalPaymentAfter: document.querySelector("#totalPaymentAfter"),
  remainingAfterAllPayments: document.querySelector("#remainingAfterAllPayments"),
  requiredReserve: document.querySelector("#requiredReserve"),
  evaluatedAmount: document.querySelector("#evaluatedAmount"),
  checkList: document.querySelector("#checkList"),
  buildReportButton: document.querySelector("#buildReportButton"),
  pdfButton: document.querySelector("#pdfButton"),
  reportPlaceholder: document.querySelector("#reportPlaceholder"),
  reportContent: document.querySelector("#reportContent"),
};

let latestCalculation = null;

function formatBaht(value) {
  return `${Math.max(0, Math.floor(value)).toLocaleString("th-TH")} บาท`;
}

function formatPercent(value) {
  return `${Number(value).toLocaleString("th-TH")}%`;
}

function numberValue(field) {
  return Math.max(0, Number(field.value) || 0);
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function loanOptions(selectedType) {
  const emptyOption = `<option value="" ${selectedType === "" ? "selected" : ""}>เลือกประเภทเงินกู้</option>`;
  return emptyOption + Object.entries(loanTypes)
    .map(([value, config]) => `<option value="${value}" ${value === selectedType ? "selected" : ""}>${config.label}</option>`)
    .join("");
}

function maxTermForLoan(typeKey, amount) {
  if (typeKey === "1.2") return amount > 30000 ? 36 : 24;
  return loanTypes[typeKey].baseTerm;
}

function termRuleText(typeKey, amount) {
  if (typeKey === "1.2") {
    return amount > 30000
      ? "ข้อ 1.2 ยอดตั้งแต่ 30,000 บาทขึ้นไป ผ่อนไม่เกิน 36 เดือน"
      : "ข้อ 1.2 ยอดไม่เกิน 30,000 บาท ผ่อนไม่เกิน 24 เดือน";
  }
  if (typeKey === "1.5") return "ข้อ 1.5 กู้พิเศษฉุกเฉิน ผ่อนไม่เกิน 5 เดือน";
  return `ข้อ ${typeKey} ผ่อนไม่เกิน 24 เดือน`;
}

function termForLoan(months) {
  return Math.max(1, months);
}

function monthlyPayment(principal, annualRate, months) {
  if (principal <= 0) return 0;
  if (annualRate <= 0) return principal / months;

  const monthlyRate = annualRate / 100 / 12;
  const factor = Math.pow(1 + monthlyRate, months);
  return (principal * monthlyRate * factor) / (factor - 1);
}

function principalFromPayment(payment, annualRate, months) {
  if (payment <= 0) return 0;
  if (annualRate <= 0) return payment * months;

  const monthlyRate = annualRate / 100 / 12;
  const factor = Math.pow(1 + monthlyRate, months);
  return (payment * (factor - 1)) / (monthlyRate * factor);
}

function addCheck(items, state, title, detail) {
  items.push({ state, title, detail });
}

function setText(element, text) {
  if (element) element.textContent = text;
}

function requestResultText(loan) {
  if (loan.amount === 0) return "-";
  if (loan.missingType) return "เลือกประเภทเงินกู้";
  if (loan.passed) return "กู้ได้เต็มยอด";
  if (loan.possibleAmount <= 0) return "ยังไม่มีวงเงินคงเหลือ";
  return `กู้ได้สูงสุด ${formatBaht(loan.possibleAmount)}`;
}

function requestResultClass(loan) {
  if (loan.amount === 0) return "empty";
  if (loan.passed) return "ok";
  if (loan.possibleAmount > 0) return "partial";
  return "bad";
}

function setSummaryState(state) {
  if (!output.summaryPanel) return;
  output.summaryPanel.classList.toggle("is-pass", state === "pass");
  output.summaryPanel.classList.toggle("is-partial", state === "partial");
  output.summaryPanel.classList.toggle("is-fail", state === "fail");
}

function formatThaiDateTime(date = new Date()) {
  return date.toLocaleString("th-TH", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function renderDynamicTables() {
  fields.currentLoanTable.innerHTML = Object.entries(loanTypes)
    .map(
      ([typeKey, loanType]) => `<tr>
        <td><strong>${typeKey}</strong><span>${loanType.label.replace(`${typeKey} `, "")}</span></td>
        <td>${formatBaht(loanType.max)}</td>
        <td><input class="table-input current-loan-amount" data-loan-type="${typeKey}" type="number" min="0" step="100" value="0" /></td>
        <td><strong data-current-remaining="${typeKey}">${formatBaht(loanType.max)}</strong></td>
      </tr>`
    )
    .join("");

  fields.requestedLoanTable.innerHTML = [0, 1, 2]
    .map(
      (index) => `<tr>
        <td><strong>${index + 1}</strong></td>
        <td><select class="table-select requested-loan-type" data-request-index="${index}">${loanOptions(index === 0 ? "1.1" : "")}</select></td>
        <td><input class="table-input requested-loan-amount" data-request-index="${index}" type="number" min="0" step="100" value="0" /></td>
        <td><strong data-request-payment="${index}">0 บาท</strong></td>
        <td><span class="term-status empty" data-request-result="${index}">-</span></td>
      </tr>`
    )
    .join("");
}

function getCurrentLoans() {
  const current = {};
  document.querySelectorAll(".current-loan-amount").forEach((input) => {
    current[input.dataset.loanType] = numberValue(input);
  });
  return current;
}

function getRequestedLoans() {
  return [0, 1, 2].map((index) => {
    const type = document.querySelector(`.requested-loan-type[data-request-index="${index}"]`).value;
    const amount = numberValue(document.querySelector(`.requested-loan-amount[data-request-index="${index}"]`));
    return { index, type, amount };
  });
}

function salaryEstimateForType(typeKey, disposableAfterCurrent, months) {
  const loanType = loanTypes[typeKey];
  const term = termForLoan(months);
  const maxTerm = maxTermForLoan(typeKey, loanType.max);
  const termValid = term <= maxTerm;
  const maxPayment = disposableAfterCurrent / 3;
  const salaryCapacity = termValid ? Math.floor(principalFromPayment(maxPayment, loanType.annualRate, term)) : 0;
  const eligible = Math.floor(Math.min(loanType.max, salaryCapacity));
  const payment = monthlyPayment(eligible, loanType.annualRate, term);

  return { typeKey, loanType, term, maxTerm, termValid, eligible, payment };
}

function maxBorrowAcrossTypes(maxPaymentBudget, currentLoans, employeeRemaining, months) {
  let paymentLeft = Math.max(0, maxPaymentBudget);
  let employeeLeft = Math.max(0, employeeRemaining);
  let total = 0;

  const candidates = Object.entries(loanTypes)
    .map(([typeKey, loanType]) => {
      const term = termForLoan(months);
      const typeRemaining = Math.max(0, loanType.max - (currentLoans[typeKey] || 0));
      const termValid = term <= maxTermForLoan(typeKey, loanType.max);
      return {
        typeKey,
        loanType,
        term,
        typeRemaining: termValid ? typeRemaining : 0,
        principalPerBaht: termValid ? principalFromPayment(1, loanType.annualRate, term) : 0,
      };
    })
    .sort((a, b) => b.principalPerBaht - a.principalPerBaht);

  candidates.forEach((candidate) => {
    if (paymentLeft <= 0 || employeeLeft <= 0 || candidate.typeRemaining <= 0) return;

    const cap = Math.min(candidate.typeRemaining, employeeLeft);
    const paymentForCap = monthlyPayment(cap, candidate.loanType.annualRate, candidate.term);
    const amount = paymentForCap <= paymentLeft
      ? cap
      : Math.min(cap, principalFromPayment(paymentLeft, candidate.loanType.annualRate, candidate.term));

    total += amount;
    employeeLeft -= amount;
    paymentLeft -= monthlyPayment(amount, candidate.loanType.annualRate, candidate.term);
  });

  return Math.floor(total);
}

function evaluateRequestedLoansSequentially(requestedLoans, maxPaymentBudget, currentLoans, employeeRemaining, months) {
  let paymentLeft = Math.max(0, maxPaymentBudget);
  let employeeLeft = Math.max(0, employeeRemaining);
  const typeLeft = {};

  Object.entries(loanTypes).forEach(([typeKey, loanType]) => {
    typeLeft[typeKey] = Math.max(0, loanType.max - (currentLoans[typeKey] || 0));
  });

  return requestedLoans.map((loan) => {
    const loanType = loanTypes[loan.type];
    if (!loanType) {
      return {
        ...loan,
        term: termForLoan(months),
        termValid: false,
        requestedPayment: 0,
        approvedPayment: 0,
        possibleAmount: 0,
        approvedAmount: 0,
        passed: false,
        missingType: loan.amount > 0,
      };
    }

    const term = termForLoan(months);
    const termValid = term <= maxTermForLoan(loan.type, loan.amount);
    const paymentCapacity = termValid ? principalFromPayment(paymentLeft, loanType.annualRate, term) : 0;
    const possibleAmount = Math.floor(Math.max(0, Math.min(typeLeft[loan.type] || 0, employeeLeft, paymentCapacity)));
    const approvedAmount = loan.amount > 0 ? Math.min(loan.amount, possibleAmount) : 0;
    const requestedPayment = monthlyPayment(loan.amount, loanType.annualRate, term);
    const approvedPayment = monthlyPayment(approvedAmount, loanType.annualRate, term);
    const passed = loan.amount > 0 && termValid && loan.amount <= possibleAmount;

    if (loan.amount > 0) {
      typeLeft[loan.type] = Math.max(0, (typeLeft[loan.type] || 0) - approvedAmount);
      employeeLeft = Math.max(0, employeeLeft - approvedAmount);
      paymentLeft = Math.max(0, paymentLeft - approvedPayment);
    }

    return {
      ...loan,
      term,
      termValid,
      requestedPayment,
      approvedPayment,
      possibleAmount,
      approvedAmount,
      passed,
    };
  });
}

function buildAmortizationRows(loan) {
  const loanType = loanTypes[loan.type];
  const monthlyRate = loanType.annualRate / 100 / 12;
  let balance = loan.approvedAmount;
  let rows = "";

  for (let period = 1; period <= loan.term && balance > 0.5; period += 1) {
    const openingBalance = balance;
    const interest = openingBalance * monthlyRate;
    let principalPaid = loan.approvedPayment;

    if (principalPaid > openingBalance || period === loan.term) {
      principalPaid = openingBalance;
    }

    const payment = principalPaid + interest;
    balance = Math.max(0, openingBalance - principalPaid);
    rows += `<tr>
      <td>${period.toLocaleString("th-TH")}</td>
      <td>${formatBaht(openingBalance)}</td>
      <td>${formatBaht(interest)}</td>
      <td>${formatBaht(principalPaid)}</td>
      <td>${formatBaht(payment)}</td>
    </tr>`;
  }

  return rows;
}

function calculate() {
  const requestedLoans = getRequestedLoans();
  const selectedType = requestedLoans[0]?.type || "1.1";
  const employee = employeeTypes[fields.employeeType.value];
  const salaryRemaining = numberValue(fields.salaryRemaining);
  const currentMonthlyPayment = numberValue(fields.currentMonthlyPayment);
  const months = numberValue(fields.contractMonths);
  const currentLoans = getCurrentLoans();
  const currentDebtTotal = Object.values(currentLoans).reduce((sum, value) => sum + value, 0);
  const requestedLoansActive = requestedLoans.filter((loan) => loan.amount > 0);
  const requestedTotal = requestedLoansActive.reduce((sum, loan) => sum + loan.amount, 0);
  const disposableAfterCurrent = Math.max(0, salaryRemaining - currentMonthlyPayment);
  const maxNewPayment = disposableAfterCurrent / 3;
  const salaryRows = Object.keys(loanTypes).map((key) => salaryEstimateForType(key, disposableAfterCurrent, months));
  const employeeRemaining = Math.max(0, employee.cap - currentDebtTotal);
  const personnelRemainingAfterRequested = Math.max(0, employee.cap - currentDebtTotal - requestedTotal);
  const typeRemainingByType = {};

  Object.entries(loanTypes).forEach(([typeKey, loanType]) => {
    typeRemainingByType[typeKey] = Math.max(0, loanType.max - (currentLoans[typeKey] || 0));
    const cell = document.querySelector(`[data-current-remaining="${typeKey}"]`);
    if (cell) cell.textContent = formatBaht(typeRemainingByType[typeKey]);
  });

  const typeRemainingTotal = Object.values(typeRemainingByType).reduce((sum, value) => sum + value, 0);
  const rightEligible = Math.min(
    maxBorrowAcrossTypes(maxNewPayment, currentLoans, employeeRemaining, months),
    typeRemainingTotal,
    employeeRemaining
  );
  const evaluatedLoans = evaluateRequestedLoansSequentially(
    requestedLoans,
    maxNewPayment,
    currentLoans,
    employeeRemaining,
    months
  );
  const evaluatedLoansActive = evaluatedLoans.filter((loan) => loan.amount > 0);
  const approvedTotal = evaluatedLoansActive.reduce((sum, loan) => sum + loan.approvedAmount, 0);
  const requestedPayment = evaluatedLoansActive.reduce((sum, loan) => sum + loan.approvedPayment, 0);
  const totalPaymentAfter = currentMonthlyPayment + requestedPayment;
  const remainingAfterAllPayments = salaryRemaining - totalPaymentAfter;
  const requiredReserve = requestedPayment * 3;
  const checks = [];

  evaluatedLoans.forEach((loan) => {
    const paymentCell = document.querySelector(`[data-request-payment="${loan.index}"]`);
    const resultCell = document.querySelector(`[data-request-result="${loan.index}"]`);

    if (paymentCell) paymentCell.textContent = formatBaht(loan.approvedPayment);
    if (resultCell) {
      resultCell.className = `term-status ${requestResultClass(loan)}`;
      resultCell.textContent = requestResultText(loan);
    }
  });

  evaluatedLoansActive.forEach((loan) => {
    if (!loanTypes[loan.type]) {
      addCheck(checks, "fail", `ผลพิจารณาสัญญา ${loan.index + 1}`, `กรุณาเลือกประเภทเงินกู้สำหรับยอดที่ต้องการ ${formatBaht(loan.amount)}`);
      return;
    }

    addCheck(
      checks,
      loan.passed ? "pass" : "fail",
      `ผลพิจารณาสัญญา ${loan.index + 1}`,
      loan.passed
        ? `กู้ได้ตามยอดที่ต้องการ ${formatBaht(loan.amount)}`
        : `ยอดที่ต้องการ ${formatBaht(loan.amount)}; ${requestResultText(loan)}`
    );
  });

  addCheck(
    checks,
    disposableAfterCurrent > 0 ? "pass" : "fail",
    "ส่วนที่ 1: เงินเดือนรองรับการผ่อน",
    `ยอดเงินเดือนคงเหลือ ${formatBaht(salaryRemaining)} หักภาระผ่อนปัจจุบันต่อเดือน ${formatBaht(currentMonthlyPayment)} เหลือ ${formatBaht(disposableAfterCurrent)}`
  );
  addCheck(
    checks,
    rightEligible > 0 ? "pass" : "fail",
    "ส่วนที่ 2: ยอดกู้สูงสุดที่สามารถกู้ได้",
    `คำนวณจากเงินเดือน เพดานบุคลากร และสิทธิคงเหลือตามประเภทเงินกู้ ได้สูงสุด ${formatBaht(rightEligible)}`
  );
  addCheck(
    checks,
    currentDebtTotal <= employee.cap ? "pass" : "fail",
    "ส่วนที่ 2: เงินกู้ปัจจุบันไม่เกินเพดานบุคลากร",
    `ยอดเงินกู้ปัจจุบันรวม ${formatBaht(currentDebtTotal)} เทียบกับเพดาน ${formatBaht(employee.cap)}`
  );
  addCheck(
    checks,
    requestedTotal === 0 || requestedTotal <= employeeRemaining ? "pass" : "fail",
    "ส่วนที่ 2: ยอดที่ต้องการไม่เกินสิทธิคงเหลือตามประเภทบุคลากร",
    `ต้องการรวม ${formatBaht(requestedTotal)}; สิทธิคงเหลือตามประเภทบุคลากร ${formatBaht(employeeRemaining)}`
  );
  addCheck(
    checks,
    requestedTotal === 0 || approvedTotal === requestedTotal ? "pass" : "fail",
    "ส่วนที่ 2: ผลเทียบกับเงื่อนไขจากส่วนที่ 1",
    requestedTotal === 0
      ? `ยังไม่ได้กรอกยอดที่ต้องการ ระบบแสดงวงเงินสูงสุด ${formatBaht(rightEligible)}`
      : `ต้องการรวม ${formatBaht(requestedTotal)}; กู้ได้ตามลำดับสัญญารวม ${formatBaht(approvedTotal)}`
  );
  addCheck(
    checks,
    requestedTotal === 0 || remainingAfterAllPayments >= requiredReserve ? "pass" : "fail",
    "ส่วนที่ 3: หลังการกู้ยังเหลือเงินตามเกณฑ์",
    `หลังผ่อนทั้งหมดเหลือ ${formatBaht(remainingAfterAllPayments)} และต้องไม่น้อยกว่า ${formatBaht(requiredReserve)}`
  );

  evaluatedLoansActive.forEach((loan) => {
    if (!loanTypes[loan.type]) return;

    const maxTerm = maxTermForLoan(loan.type, loan.amount);
    addCheck(
      checks,
      loan.termValid ? "pass" : "fail",
      `ระยะเวลาผ่อนสัญญา ${loan.index + 1}`,
      `กรอก ${loan.term.toLocaleString("th-TH")} เดือน; ${termRuleText(loan.type, loan.amount)}`
    );
  });

  if (employee.temporary) {
    addCheck(
      checks,
      "warn",
      "ข้อควรตรวจสอบสำหรับพนักงานชั่วคราว",
      "ตาม Markdown ลูกจ้าง/พนักงานชั่วคราวต้องผ่อนชำระภายในระยะเวลาที่เหลือของสัญญาจ้างด้วย"
    );
  }
  addCheck(
    checks,
    "warn",
    "เอกสารและกำหนดเวลา",
    "ยื่นภายในวันที่ 10 ของเดือน ยกเว้นกู้พิเศษฉุกเฉิน พร้อมแนบสลิปเงินเดือนล่าสุด"
  );

  const failed = checks.some((check) => check.state === "fail");
  const requestedOverEligible = evaluatedLoansActive.some((loan) => loan.amount > loan.approvedAmount);
  const missingSalary = salaryRemaining <= 0;
  const summaryState = missingSalary ? "fail" : requestedOverEligible ? "partial" : failed ? "fail" : "pass";
  const statusMessage = missingSalary
    ? "ผลประเมินเบื้องต้น"
    : requestedOverEligible
      ? "กู้ได้บางส่วน"
      : failed
        ? "ยังไม่ผ่านเงื่อนไข"
        : requestedTotal > 0
          ? "กู้ได้เต็มยอด"
          : "ผลประเมินเบื้องต้น";

  latestCalculation = {
    employee,
    salaryRemaining,
    currentMonthlyPayment,
    months,
    currentDebtTotal,
    requestedTotal,
    disposableAfterCurrent,
    maxNewPayment,
    employeeRemaining,
    personnelRemainingAfterRequested,
    rightEligible,
    evaluatedLoans,
    evaluatedLoansActive,
    approvedTotal,
    requestedPayment,
    totalPaymentAfter,
    remainingAfterAllPayments,
    requiredReserve,
    salaryRows,
    checks,
    failed,
    requestedOverEligible,
    missingSalary,
    summaryState,
    statusMessage,
  };

  setSummaryState(summaryState);
  setText(output.statusText, statusMessage);
  setText(output.approvedAmount, formatBaht(rightEligible));
  setText(
    output.summaryText,
    "ผลลัพธ์นี้เป็นผลประเมินเบื้องต้นเท่านั้น ไม่ใช่การอนุมัติเงินกู้จริง | " +
      `${employee.label} | ตรวจสอบ ${requestedLoansActive.length.toLocaleString("th-TH")} สัญญา | ดอกเบี้ยตามประเภทเงินกู้`
  );
  if (output.salaryAlert) output.salaryAlert.hidden = !missingSalary;

  setText(output.salaryEligible, formatBaht(Math.max(...salaryRows.map((row) => row.eligible))));
  setText(output.maxNewPayment, formatBaht(maxNewPayment));
  setText(output.disposableAfterCurrent, formatBaht(disposableAfterCurrent));
  setText(output.termMonths, `${months.toLocaleString("th-TH")} เดือน`);
  const bestSalaryEligible = Math.max(...salaryRows.map((row) => row.eligible));
  output.salaryLoanTable.innerHTML = salaryRows
    .map(
      (row) => `<tr class="${row.typeKey === selectedType ? "selected-row" : ""} ${bestSalaryEligible > 0 && row.eligible === bestSalaryEligible ? "best-row" : ""} ${row.termValid ? "" : "invalid-row"}">
        <td><strong>${row.typeKey}</strong><span>${row.loanType.label.replace(`${row.typeKey} `, "")}</span></td>
        <td>${row.loanType.annualRate.toLocaleString("th-TH")}%</td>
        <td>${row.term.toLocaleString("th-TH")} เดือน</td>
        <td><span class="term-status ${row.termValid ? "ok" : "bad"}">${row.termValid ? "สอดคล้อง" : `เกิน ${row.maxTerm} เดือน`}</span></td>
        <td>${formatBaht(row.payment)}</td>
        <td><strong>${formatBaht(row.eligible)}</strong>${bestSalaryEligible > 0 && row.eligible === bestSalaryEligible ? `<span class="term-status ok">สูงสุด</span>` : ""}</td>
      </tr>`
    )
    .join("");

  setText(output.personnelRemainingFormula, formatBaht(personnelRemainingAfterRequested));
  setText(output.currentPaymentDisplay, formatBaht(currentMonthlyPayment));
  setText(output.newLoanPayment, formatBaht(requestedPayment));
  setText(output.totalPaymentAfter, formatBaht(totalPaymentAfter));
  setText(output.remainingAfterAllPayments, formatBaht(remainingAfterAllPayments));
  setText(output.requiredReserve, formatBaht(requiredReserve));
  setText(output.evaluatedAmount, formatBaht(evaluatedLoansActive.length > 0 ? approvedTotal : rightEligible));

  output.checkList.innerHTML = checks
    .map((check) => {
      const icon = check.state === "pass" ? "✓" : check.state === "warn" ? "!" : "×";
      return `<li class="${check.state}"><span class="mark">${icon}</span><div><strong>${check.title}</strong><p>${check.detail}</p></div></li>`;
    })
    .join("");
}

function buildReportSummary(options = {}) {
  if (!latestCalculation || !output.reportContent) return;

  const data = latestCalculation;
  const printedAt = formatThaiDateTime();
  const requestedSummaryRows = data.evaluatedLoans
    .filter((loan) => loan.amount > 0)
    .map((loan) => {
      const loanType = loanTypes[loan.type];
      return `<tr>
        <td><strong>สัญญาที่ ${loan.index + 1}</strong></td>
        <td>${loanType ? escapeHtml(loanType.label) : "ยังไม่เลือกประเภทเงินกู้"}</td>
        <td>${formatBaht(loan.amount)}</td>
        <td>${formatBaht(loan.approvedAmount)}</td>
        <td>${formatBaht(loan.approvedPayment)}</td>
        <td><span class="term-status ${requestResultClass(loan)}">${escapeHtml(requestResultText(loan))}</span></td>
      </tr>`;
    })
    .join("");

  const amortizationTables = data.evaluatedLoans
    .filter((loan) => loan.approvedAmount > 0 && loanTypes[loan.type])
    .map((loan) => {
      const loanType = loanTypes[loan.type];
      return `<div class="amortization-contract">
        <div class="table-head">
          <h3>สัญญาที่ ${loan.index + 1}: ${escapeHtml(loanType.label)}</h3>
          <span>เงินต้น ${formatBaht(loan.approvedAmount)} | ดอกเบี้ย ${formatPercent(loanType.annualRate)} ต่อปี | ค่างวดโดยประมาณ ${formatBaht(loan.approvedPayment)} | ${loan.term.toLocaleString("th-TH")} งวด</span>
        </div>
        <div class="loan-table-wrap">
          <table class="loan-table compact-table amortization-table">
            <thead>
              <tr>
                <th>งวดที่</th>
                <th>เงินต้นคงเหลือก่อนชำระ</th>
                <th>ดอกเบี้ย</th>
                <th>เงินต้นที่ผ่อน</th>
                <th>ยอดผ่อนรวมต่อเดือน</th>
              </tr>
            </thead>
            <tbody>${buildAmortizationRows(loan)}</tbody>
          </table>
        </div>
      </div>`;
    })
    .join("");

  const reportStatus = data.statusMessage;

  output.reportContent.innerHTML = `
    <div class="report-print-area">
      <div class="report-title">
        <span>รายงานสรุปสิทธิเงินกู้และตารางผ่อนชำระ</span>
        <strong>${reportStatus}</strong>
      </div>

      <div class="report-meta">
        <span>สำนักดิจิทัลเทคโนโลยี มหาวิทยาลัยศิลปากร</span>
        <span>วันที่พิมพ์รายงาน: ${printedAt}</span>
      </div>

      <div class="report-note">
        ผลลัพธ์นี้เป็นผลประเมินเบื้องต้นเท่านั้น ไม่ใช่การอนุมัติเงินกู้จริง
      </div>

      <div class="metric-grid repayment-grid report-metrics">
        <div class="metric"><span>ประเภทบุคลากร</span><strong>${escapeHtml(data.employee.label)}</strong></div>
        <div class="metric strong-metric"><span>ยอดกู้สูงสุดตามประเภทบุคลากร</span><strong>${formatBaht(data.employeeRemaining)}</strong></div>
        <div class="metric"><span>ยอดเงินกู้ที่ต้องการ</span><strong>${formatBaht(data.requestedTotal)}</strong></div>
        <div class="metric"><span>ยอดเงินเดือนคงเหลือ</span><strong>${formatBaht(data.salaryRemaining)}</strong></div>
        <div class="metric"><span>ยอดผ่อนสูงสุดต่อเดือน</span><strong>${formatBaht(data.maxNewPayment)}</strong></div>
        <div class="metric"><span>ระยะเวลาที่ต้องการผ่อน</span><strong>${data.months.toLocaleString("th-TH")} เดือน</strong></div>
      </div>

      <div class="contract-summary">
        <div class="table-head">
          <h3>สรุปสัญญาเงินกู้ที่ต้องการ</h3>
          <span>แสดงเฉพาะสัญญาที่กรอกยอดเงินที่ต้องการไว้</span>
        </div>
        <div class="loan-table-wrap">
          <table class="loan-table compact-table contract-summary-table">
            <thead>
              <tr>
                <th>สัญญา</th>
                <th>ประเภทเงินกู้</th>
                <th>ยอดที่ต้องการ</th>
                <th>ยอดที่กู้ได้</th>
                <th>ค่างวดที่ใช้ประเมิน</th>
                <th>ผลพิจารณา</th>
              </tr>
            </thead>
            <tbody>${requestedSummaryRows || `<tr><td colspan="6">ยังไม่ได้กรอกยอดเงินกู้ที่ต้องการ</td></tr>`}</tbody>
          </table>
        </div>
      </div>

      <div class="amortization-panel">
        <div class="table-head">
          <h3>ตารางผ่อนชำระรายเดือนและดอกเบี้ย</h3>
        </div>
        ${amortizationTables || `<div class="report-placeholder">ยังไม่มีสัญญาที่มียอดกู้ได้สำหรับสร้างตารางผ่อน</div>`}
      </div>
    </div>
  `;

  output.reportContent.hidden = false;
  if (output.reportPlaceholder) output.reportPlaceholder.hidden = true;
  if (output.pdfButton) output.pdfButton.disabled = false;
  if (options.scroll && output.reportContent) {
    output.reportContent.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

function createPdfDocument() {
  buildReportSummary();
  window.print();
}

function resetReportOutput() {
  if (output.reportContent) {
    output.reportContent.hidden = true;
    output.reportContent.innerHTML = "";
  }
  if (output.reportPlaceholder) output.reportPlaceholder.hidden = false;
  if (output.pdfButton) output.pdfButton.disabled = true;
}

function syncInterestRate() {
  const firstRequestedType = document.querySelector('.requested-loan-type[data-request-index="0"]')?.value || "1.1";
  fields.interestRate.value = loanTypes[firstRequestedType]?.annualRate || 0;
}

function resetForm() {
  fields.employeeType.value = "civil";
  fields.salaryRemaining.value = 0;
  fields.currentMonthlyPayment.value = 0;
  fields.contractMonths.value = 24;
  document.querySelectorAll(".current-loan-amount").forEach((input) => {
    input.value = 0;
  });
  document.querySelectorAll(".requested-loan-type").forEach((select, index) => {
    select.value = index === 0 ? "1.1" : "";
  });
  document.querySelectorAll(".requested-loan-amount").forEach((input) => {
    input.value = 0;
  });
  syncInterestRate();
  resetReportOutput();
  calculate();
}

renderDynamicTables();
document.querySelector("#loanForm").addEventListener("input", () => {
  resetReportOutput();
  calculate();
});
document.querySelector("#loanForm").addEventListener("change", () => {
  syncInterestRate();
  resetReportOutput();
  calculate();
});
document.querySelector("#resetButton").addEventListener("click", resetForm);
output.buildReportButton?.addEventListener("click", () => buildReportSummary({ scroll: true }));
output.pdfButton?.addEventListener("click", createPdfDocument);
syncInterestRate();
calculate();
