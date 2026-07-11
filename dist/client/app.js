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
  desiredMonthlyPayment: document.querySelector("#desiredMonthlyPayment"),
  contractMonths: document.querySelector("#contractMonths"),
  requestedLoanTable: document.querySelector("#requestedLoanTable"),
  borrowerName: document.querySelector("#borrowerName"),
};

const output = {
  summaryPanel: document.querySelector(".summary-panel"),
  statusText: document.querySelector("#statusText"),
  approvedAmount: document.querySelector("#approvedAmount"),
  summaryText: document.querySelector("#summaryText"),
  salaryAlert: document.querySelector("#salaryAlert"),
  maxNewPayment: document.querySelector("#maxNewPayment"),
  salaryPaymentBase: document.querySelector("#salaryPaymentBase"),
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
let delayedCalculateTimer = null;

function formatBaht(value) {
  return `${Math.max(0, Math.floor(value)).toLocaleString("th-TH")} บาท`;
}

function formatPercent(value) {
  return `${Number(value).toLocaleString("th-TH")}%`;
}

function numberValue(field) {
  const rawValue = String(field?.value ?? "").replace(/,/g, "");
  return Math.max(0, Number(rawValue) || 0);
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

function principalOnlyCapacity(payment, months) {
  return Math.floor(Math.max(0, payment) * termForLoan(months));
}

function principalOnlyPayment(principal, months) {
  if (principal <= 0) return 0;
  return Math.ceil(principal / termForLoan(months));
}

function isPaymentBaseInputActive() {
  return document.activeElement === fields.salaryRemaining ||
    document.activeElement === fields.currentMonthlyPayment;
}

function addCheck(items, state, title, detail) {
  items.push({ state, title, detail });
}

function setText(element, text) {
  if (element) element.textContent = text;
}

function createElement(tagName, options = {}, children = []) {
  const element = document.createElement(tagName);
  const { className, text, attributes = {} } = options;

  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  Object.entries(attributes).forEach(([name, value]) => {
    element.setAttribute(name, value);
  });
  children.forEach((child) => element.append(child));

  return element;
}

function renderAlertMessages(messages) {
  if (!output.salaryAlert) return;

  output.salaryAlert.hidden = messages.length === 0;
  output.salaryAlert.replaceChildren(
    ...messages.map((message) => createElement("div", { text: message }))
  );
}

function renderChecks(checks) {
  if (!output.checkList) return;

  const items = checks.map((check) => {
    const icon = check.state === "pass" ? "✓" : check.state === "warn" ? "!" : "×";
    const mark = createElement("span", { className: "mark", text: icon });
    const title = createElement("strong", { text: check.title });
    const detail = createElement("p", { text: check.detail });
    const content = createElement("div", {}, [title, detail]);

    return createElement("li", { className: check.state }, [mark, content]);
  });

  output.checkList.replaceChildren(...items);
}

function requestResultText(loan) {
  if (loan.amount === 0) return "-";
  if (loan.missingType) return "เลือกประเภทเงินกู้";
  if (loan.passed) return "กู้ได้เต็มยอด";
  if (loan.possibleAmount <= 0) return "ยังไม่มีวงเงินคงเหลือ";
  return `วงเงินกู้สูงสุด ${formatBaht(loan.possibleAmount)}`;
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
  output.salaryLoanTable.innerHTML = Object.entries(loanTypes)
    .map(
      ([typeKey, loanType]) => `<tr data-salary-type="${typeKey}">
        <td><strong>${typeKey}</strong><span>${loanType.label.replace(`${typeKey} `, "")}</span></td>
        <td>${loanType.annualRate.toLocaleString("th-TH")}%</td>
        <td data-salary-term="${typeKey}">0 เดือน</td>
        <td><span class="term-status" data-salary-status="${typeKey}">-</span></td>
        <td data-salary-payment="${typeKey}">0 บาท</td>
        <td><input class="table-input salary-current-loan-amount" data-loan-type="${typeKey}" type="text" inputmode="numeric" pattern="[0-9,]*" value="0" /></td>
        <td><strong data-salary-eligible="${typeKey}">0 บาท</strong><span class="term-status ok" data-salary-best="${typeKey}" hidden>สูงสุด</span></td>
      </tr>`
    )
    .join("");

  fields.requestedLoanTable.innerHTML = [0,1]
    .map(
      (index) => `<tr>
        <td><strong>${index + 1}</strong></td>
        <td><select class="table-select requested-loan-type" data-request-index="${index}">${loanOptions("")}</select></td>
        <td><input class="table-input requested-loan-amount" data-request-index="${index}" type="number" min="0" step="100" value="0" /></td>
        <td><strong data-request-payment="${index}">0 บาท</strong></td>
        <td><span class="term-status empty" data-request-result="${index}">-</span></td>
      </tr>`
    )
    .join("");
}

function getCurrentLoans() {
  const current = Object.fromEntries(Object.keys(loanTypes).map((typeKey) => [typeKey, 0]));

  document.querySelectorAll(".salary-current-loan-amount").forEach((input) => {
    current[input.dataset.loanType] = numberValue(input);
  });

  return current;
}

function getRequestedLoans() {
  return [0,1].map((index) => {
    const type = document.querySelector(`.requested-loan-type[data-request-index="${index}"]`).value;
    const amount = numberValue(document.querySelector(`.requested-loan-amount[data-request-index="${index}"]`));
    return { index, type, amount };
  });
}

function salaryEstimateForType(typeKey, maxNewPayment, months, currentLoans) {
  const loanType = loanTypes[typeKey];
  const term = termForLoan(months);
  const maxTerm = maxTermForLoan(typeKey, loanType.max);
  const termValid = term <= maxTerm;
  const typeRemaining = Math.max(0, loanType.max - (currentLoans[typeKey] || 0));
  const salaryCapacity = termValid ? principalOnlyCapacity(maxNewPayment, term) : 0;
  const eligible = Math.floor(Math.min(typeRemaining, salaryCapacity));
  const payment = principalOnlyPayment(eligible, term);

  return { typeKey, loanType, term, maxTerm, termValid, typeRemaining, eligible, payment };
}

function preliminaryEligibleAmount(desiredMonthlyPayment, months, employeeRemaining, typeRemainingTotal) {
  return Math.floor(Math.min(
    principalOnlyCapacity(desiredMonthlyPayment, months),
    Math.max(0, employeeRemaining),
    Math.max(0, typeRemainingTotal)
  ));
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
    const paymentCapacity = termValid ? principalOnlyCapacity(paymentLeft, term) : 0;
    const possibleAmount = Math.floor(Math.max(0, Math.min(typeLeft[loan.type] || 0, employeeLeft, paymentCapacity)));
    const approvedAmount = loan.amount > 0 ? Math.min(loan.amount, possibleAmount) : 0;
    const requestedPayment = principalOnlyPayment(loan.amount, term);
    const approvedPayment = principalOnlyPayment(approvedAmount, term);
    const passed = loan.amount > 0 && termValid && loan.amount <= possibleAmount;

    if (loan.amount > 0) {
      typeLeft[loan.type] = Math.max(0, (typeLeft[loan.type] || 0) - approvedAmount);
      employeeLeft = Math.max(0, employeeLeft - approvedAmount);
      paymentLeft = Math.max(0, paymentLeft - approvedAmount / term);
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

function buildReportViewModel(data) {
  const evaluatedLoansWithAmount = data.evaluatedLoans.filter((loan) => loan.amount > 0);
  const amortizationLoans = data.evaluatedLoans.filter((loan) => loan.approvedAmount > 0 && loanTypes[loan.type]);
  const totalEvaluationPayment = evaluatedLoansWithAmount.reduce((sum, loan) => sum + loan.approvedPayment, 0);
  const currentLoanRows = Object.entries(data.currentLoans)
    .filter(([, amount]) => amount > 0)
    .map(([typeKey, amount]) => ({ typeKey, loanType: loanTypes[typeKey], amount }));

  return {
    data,
    amortizationLoans,
    borrowerName: [document.querySelector("#borrowerPrefix")?.value, fields.borrowerName?.value.trim()].filter(Boolean).join(" ") || "-",
    currentLoanRows,
    evaluatedLoansWithAmount,
    printedAt: formatThaiDateTime(),
    reportStatus: data.statusMessage,
    totalEvaluationPayment,
  };
}

function readFormState() {
  const requestedLoans = getRequestedLoans();
  const employee = employeeTypes[fields.employeeType.value];
  const salaryRemaining = numberValue(fields.salaryRemaining);
  const currentMonthlyPayment = numberValue(fields.currentMonthlyPayment);
  const months = numberValue(fields.contractMonths);
  const currentLoans = getCurrentLoans();
  const currentDebtTotal = Object.values(currentLoans).reduce((sum, value) => sum + value, 0);

  return {
    requestedLoans,
    employee,
    salaryRemaining,
    currentMonthlyPayment,
    months,
    currentLoans,
    currentDebtTotal,
  };
}

function calculate() {
  const {
    requestedLoans,
    employee,
    salaryRemaining,
    currentMonthlyPayment,
    months,
    currentLoans,
    currentDebtTotal,
  } = readFormState();
  const hasCurrentMonthlyPayment = currentMonthlyPayment > 0;
  const hasCurrentLoanDebt = currentDebtTotal > 0;
  const debtPaymentMismatchMessages = [];
  if (hasCurrentMonthlyPayment && !hasCurrentLoanDebt) {
    debtPaymentMismatchMessages.push("มีภาระผ่อนปัจจุบันต่อเดือน กรุณากรอกยอดเงินกู้ปัจจุบันในตารางส่วนที่ 1");
  }
  if (hasCurrentLoanDebt && !hasCurrentMonthlyPayment) {
    debtPaymentMismatchMessages.push("มียอดเงินกู้ปัจจุบัน กรุณากรอกภาระผ่อนปัจจุบันต่อเดือน");
  }
  const requestedLoansActive = requestedLoans.filter((loan) => loan.amount > 0);
  const requestedTotal = requestedLoansActive.reduce((sum, loan) => sum + loan.amount, 0);
  const salaryPaymentBase = salaryRemaining / 3;
  const maxNewPayment = Math.max(0, salaryPaymentBase - currentMonthlyPayment);
  const maxNewPaymentLimit = Math.floor(maxNewPayment);
  const desiredPaymentRaw = numberValue(fields.desiredMonthlyPayment);
  const paymentBaseInputActive = isPaymentBaseInputActive();
  const desiredMonthlyPayment = maxNewPaymentLimit > 0
    ? Math.min(maxNewPaymentLimit, desiredPaymentRaw > 0 ? desiredPaymentRaw : paymentBaseInputActive ? 0 : maxNewPaymentLimit)
    : 0;
  const desiredPaymentActive = document.activeElement === fields.desiredMonthlyPayment;
  const shouldFillDesiredPayment = !paymentBaseInputActive &&
    (!desiredPaymentActive || desiredPaymentRaw === 0 || desiredPaymentRaw > maxNewPaymentLimit);
  fields.desiredMonthlyPayment.max = maxNewPaymentLimit;
  fields.desiredMonthlyPayment.placeholder = maxNewPaymentLimit > 0 ? `ไม่เกิน ${maxNewPaymentLimit.toLocaleString("th-TH")}` : "0";
  if (shouldFillDesiredPayment) {
    fields.desiredMonthlyPayment.value = desiredMonthlyPayment;
  }
  const salaryRows = Object.keys(loanTypes).map((key) => salaryEstimateForType(key, desiredMonthlyPayment, months, currentLoans));
  const employeeRemaining = Math.max(0, employee.cap - currentDebtTotal);
  const personnelRemainingAfterRequested = Math.max(0, employee.cap - currentDebtTotal - requestedTotal);
  const typeRemainingByType = {};

  Object.entries(loanTypes).forEach(([typeKey, loanType]) => {
    typeRemainingByType[typeKey] = Math.max(0, loanType.max - (currentLoans[typeKey] || 0));
  });

  const typeRemainingTotal = Object.values(typeRemainingByType).reduce((sum, value) => sum + value, 0);
  const rightEligible = preliminaryEligibleAmount(desiredMonthlyPayment, months, employeeRemaining, typeRemainingTotal);
  const evaluatedLoans = evaluateRequestedLoansSequentially(
    requestedLoans,
    desiredMonthlyPayment,
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
      addCheck(checks, "fail", `ผลการประเมินสัญญา ${loan.index + 1}`, `กรุณาเลือกประเภทเงินกู้สำหรับยอดเงินกู้ที่ต้องการ ${formatBaht(loan.amount)}`);
      return;
    }

    addCheck(
      checks,
      loan.passed ? "pass" : "fail",
      `ผลการประเมินสัญญา ${loan.index + 1}`,
      loan.passed
        ? `กู้ได้ตามยอดเงินกู้ที่ต้องการ ${formatBaht(loan.amount)}`
        : `ยอดเงินกู้ที่ต้องการ ${formatBaht(loan.amount)}; ${requestResultText(loan)}`
    );
  });

  addCheck(
    checks,
    maxNewPayment > 0 ? "pass" : "fail",
    "ส่วนที่ 1: เงินเดือนรองรับการผ่อน",
    `ค่างวดใหม่สูงสุด = (${formatBaht(salaryRemaining)} ÷ 3) - ${formatBaht(currentMonthlyPayment)} = ${formatBaht(maxNewPayment)} | ใช้ค่างวดที่ต้องการ ${formatBaht(desiredMonthlyPayment)}`
  );
  addCheck(
    checks,
    rightEligible > 0 ? "pass" : "fail",
    "ส่วนที่ 2: วงเงินกู้สูงสุดที่สามารถกู้ได้",
    `คำนวณจากเงินเดือน เพดานบุคลากร และสิทธิคงเหลือตามประเภทเงินกู้ ได้สูงสุด ${formatBaht(rightEligible)}`
  );
  addCheck(
    checks,
    debtPaymentMismatchMessages.length === 0 && currentDebtTotal <= employee.cap ? "pass" : "fail",
    "ส่วนที่ 2: เงินกู้ปัจจุบันไม่เกินเพดานบุคลากร",
    debtPaymentMismatchMessages.length > 0
      ? debtPaymentMismatchMessages.join(" | ")
      : `ยอดเงินกู้ปัจจุบันรวม ${formatBaht(currentDebtTotal)} เทียบกับเพดาน ${formatBaht(employee.cap)}`
  );
  addCheck(
    checks,
    requestedTotal === 0 || requestedTotal <= employeeRemaining ? "pass" : "fail",
    "ส่วนที่ 2: ยอดเงินกู้ที่ต้องการไม่เกินสิทธิคงเหลือตามประเภทบุคลากร",
    `ต้องการรวม ${formatBaht(requestedTotal)}; สิทธิคงเหลือตามประเภทบุคลากร ${formatBaht(employeeRemaining)}`
  );
  addCheck(
    checks,
    requestedTotal === 0 || approvedTotal === requestedTotal ? "pass" : "fail",
    "ส่วนที่ 2: ผลเทียบกับเงื่อนไขจากส่วนที่ 1",
    requestedTotal === 0
      ? `ยังไม่ได้กรอกยอดเงินกู้ที่ต้องการ ระบบแสดงวงเงินกู้สูงสุด ${formatBaht(rightEligible)}`
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
  const alertMessages = [];
  if (missingSalary) alertMessages.push("กรุณากรอกยอดเงินเดือนคงเหลือเพื่อประเมินสิทธิกู้");
  alertMessages.push(...debtPaymentMismatchMessages);
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
    currentLoans,
    currentDebtTotal,
    requestedTotal,
    salaryPaymentBase,
    maxNewPayment,
    desiredMonthlyPayment,
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
    "ผลลัพธ์นี้เป็นการประเมินเบื้องต้นเท่านั้น ไม่ถือเป็นการอนุมัติเงินกู้ | " +
      `${employee.label} | ตรวจสอบ ${requestedLoansActive.length.toLocaleString("th-TH")} สัญญา | ดอกเบี้ยตามประเภทเงินกู้`
  );
  renderAlertMessages(alertMessages);

  setText(output.maxNewPayment, formatBaht(maxNewPayment));
  setText(output.salaryPaymentBase, formatBaht(salaryPaymentBase));
  setText(output.termMonths, `${months.toLocaleString("th-TH")} เดือน`);
  salaryRows.forEach((row) => {
    const summaryValue = document.querySelector(`[data-summary-type="${row.typeKey}"] span`);
    if (summaryValue) summaryValue.textContent = formatBaht(row.eligible);
  });
  const bestSalaryEligible = Math.max(...salaryRows.map((row) => row.eligible));
  salaryRows.forEach((row) => {
    const tableRow = document.querySelector(`[data-salary-type="${row.typeKey}"]`);
    const termCell = document.querySelector(`[data-salary-term="${row.typeKey}"]`);
    const statusCell = document.querySelector(`[data-salary-status="${row.typeKey}"]`);
    const paymentCell = document.querySelector(`[data-salary-payment="${row.typeKey}"]`);
    const eligibleCell = document.querySelector(`[data-salary-eligible="${row.typeKey}"]`);
    const bestBadge = document.querySelector(`[data-salary-best="${row.typeKey}"]`);
    const highlightClass = !row.termValid
      ? "invalid-row"
      : desiredMonthlyPayment > 0 && row.payment === desiredMonthlyPayment
        ? "matched-row"
        : desiredMonthlyPayment > 0 && row.payment < desiredMonthlyPayment
          ? "under-payment-row"
          : "";

    if (tableRow) tableRow.className = highlightClass;
    if (termCell) termCell.textContent = `${row.term.toLocaleString("th-TH")} เดือน`;
    if (statusCell) {
      statusCell.className = `term-status ${row.termValid ? "ok" : "bad"}`;
      statusCell.textContent = row.termValid ? "สอดคล้อง" : `เกิน ${row.maxTerm} เดือน`;
    }
    if (paymentCell) paymentCell.textContent = formatBaht(row.payment);
    if (eligibleCell) eligibleCell.textContent = formatBaht(row.eligible);
    if (bestBadge) bestBadge.hidden = !(bestSalaryEligible > 0 && row.eligible === bestSalaryEligible);
  });

  setText(output.personnelRemainingFormula, formatBaht(personnelRemainingAfterRequested));
  setText(output.currentPaymentDisplay, formatBaht(currentMonthlyPayment));
  setText(output.newLoanPayment, formatBaht(requestedPayment));
  setText(output.totalPaymentAfter, formatBaht(totalPaymentAfter));
  setText(output.remainingAfterAllPayments, formatBaht(remainingAfterAllPayments));
  setText(output.requiredReserve, formatBaht(requiredReserve));
  setText(output.evaluatedAmount, formatBaht(evaluatedLoansActive.length > 0 ? approvedTotal : rightEligible));

  renderChecks(checks);
}

function buildReportSummary(options = {}) {
  if (!latestCalculation || !output.reportContent) return;

  const report = buildReportViewModel(latestCalculation);
  const { data } = report;
  const printedAt = report.printedAt;
  const borrowerName = report.borrowerName;
  const currentLoanRows = report.currentLoanRows
    .map(({ typeKey, loanType, amount }) => `<tr>
      <td><strong>${typeKey}</strong></td>
      <td>${escapeHtml(loanType.label)}</td>
      <td>${formatBaht(amount)}</td>
    </tr>`)
    .join("");
  const totalEvaluationPayment = report.totalEvaluationPayment;
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
      const loanLabel = loanType ? loanType.label.replace(`${loan.type} `, "") : "ยังไม่ได้เลือกประเภทเงินกู้";
      return `<div class="amortization-contract">
        <div class="table-head amortization-head">
          <h3>สัญญาที่ ${loan.index + 1}: ${loan.type} ${escapeHtml(loanLabel)}</h3>
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
        <span>ชื่อผู้กู้: ${escapeHtml(borrowerName)}</span>
      </div>

      <div class="report-note">
        ผลลัพธ์นี้เป็นการประเมินเบื้องต้นเท่านั้น ไม่ถือเป็นการอนุมัติเงินกู้
      </div>

      <div class="metric-grid repayment-grid report-metrics">
        <div class="metric"><span>ประเภทบุคลากร</span><strong>${escapeHtml(data.employee.label)}</strong></div>
        <div class="metric strong-metric"><span>สิทธิคงเหลือหลังหักยอดเงินกู้ที่ต้องการ</span><strong>${formatBaht(data.personnelRemainingAfterRequested)}</strong></div>
        <div class="metric"><span>ยอดเงินกู้ที่ต้องการ</span><strong>${formatBaht(data.requestedTotal)}</strong></div>
        <div class="metric"><span>ยอดเงินเดือนคงเหลือ</span><strong>${formatBaht(data.salaryRemaining)}</strong></div>
        <div class="metric"><span>ยอดผ่อนสูงสุดต่อเดือน</span><strong>${formatBaht(data.maxNewPayment)}</strong></div>
        <div class="metric"><span>ระยะเวลาผ่อนชำระ</span><strong>${data.months.toLocaleString("th-TH")} เดือน</strong></div>
        <div class="metric"><span>รวมค่างวดที่ใช้ประเมิน</span><strong>${formatBaht(totalEvaluationPayment)}</strong></div>
      </div>

      <div class="current-loan-summary report-card">
        <div class="table-head">
          <h3>ยอดเงินกู้ปัจจุบัน</h3>
          <span>ข้อมูลจากตารางวงเงินกู้สูงสุดตามประเภทเงินกู้</span>
        </div>
        <div class="loan-table-wrap">
          <table class="loan-table compact-table current-loan-summary-table">
            <thead>
              <tr>
                <th>ประเภทเงินกู้</th>
                <th>รายละเอียด</th>
                <th>ยอดเงินกู้ปัจจุบัน</th>
              </tr>
            </thead>
            <tbody>${currentLoanRows || `<tr><td colspan="3">ยังไม่ได้กรอกยอดเงินกู้ปัจจุบัน</td></tr>`}</tbody>
          </table>
        </div>
      </div>

      <div class="contract-summary report-card">
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
                <th>ยอดเงินกู้ที่ต้องการ</th>
                <th>ยอดที่กู้ได้</th>
                <th>ค่างวดที่ใช้ประเมิน</th>
                <th>ผลการประเมิน</th>
              </tr>
            </thead>
            <tbody>${requestedSummaryRows || `<tr><td colspan="6">ยังไม่ได้กรอกยอดเงินกู้ที่ต้องการ</td></tr>`}</tbody>
          </table>
        </div>
      </div>

      <div class="amortization-panel report-card">
        <div class="table-head amortization-panel-title">
          <h3>ตารางผ่อนชำระรายเดือนและดอกเบี้ยเบื้องต้น</h3>
        </div>
        ${amortizationTables || `<div class="report-placeholder">ยังไม่มีสัญญาที่มีวงเงินกู้สำหรับสร้างตารางผ่อน</div>`}
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

function scheduleCalculate(delay = 250) {
  window.clearTimeout(delayedCalculateTimer);
  delayedCalculateTimer = window.setTimeout(() => {
    calculate();
  }, delay);
}

function syncContractMonths(source) {
  if (!fields.contractMonths) return;
  const rawValue = numberValue(source);
  const options = Array.from(fields.contractMonths.options).map((option) => Number(option.value));
  const min = Math.min(...options);
  const max = Math.max(...options);
  const value = Math.min(max, Math.max(min, Math.round(rawValue || min)));
  const nearestValue = options.reduce((nearest, optionValue) => (
    Math.abs(optionValue - value) < Math.abs(nearest - value) ? optionValue : nearest
  ), options[0]);
  fields.contractMonths.value = String(nearestValue);
}

function resetForm() {
  window.clearTimeout(delayedCalculateTimer);
  fields.employeeType.value = "permanentEmployee";
  fields.salaryRemaining.value = 0;
  fields.currentMonthlyPayment.value = 0;
  fields.desiredMonthlyPayment.value = 0;
  fields.contractMonths.value = 24;
  if (fields.borrowerName) fields.borrowerName.value = "";
  document.querySelectorAll(".salary-current-loan-amount").forEach((input) => {
    input.value = 0;
  });
  document.querySelectorAll(".requested-loan-type").forEach((select, index) => {
    select.value = index === 0 ? "1.1" : "";
  });
  document.querySelectorAll(".requested-loan-amount").forEach((input) => {
    input.value = 0;
  });
  syncContractMonths(fields.contractMonths);
  resetReportOutput();
  calculate();
}

renderDynamicTables();
document.querySelector("#loanForm").addEventListener("input", (event) => {
  resetReportOutput();
  if (event.target === fields.desiredMonthlyPayment) {
    scheduleCalculate();
    return;
  }
  if (event.target.matches(".salary-current-loan-amount") || event.target === fields.salaryRemaining || event.target === fields.currentMonthlyPayment) {
    scheduleCalculate();
    return;
  }
  calculate();
});
document.querySelector("#loanForm").addEventListener("change", (event) => {
  window.clearTimeout(delayedCalculateTimer);
  resetReportOutput();
  calculate();
});
document.querySelector("#loanForm").addEventListener("focusin", (event) => {
  if ((event.target.matches(".salary-current-loan-amount") || event.target === fields.desiredMonthlyPayment) && event.target.value === "0") {
    event.target.select();
  }
});
fields.contractMonths?.addEventListener("input", () => {
  syncContractMonths(fields.contractMonths);
  resetReportOutput();
  calculate();
});
fields.salaryRemaining?.addEventListener("focusout", calculate);
fields.currentMonthlyPayment?.addEventListener("focusout", calculate);
document.querySelector("#resetButton").addEventListener("click", resetForm);
output.buildReportButton?.addEventListener("click", () => buildReportSummary({ scroll: true }));
output.pdfButton?.addEventListener("click", createPdfDocument);
syncContractMonths(fields.contractMonths);
calculate();

const applicationPurposeRules = {
  education: { required: ["1.1", "1.2"], hint: "ระบบเลือกเอกสารเบื้องต้น: 1.1 และ 1.2 โปรดตรวจสอบเอกสารการศึกษา/ลงทะเบียนให้ครบถ้วน" },
  housing: { required: ["1.1", "1.5"], hint: "ต้องแนบ 1.1 และ 1.5" },
  equipment: { required: ["1.1", "1.4"], hint: "ต้องแนบ 1.1 และ 1.4" },
  emergency: { required: ["1.1"], hint: "ต้องแนบ 1.1" },
  retirement: { required: ["1.7"], hint: "ระบบเลือกเอกสารเบื้องต้น: 1.7 โปรดตรวจสอบความครบถ้วนก่อนส่งออก" },
};
const applicationPanel = document.querySelector("#applicationPanel");
const showProductView = (viewId) => {
  document.querySelectorAll(".product-tab").forEach((tab) => tab.classList.toggle("active", tab.dataset.view === viewId));
  document.querySelectorAll(".view-panel").forEach((panel) => { panel.hidden = panel.id !== viewId; panel.classList.toggle("active", panel.id === viewId); });
};
document.querySelectorAll(".product-tab").forEach((tab) => tab.addEventListener("click", () => showProductView(tab.dataset.view)));
const thaiAmountText = (value) => { const n = Number(value || 0); if (!n) return ""; const digits = ["ศูนย์", "หนึ่ง", "สอง", "สาม", "สี่", "ห้า", "หก", "เจ็ด", "แปด", "เก้า"]; const places = ["", "สิบ", "ร้อย", "พัน", "หมื่น", "แสน"]; const read = (group) => { let output = ""; const text = String(group); for (let i = 0; i < text.length; i += 1) { const digit = Number(text[i]); const position = text.length - i - 1; if (!digit) continue; if (position === 1 && digit === 2) output += "ยี่"; else if (position === 1 && digit === 1) output += ""; else if (position === 0 && digit === 1 && text.length > 1) output += "เอ็ด"; else output += digits[digit]; output += places[position] || ""; } return output; }; let remaining = Math.floor(n); let output = ""; let million = 0; if (!remaining) output = digits[0]; while (remaining > 0) { const group = remaining % 1000000; if (group) output = read(group) + (million ? "ล้าน" : "") + output; remaining = Math.floor(remaining / 1000000); million += 1; } return `${output}บาทถ้วน`; };
const updateApplicationAttachments = () => { const selected = applicationPanel.querySelector('input[name="applicationPurpose"]:checked'); const rule = selected && applicationPurposeRules[selected.value]; const hint = applicationPanel.querySelector("#applicationRuleHint"); applicationPanel.querySelectorAll("[data-application-attachment]").forEach((box) => box.closest(".attachment-item").classList.remove("required-attachment")); if (!rule) { hint.textContent = "เลือกวัตถุประสงค์เพื่อให้ระบบเลือกเอกสารแนบเบื้องต้น"; return; } hint.textContent = rule.hint; rule.required.forEach((id) => { const box = applicationPanel.querySelector(`[data-application-attachment="${id}"]`); if (box) { box.checked = true; box.closest(".attachment-item").classList.add("required-attachment"); } }); };
applicationPanel.querySelectorAll('input[name="applicationPurpose"]').forEach((radio) => radio.addEventListener("change", updateApplicationAttachments));
const syncBorrowerName = (value) => { document.querySelector("#borrowerName").value = value; document.querySelector("#applicationBorrowerName").value = value; };
document.querySelector("#borrowerName")?.addEventListener("input", (event) => { document.querySelector("#applicationBorrowerName").value = event.target.value; });
document.querySelector("#applicationBorrowerName")?.addEventListener("input", (event) => { document.querySelector("#borrowerName").value = event.target.value; });
const syncCalculationToApplication = () => { if (!latestCalculation) calculate(); const active = latestCalculation?.evaluatedLoansActive || []; const amount = active.length ? latestCalculation.approvedTotal : latestCalculation?.rightEligible || 0; const payment = active.length ? latestCalculation.requestedPayment : principalOnlyPayment(amount, Number(fields.contractMonths.value)); document.querySelector("#applicationAmount").value = Math.max(0, Math.round(amount)); document.querySelector("#applicationAmountText").value = thaiAmountText(amount); document.querySelector("#applicationMonths").value = fields.contractMonths.value; document.querySelector("#applicationMonthlyPayment").value = Math.max(0, Math.round(payment)); syncBorrowerPrefix(document.querySelector("#borrowerPrefix").value); syncBorrowerName(document.querySelector("#borrowerName").value); const type = active[0]?.type; const purpose = type === "1.3" ? "equipment" : type === "1.4" ? "housing" : type === "1.5" ? "emergency" : "education"; const radio = applicationPanel.querySelector(`input[name="applicationPurpose"][value="${purpose}"]`); if (radio) { radio.checked = true; updateApplicationAttachments(); if (type === "1.6") { ["1.1", "1.2", "1.6"].forEach((id) => { const box = applicationPanel.querySelector(`[data-application-attachment="${id}"]`); if (box) { box.checked = true; box.closest(".attachment-item").classList.add("required-attachment"); } }); applicationPanel.querySelector("#applicationRuleHint").textContent = "ระบบเลือกเอกสารเบื้องต้นสำหรับค่าเล่าเรียนบุตร: 1.1, 1.2 และ 1.6 โปรดตรวจสอบความครบถ้วนก่อนส่งออก"; } } showProductView("applicationPanel"); };
document.querySelector("#useCalculationButton").addEventListener("click", syncCalculationToApplication);
document.querySelector("#applicationAmount").addEventListener("input", (event) => { document.querySelector("#applicationAmountText").value = thaiAmountText(event.target.value); });
document.querySelector("#applicationClearButton").addEventListener("click", () => { applicationPanel.querySelectorAll("input,textarea").forEach((input) => { if (input.type === "checkbox" || input.type === "radio") input.checked = false; else input.value = ""; }); applicationPanel.querySelectorAll("select").forEach((select) => { select.selectedIndex = 0; }); document.querySelector('input[name="applicationWrittenAt"]').value = "สำนักดิจิทัลเทคโนโลยี"; updateApplicationAttachments(); });



const syncBorrowerPrefix = (value) => { const applicationPrefix = document.querySelector('select[name="applicationPrefix"]'); if (applicationPrefix && value) applicationPrefix.value = value; };
document.querySelector("#borrowerPrefix")?.addEventListener("change", (event) => syncBorrowerPrefix(event.target.value));
document.querySelector('select[name="applicationPrefix"]')?.addEventListener("change", (event) => { const borrowerPrefix = document.querySelector("#borrowerPrefix"); if (borrowerPrefix) borrowerPrefix.value = event.target.value; });

const applicationFieldValue = (selector) => document.querySelector(selector)?.value?.trim() || "";
const fullApplicationName = (prefixSelector, nameSelector) => [applicationFieldValue(prefixSelector), applicationFieldValue(nameSelector)].filter(Boolean).join(" ");
const setPdfText = (form, fieldName, value) => {
  try { form.getTextField(fieldName).setText(value || ""); } catch (error) { console.warn(`ไม่พบช่อง PDF: ${fieldName}`, error); }
};
const setPdfAttachment = (form, fieldName, checked) => {
  try {
    const checkbox = form.getCheckBox(fieldName);
    if (checked) checkbox.check(); else checkbox.uncheck();
    return;
  } catch (error) { /* ช่องเอกสารแนบบางโปรแกรมสร้างเป็น radio แบบมีตัวเลือกเดียว */ }
  const radio = form.getRadioGroup(fieldName);
  if (checked) radio.select("Yes"); else radio.clear();
};
const exportApplicationPdf = async () => {
  const button = document.querySelector("#applicationPdfButton");
  const purpose = applicationPanel.querySelector('input[name="applicationPurpose"]:checked')?.value;
  const borrower = fullApplicationName('select[name="applicationPrefix"]', "#applicationBorrowerName");
  const amount = applicationFieldValue("#applicationAmount");
  const months = applicationFieldValue("#applicationMonths");
  const monthlyPayment = applicationFieldValue("#applicationMonthlyPayment");
  if (!borrower || !amount || !months || !monthlyPayment || !purpose) {
    alert("กรุณากรอกชื่อผู้กู้ จำนวนเงิน จำนวนงวด ค่างวดรายเดือน และวัตถุประสงค์ก่อนส่งออก PDF");
    return;
  }
  if (!window.PDFLib || !window.PDF_TEMPLATE_BASE64) {
    alert("ไม่สามารถเปิดแม่แบบ PDF ได้ กรุณาลองใหม่อีกครั้ง");
    return;
  }
  const originalLabel = button.textContent;
  button.disabled = true;
  button.textContent = "กำลังสร้าง PDF...";
  try {
    const bytes = Uint8Array.from(atob(window.PDF_TEMPLATE_BASE64), (character) => character.charCodeAt(0));
    const pdfDocument = await window.PDFLib.PDFDocument.load(bytes, { ignoreEncryption: true });
    const form = pdfDocument.getForm();
    setPdfText(form, "เขียนที่", applicationFieldValue('input[name="applicationWrittenAt"]'));
    setPdfText(form, "วันที่", applicationFieldValue('input[name="applicationDate"]'));
    setPdfText(form, "ผู้กู้", borrower);
    setPdfText(form, "ตําแหน่ง", applicationFieldValue('[name="applicationPosition"]'));
    setPdfText(form, "สังกัด", applicationFieldValue('select[name="applicationDepartment"]'));
    setPdfText(form, "จำนวนเงินที่ขอกู้", amount);
    setPdfText(form, "จำนวนเงินเป็นตัวอักษร", applicationFieldValue("#applicationAmountText") || thaiAmountText(amount));
    setPdfText(form, "ระยะเวลาผ่อน (เดือน)", months);
    setPdfText(form, "ยอดผ่อนรายเดือน", monthlyPayment);
    setPdfText(form, "ผู้ค้ำ ที่1", fullApplicationName('select[name="applicationGuarantor1Prefix"]', 'input[name="applicationGuarantor1"]'));
    setPdfText(form, "ผู้ค้ำ ที่2", fullApplicationName('select[name="applicationGuarantor2Prefix"]', 'input[name="applicationGuarantor2"]'));
    setPdfText(form, "ข้าพเจ้า", borrower);
    form.getRadioGroup("loan_purpose").select(purpose);
    applicationPanel.querySelectorAll("[data-application-attachment]").forEach((input) => {
      setPdfAttachment(form, `attachment_${input.dataset.applicationAttachment.replace('.', '_')}`, input.checked);
    });
    form.acroForm.dict.set(window.PDFLib.PDFName.of("NeedAppearances"), window.PDFLib.PDFBool.True);
    const completedPdf = await pdfDocument.save({ updateFieldAppearances: false });
    const downloadUrl = URL.createObjectURL(new Blob([completedPdf], { type: "application/pdf" }));
    const link = document.createElement("a");
    link.href = downloadUrl;
    link.download = `คำขอกู้ยืมเงินสวัสดิการ-${borrower.replace(/\s+/g, "-") || "ผู้กู้"}.pdf`;
    link.click();
    URL.revokeObjectURL(downloadUrl);
  } catch (error) {
    console.error(error);
    alert("สร้าง PDF ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง");
  } finally {
    button.disabled = false;
    button.textContent = originalLabel;
  }
};
document.querySelector("#applicationPdfButton")?.addEventListener("click", exportApplicationPdf);

