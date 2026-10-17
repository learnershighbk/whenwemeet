// UserPromptSubmit hook: append each user prompt to session_log.md in the project root.
const fs = require("fs");
const path = require("path");

let raw = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", (c) => (raw += c));
process.stdin.on("end", () => {
  let input = {};
  try {
    input = JSON.parse(raw);
  } catch {
    return;
  }
  const prompt = input.prompt;
  if (!prompt) return;
  // Background-task and system notifications arrive on the same channel; they are not user input.
  const head = prompt.trimStart().slice(0, 200);
  if (head.startsWith("<task-notification>") || head.startsWith("<system-reminder>") || head.includes("[SYSTEM NOTIFICATION")) return;

  const root = process.env.CLAUDE_PROJECT_DIR || input.cwd || process.cwd();
  const file = path.join(root, "session_log.md");

  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  const ts = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;

  if (!fs.existsSync(file)) {
    fs.writeFileSync(file, "# Session Log\n\nTerminal input, recorded in order.\n");
  }
  fs.appendFileSync(file, `\n---\n\n## ${ts}\n\n${prompt}\n`);
});
