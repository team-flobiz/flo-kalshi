const resultInput = document.getElementById("result");
const historyElement = document.getElementById("history");

let currentInput = "";
let currentTotal = null;
let history = [];

function updateResult(text) {
  resultInput.innerHTML = `= ${text}`;
}

// Define the function to update the input area
function updateInputArea(text) {
  historyElement.textContent = text;
}

// Event listener for the back button
const backButton = document.querySelector(".icon-back");
backButton.addEventListener("click", () => {
  const historyText = historyElement.textContent;
  historyElement.textContent = historyText.slice(0, -1);
});

// Event listener for keypad buttons
const keypadButtons = document.querySelectorAll(".keypad button");
keypadButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const buttonText = button.textContent;

    // Check for special buttons
    if (buttonText === "=") {
      updateResult(calculateFromString(historyElement.innerHTML));
    } else if (buttonText === "AC") historyElement.textContent = "";
    else historyElement.textContent += buttonText;
  });
});

function addToHistory(expression, result) {
  history.push(`${expression} = ${result}`);
  historyElement.innerHTML = history.map((item) => `<li>${item}</li>`).join("");
}

/**
 *
 * @param {String} inputString
 * @returns {Number} Calculated result
 */
function calculateFromString(inputString) {
  const operators = {
    "+": (a, b) => a + b,
    "-": (a, b) => a - b,
    "*": (a, b) => a * b,
    "/": (a, b) => a / b,
    "%": (a, b) => (a * b) / 100
  };

  const precedence = {
    "+": 1,
    "-": 1,
    "*": 2,
    "/": 2,
    "%": 3
  };

  const isOperator = (token) => token in operators;
  const isPercent = (nextToken) => nextToken && nextToken.endsWith("%");

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
        const token = tokens[i];

        // Skip empty spaces
        if (token === " ") continue;

        if (!isNaN(token)) values.push(parseFloat(token));
        else if (isOperator(token)) {
          const currentPrec = precedence[token];

          const nextToken = tokens[i + 1];
          const percent = isPercent(nextToken);

          if (percent) handlePercentage(token, parseInt(nextToken));

          while (ops.length && precedence[ops[ops.length - 1]] >= currentPrec)
            applyOp();

          /* Don't add operator for %, as already added in handlePercent() */
          if (!percent) ops.push(token);
        }
      }

      while (ops.length) applyOp();

      return Number.isNaN(values[0]) ? 0 : values[0] ?? 0;
    } catch (error) {
      return "Invalid Input";
    }
  };

  const tokens = inputString.match(/\d+(\.\d+)?%?|[+\-*\/%]/g) || [];
  return parseExpression(tokens);
}

console.log(calculateFromString("100*4+20%+25*4-10%"));
