const resultInput = document.getElementById("result");
const historyElement = document.getElementById("history");
const gtButton = document.getElementById("gt");
const muButton = document.getElementById("mu");
let currentInput = document.getElementById("current-input");

const invalidInputText = "Invalid Input";
let history = [];

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
  const historyText = currentInput.textContent;
  currentInput.textContent = historyText.slice(0, -1);
});

// Event listener for keypad buttons
const keypadButtons = document.querySelectorAll("button");
keypadButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const buttonText = button.value;

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
        break;
      case "GT":
        const gtValue = history.map((item) => item.result).reduce((a, b) => a + b, 0);
        addToHistory("GT", gtValue);
        break;
      default:
        currentInput.textContent += buttonText;
    }
  });
});

function addToHistory(expression, result) {
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

gtButton.addEventListener("click", () => {});

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

/**
 *
 * @param {String} inputString
 * @returns {Number} Calculated result
 */
function calculateFromString(inputString) {
  const operators = {
    "+": (a, b) => format(a + b),
    "-": (a, b) => format(a - b),
    "*": (a, b) => format(a * b),
    "/": (a, b) => format(a / b),
    "%": (a, b) => format((a * b) / 100),
    MU: (a, b) => format(a / ((100 - b) / 100))
  };

  inputString = sanitizeInput(inputString, operators);

  const precedence = {
    "+": 1,
    "-": 1,
    "*": 2,
    "/": 2,
    "%": 3,
    MU: 3
  };

  const isOperator = (token) => token in operators;
  const isPercent = (nextToken) => nextToken && nextToken.endsWith("%");
  const format = (result) => (result % 1 === 0 ? result : result.toFixed(2));

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

      const applyOp = () => {
        const op = ops.pop();
        const b = values.pop();
        let a;
        /* Don't pop() for %, as required to evaluate next operator */
        if (op === "%") a = values[values.length - 1];
        else a = values.pop();

        const result = operators[op](parseFloat(a), parseFloat(b));
        values.push(result);
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

          if (percent) handlePercentage(token, parseFloat(nextToken));

          while (ops.length && precedence[ops[ops.length - 1]] >= currentPrec) applyOp();

          /* Don't add operator for %, as already added in handlePercent() */
          if (!percent) ops.push(token);
        }
      }

      while (ops.length) applyOp();

      return Number.isNaN(values[0]) ? invalidInputText : values[0] ?? invalidInputText;
    } catch (error) {
      return invalidInputText;
    }
  };

  const tokens = inputString.match(/\d+(\.\d+)?%?|[+\-*\/%]|MU/g) || [];
  return parseExpression(tokens);
}

const sanitizeInput = (inputString, operators) => {
  if (inputString.length === 0) {
    return inputString;
  }

  if (Object.keys(operators).includes(inputString[0]) && history.length > 0) {
    inputString = history[history.length - 1].result + inputString;
  }

  inputString = inputString.replace(/x/g, "*");
  inputString = inputString.replace(/÷/g, "/");
  inputString = inputString.replace(/%/g, "%");

  return inputString;
};
