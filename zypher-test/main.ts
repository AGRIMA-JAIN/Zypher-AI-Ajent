import {
  AnthropicModelProvider,
  createZypherContext,
  ZypherAgent,
} from "jsr:@corespeed/zypher";
import { eachValueFrom } from "npm:rxjs-for-await";
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { extname, join } from "https://deno.land/std@0.224.0/path/mod.ts";

function getRequiredEnv(name: string): string {
  const value = Deno.env.get(name);
  if (!value) {
    console.error(`Environment variable ${name} is not set`);
    Deno.exit(1);
  }
  return value;
}

console.log("Starting Zypher Fitness server...");

const zypherContext = await createZypherContext(Deno.cwd());
console.log("✅ Zypher context created");

const agent = new ZypherAgent(
  zypherContext,
  new AnthropicModelProvider({
    apiKey: getRequiredEnv("ANTHROPIC_API_KEY"),
  }),
);
console.log("✅ Zypher agent created");


async function runTaskToText(prompt: string): Promise<string> {
  const event$ = agent.runTask(prompt, "claude-sonnet-4-20250514");
  let text = "";
  for await (const ev of eachValueFrom(event$)) {
    if (ev.type === "text") {
      text += ev.content;
    }
  }
  return text;
}

const publicRoot = join(Deno.cwd(), "public");

async function serveStatic(pathname: string): Promise<Response | null> {
  const filePath =
    pathname === "/" ? join(publicRoot, "index.html") : join(publicRoot, pathname);

  try {
    const data = await Deno.readFile(filePath);
    const ext = extname(filePath);
    const contentType =
      ext === ".html"
        ? "text/html; charset=utf-8"
        : ext === ".js"
        ? "text/javascript; charset=utf-8"
        : ext === ".css"
        ? "text/css; charset=utf-8"
        : "application/octet-stream";

    return new Response(data, {
      headers: { "Content-Type": contentType },
    });
  } catch {
    return null;
  }
}


serve(async (req) => {
  const url = new URL(req.url);
  const pathname = url.pathname;

  
  if (req.method === "POST" && pathname === "/api/plan") {
    const { goal, days } = await req.json();

    const prompt = `
You are a certified fitness coach. Create a one-week workout plan as a CSV table.

User goal:
"${goal}"

Max active workout days per week: ${days}

Requirements:
- Make it safe and realistic.
- Include a mix of strength, mobility, and recovery.
- Tailor intensity to the described goal.

Return ONLY a CSV fenced block like:

\`\`\`csv
Day,Focus,Exercise 1,Exercise 2,Exercise 3,Optional Notes
...
\`\`\`
`;

    const raw = await runTaskToText(prompt);

    return new Response(
      JSON.stringify({
        csv: raw,
        log: [
          `User: Generate plan (goal="${goal}", days=${days})`,
          "Zypher: Plan CSV received.",
        ],
      }),
      { headers: { "Content-Type": "application/json" } },
    );
  }

  if (req.method === "POST" && pathname === "/api/plan/edit") {
    const { csv, instructions } = await req.json();

    const prompt = `
You are editing an EXISTING weekly workout plan stored as CSV.

Current plan:

\`\`\`csv
${csv}
\`\`\`

User edit instructions:
"${instructions}"

Apply ONLY these changes to the plan. You may:
- Delete rows (days)
- Insert rows (days)
- Modify exercises, focus, or notes

Return ONLY the UPDATED plan as a CSV fenced block:

\`\`\`csv
Day,Focus,Exercise 1,Exercise 2,Exercise 3,Optional Notes
...
\`\`\`
`;

    const raw = await runTaskToText(prompt);

    return new Response(
      JSON.stringify({
        csv: raw,
        log: [
          `User: Edit plan ("${instructions}")`,
          "Zypher: Updated plan CSV received.",
        ],
      }),
      { headers: { "Content-Type": "application/json" } },
    );
  }

  const staticResponse = await serveStatic(
    pathname === "/" ? "/" : pathname.replace(/^\/+/, ""),
  );
  if (staticResponse) return staticResponse;

  return new Response("Not found", { status: 404 });
});

console.log("🌐 Server listening on http://localhost:8000");
