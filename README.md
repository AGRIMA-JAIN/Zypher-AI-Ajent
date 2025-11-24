# Zypher-AI-Agent
A Zypher powered AI fitness planner that generates  weekly workout plans through natural-language instructions

It takes natural-language goals (e.g., “4-day low-impact routine for fat loss”) and generates a full 7-day workout plan.
You can also update the plan using natural-language edit commands.

**Features**

Generate weekly workout plans using Anthropic (Claude) through Zypher
Supports natural-language edits (modify, replace, delete, or insert days)
Simple browser UI 

**Deno-powered backend with two endpoints:**

POST /api/plan – generate plan

POST /api/plan/edit – update existing plan

**Requirements**

Deno 2.0+

Anthropic API Key

**Create a .env file in the project folder:**
ANTHROPIC_API_KEY=your_key_here

**Running the Project**
From inside the project folder:

**deno run -A --env-file=.env server.ts**


**Open in your browser:**

http://localhost:8000
