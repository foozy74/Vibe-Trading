# Vibe-Trading: AI-Powered Finance Workspace

Vibe-Trading is an advanced AI agent system designed for financial research, strategy generation, and backtesting across multiple markets (A-shares, US/HK equities, Crypto, Futures, and Forex). It leverages a ReAct agent architecture with 68 specialized finance skills and 29 swarm intelligence presets.

## Project Overview

- **Purpose:** Transform natural language requests into executable trading strategies and deep research insights.
- **Core Technologies:**
    - **Backend:** Python 3.11+, FastAPI, LangChain, LangGraph.
    - **Frontend:** React 19, Vite, TypeScript, Tailwind CSS.
    - **Data Sources:** yfinance, AKShare, OKX, CCXT, Tushare.
    - **Architecture:** Multi-agent "Swarm" intelligence for complex workflows and a ReAct agent for tool-based reasoning.
- **Key Components:**
    - `agent/`: Python backend containing the agent core, skills, and backtesting engines.
    - `agent/src/agent/`: Core reasoning loop and agent logic.
    - `agent/src/skills/`: 68 finance-specific skills defined in Markdown.
    - `agent/backtest/`: Multi-market backtesting engines (China A, Global Equity, Crypto, China Futures, Global Futures, Forex).
    - `frontend/`: Modern web UI for interacting with the agent and visualizing results.
    - `mcp_server.py`: Model Context Protocol server exposing 17 finance tools to external clients.

## Building and Running

### Prerequisites
- Python 3.11+
- Node.js & npm (for frontend development)
- Docker (optional, for containerized deployment)
- LLM API Key (OpenAI, DeepSeek, Gemini, Groq, etc.) or local Ollama.

### Backend Setup
1. Install dependencies:
   ```bash
   pip install -e .
   ```
2. Configure environment:
   ```bash
   cp agent/.env.example agent/.env
   # Edit agent/.env with your LLM provider and API key
   ```
3. Initialize the environment:
   ```bash
   vibe-trading init
   ```

### Running the Application
- **Interactive CLI (TUI):**
  ```bash
  vibe-trading
  ```
- **API Server & Web UI:**
  ```bash
  vibe-trading serve --port 8899
  ```
- **Frontend Development Server:**
  ```bash
  cd frontend
  npm install
  npm run dev
  ```
- **MCP Server:**
  ```bash
  vibe-trading-mcp
  ```

### Docker Deployment
```bash
docker compose up --build
```

## Development Conventions

- **Python Standards:**
    - Follows PEP 8 with a line length of 120 (configured in `ruff`).
    - Uses `pydantic` for data validation and `FastAPI` for the REST API.
    - Core logic resides in `agent/src/`.
- **Agent Skills:**
    - New skills should be added to `agent/src/skills/` as `SKILL.md` files.
    - Skills are categorized into: Data Source, Strategy, Analysis, Asset Class, Crypto, Flow, and Tool.
- **Testing:**
    - Test files are located in `agent/tests/`.
    - Run tests using `pytest`:
      ```bash
      pytest agent/tests
      ```
- **Frontend Standards:**
    - Uses React 19 and Tailwind CSS v4.
    - State management via `Zustand`.
    - Components are located in `frontend/src/components/`.

## Key Commands Reference

- `vibe-trading run -p "prompt"`: Execute a single strategy or research request.
- `vibe-trading --swarm-run <preset>`: Run a specialized multi-agent team.
- `vibe-trading --list`: List recent runs and their IDs.
- `vibe-trading --show <run_id>`: Show detailed results and metrics for a run.
- `vibe-trading --pine <run_id>`: Export generated strategy as TradingView Pine Script v6.
- `vibe-trading --trace <run_id>`: Replay the agent's reasoning process.
