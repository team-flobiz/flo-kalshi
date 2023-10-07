const resultInput = document.getElementById("result");
const historyElement = document.getElementById("history");
const muButton = document.getElementById("mu");
const gstBreakups = document.getElementById("gst-breakups");
let currentInput = document.getElementById("current-input");

const invalidInputText = "Invalid Input";
let history = [];

const format = (result) => (result % 1 === 0 ? result : result.toFixed(2));
const operators = {
  "+": (a, b) => format(a + b),
  "-": (a, b) => format(a - b),
  "*": (a, b) => format(a * b),
  "/": (a, b) => format(a / b),
  "%": (a, b) => format((a * b) / 100),
  "- GST": (a, b) => format(a / (1 + b / 100)),
  "+ GST": (a, b) => format(a * (1 + b / 100)),
  MU: (a, b) => format(a / ((100 - b) / 100))
};

function updateResult(text) {
  resultInput.innerHTML = `= ${text}`;
  addToHistory(currentInput.textContent, text);
}

// Define the function to update the input area
function updateInputArea(text) {
  historyElement.textContent = text;
}

// Event listener for the back button
const backButton = document.querySelector(".icon-back");
backButton.addEventListener("click", () => {
  triggerEvent("delete");
  onBackPress();
});

let clearIntervalId;
backButton.addEventListener("mousedown", () => {
  clearIntervalId = setInterval(onBackPress, 100);
});

backButton.addEventListener("mouseup", () => {
  clearInterval(clearIntervalId);
});

backButton.addEventListener("mouseleave", () => {
  clearInterval(clearIntervalId);
});

const onBackPress = () => {
  let historyText = currentInput.textContent;

  // If back pressed after = then, move the result to current input
  if (resultInput.textContent && currentInput.textContent.length === 0) {
    const lastTransaction = history[history.length - 1];
    historyText = lastTransaction.result.toString();
    resultInput.textContent = "";
  }
  currentInput.textContent = historyText.slice(0, -1);
  gstBreakups.style.display = "none";
};

const triggerEvent = (key) => {
  try {
    Android.click();
  } catch (error) {}

  let event;
  const attr = {};

  event = "calculator_special_button_clicked";
  if (key == "AC") event = "calculator_all_clear";
  else if (key == "delete") {
    attr.button = "delete";
  } else if (key == "GT" || key == "MU" || key == "delete") {
    attr.button = key;
  } else if (key == "=") {
    attr.button = "equals";
  } else if (key == "cash_in" || key == "cash_out") {
    const amount = history[history.length - 1]?.result ?? 0;
    if (parseFloat(amount) == 0) return;

    event = `calculator_${key}`;
    attr.amount = amount;
  } else if (key.includes("GST")) {
    attr.button = "GST";
    if (key.includes("%")) attr.GST = key.match(/GST (\d+(\.\d+)?)%/)[1];
    else attr.GST = "custom";
  } else {
    event = null;
  }

  try {
    if (event) Android.triggerEvent(event, JSON.stringify(attr));
  } catch (error) {}
};

const handleGSTValues = (a, op, result, clear = false) => {
  if (clear) {
    gstBreakups.style.display = "none";
    return;
  }

  result = parseFloat(result);

  if (op.includes("GST")) {
    gstBreakups.style.display = "flex";
    let gstValue;

    if (op == "+ GST") gstValue = result - a;
    else gstValue = a - result;

    gstValue = format(gstValue);

    const sgstValue = (gstValue / 2).toFixed(2);
    const cgstValue = (gstValue / 2).toFixed(2);

    document.getElementById("gst-value").textContent = gstValue;
    document.getElementById("sgst-value").textContent = sgstValue;
    document.getElementById("cgst-value").textContent = cgstValue;
  }
};

// Event listener for keypad buttons
const keypadButtons = document.querySelectorAll("button");
keypadButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const buttonText = button.value;

    triggerEvent(buttonText.trim());

    // Check for special buttons
    switch (buttonText) {
      case "=":
        const result = calculateFromString(currentInput.textContent);
        if (result != invalidInputText) updateResult(result);
        else resultInput.innerHTML = result;
        break;
      case "AC":
        history = [];
        generateCurrentInput(true);
        handleGSTValues(null, null, null, true);
        break;
      case "GT":
        // Don't add GT if history is empty or last item is GT
        if (history.length == 0 || history[history.length - 1].expression.includes("GT")) return;

        const gtValue = history.map((item) => item.result).reduce((a, b) => a + b, 0);
        addToHistory("GT", gtValue);
        handleGSTValues(null, null, null, true);
        break;
      case "cash_in":
        try {
          Android.cashIn(history[history.length - 1]?.result ?? 0);
        } catch (error) {}
        break;
      case "cash_out":
        try {
          Android.cashOut(history[history.length - 1]?.result ?? 0);
        } catch (error) {}
        break;
      default:
        if (shouldAdd(buttonText.trim())) currentInput.textContent += buttonText;
    }
  });
});

const shouldAdd = (buttonText) => {
  let inputString = currentInput.textContent.trim();
  const lastChar = inputString[inputString.length - 1];

  // If last char is an operator, replace it with the new operator
  if (Object.keys(operators).includes(lastChar) && Object.keys(operators).includes(buttonText)) {
    currentInput.textContent = currentInput.textContent.slice(0, -1);
    currentInput.textContent += buttonText;
    return false;
  }
  // If last char is an operator, don't add another operator
  if (
    (Object.keys(operators).includes(lastChar) && lastChar == buttonText) ||
    (inputString.endsWith("MU") && buttonText == "MU")
  ) {
    return false;
  }
  return true;
};

function addToHistory(expression, result) {
  // Replace GST with GST %
  expression = expression.replace(/(GST \d+(?:\.\d+)?)(%?)/, sanitizeGST);
  history.push({ expression, result });
  currentInput.remove();
  historyElement.innerHTML = history
    .map(
      (item) =>
        `<li><span id="li-expression">${item.expression}</span> = <span id="li-result">${item.result}</span></li>`
    )
    .join("");

  generateCurrentInput();
}

const generateCurrentInput = (reset = false) => {
  const liItem = document.createElement("li");
  liItem.id = "current-input";

  const spanExpression = document.createElement("span");
  spanExpression.id = "li-expression";
  const spanResult = document.createElement("span");
  spanResult.id = "li-result";

  liItem.appendChild(spanExpression);
  liItem.appendChild(spanResult);

  if (reset) {
    historyElement.innerHTML = liItem.outerHTML;
    resultInput.innerHTML = "";
  } else historyElement.appendChild(liItem);

  currentInput = document.getElementById("current-input");
};

const sanitizeInput = (inputString, operators) => {
  if (inputString.length === 0) {
    return inputString;
  }

  inputString = inputString.trim();
  inputString = inputString.replace(/(GST \d+(?:\.\d+)?)(%?)/, sanitizeGST);

  if (Object.keys(operators).includes(inputString[0]) && history.length > 0) {
    inputString = history[history.length - 1].result + inputString;
  }

  inputString = inputString.replace(/x/g, "*");
  inputString = inputString.replace(/÷/g, "/");
  inputString = inputString.replace(/%/g, "%");

  return inputString;
};

// Replace GST with GST %
const sanitizeGST = (match, amount, percent) => {
  if (percent === "%") return match;
  else return amount + "%";
};

/**
 *
 * @param {String} inputString
 * @returns {Number} Calculated result
 */
function calculateFromString(inputString) {
  inputString = sanitizeInput(inputString, operators);

  const precedence = {
    "+": 1,
    "-": 1,
    "*": 2,
    "/": 2,
    "%": 3,
    "+ GST": 3,
    "- GST": 3,
    MU: 3
  };

  const isOperator = (token) => token in operators || token.includes("GST");
  const isPercent = (nextToken) =>
    nextToken && nextToken.endsWith("%") && !nextToken.includes("GST");

  const getGSTPercent = (token) => {
    const regex = /(\d+(\.\d+)?)%/;
    const match = token.match(regex);

    if (match && match[1]) return parseFloat(match[1]);
    else return null;
  };

  const parseExpression = (tokens) => {
    try {
      const values = [];
      const ops = [];

      const handlePercentage = (currentToken, percent) => {
        if (ops.length > 0) applyOp();
        ops.push(currentToken);
        ops.push("%");
        values.push(percent);
      };

      const handleGST = (currentToken, percent) => {
        ops.push(`${currentToken} GST`);
        values.push(percent);
      };

      const applyOp = () => {
        const op = ops.pop();
        const b = values.pop();
        let a;
        /* Don't pop() for %, as required to evaluate next operator */
        if (op === "%") a = values[values.length - 1];
        else a = values.pop();

        const result = operators[op](parseFloat(a), parseFloat(b));
        values.push(result);
        handleGSTValues(a, op, result);
        return result;
      };

      for (let i = 0; i < tokens.length; i++) {
        let token = tokens[i];

        // Skip empty spaces
        if (token === " ") continue;

        // Handle MU with %
        if (ops[ops.length - 1] == "MU" && isPercent(token)) token = parseFloat(token);

        if (!isNaN(token)) values.push(parseFloat(token));
        else if (isOperator(token)) {
          const currentPrec = precedence[token];

          const nextToken = tokens[i + 1];
          const percent = isPercent(nextToken) && token != "MU";
          const isGST = nextToken.includes("GST");

          if (percent) handlePercentage(token, parseFloat(nextToken));
          if (isGST) {
            handleGST(token, getGSTPercent(nextToken));
            i++;
          }

          while (ops.length && precedence[ops[ops.length - 1]] >= currentPrec) applyOp();

          /* Don't add operator for %, as already added in handlePercent() */
          if (!percent && !isGST) ops.push(token);
        }
      }

      while (ops.length) applyOp();

      return Number.isNaN(values[0])
        ? invalidInputText
        : values[0] == "NaN"
        ? invalidInputText
        : values[0] ?? invalidInputText;
    } catch (error) {
      return invalidInputText;
    }
  };

  const tokens = inputString.match(/\d+\.\d+%?|\d+%?|[+\-*\/%]|GST\s\d+%?|%|MU/g) || [];
  return parseExpression(tokens);
}
