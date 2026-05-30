import express from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

const app = express();
app.use(express.json());

const PORT = 3000;

// Lazy initialization of Gemini API
let aiClient: GoogleGenAI | null = null;
function getAiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is missing.");
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiClient;
}

// Global simulated telemetry state
interface LogEntry {
  timestamp: string;
  subsystem: "VIRGIL" | "FLUX" | "LOCUS" | "CORAL";
  level: "INFO" | "WARNING" | "CRITICAL" | "RESOLVED";
  message: string;
}

interface TelemetryState {
  systemMode: "NOMINAL" | "LOAD_SPIKE" | "GRAPH_ANOMALY" | "INTRUSION_ATTACK";
  uptimeSeconds: number;
  cpuUsage: number;
  memoryUsageGB: number;
  ebpfSyscallsRate: number;
  taintScoreMax: number;
  activeLocusSessions: number;
  coralMessageQueue: number;
  incidentCount: number;
  logsList: LogEntry[];
}

let telemetry: TelemetryState = {
  systemMode: "NOMINAL",
  uptimeSeconds: 847230,
  cpuUsage: 14.2,
  memoryUsageGB: 6.4,
  ebpfSyscallsRate: 2100,
  taintScoreMax: 12,
  activeLocusSessions: 18,
  coralMessageQueue: 2,
  incidentCount: 0,
  logsList: [
    { timestamp: new Date().toISOString(), subsystem: "CORAL", level: "INFO", message: "Coral Integration Backbone connected to source GitHub repositories." },
    { timestamp: new Date().toISOString(), subsystem: "VIRGIL", level: "INFO", message: "eBPF kernel-level probes loaded successfully on Ring-0 namespaces." },
    { timestamp: new Date().toISOString(), subsystem: "FLUX", level: "INFO", message: "FluxTrace Temporal Graph Neural Network initialized. Loaded 45,000 transaction paths." },
    { timestamp: new Date().toISOString(), subsystem: "LOCUS", level: "INFO", message: "LocusNexus machine-to-machine checkout engine standing by." }
  ]
};

// Increment uptime periodically
setInterval(() => {
  telemetry.uptimeSeconds += 1;
  
  // Fluctuate metrics depending on system mode
  const variance = () => (Math.random() - 0.5) * 2;
  
  if (telemetry.systemMode === "NOMINAL") {
    telemetry.cpuUsage = Math.max(8, Math.min(22, 12 + variance() * 3));
    telemetry.memoryUsageGB = Math.max(5.8, Math.min(7.2, 6.5 + variance() * 0.1));
    telemetry.ebpfSyscallsRate = Math.floor(Math.max(1800, Math.min(2500, 2100 + variance() * 150)));
    telemetry.taintScoreMax = Math.floor(Math.max(5, Math.min(22, 14 + variance() * 4)));
    telemetry.activeLocusSessions = Math.floor(Math.max(12, Math.min(25, 18 + variance() * 2)));
    telemetry.coralMessageQueue = Math.floor(Math.max(0, Math.min(5, 2 + variance() * 1)));
  } else if (telemetry.systemMode === "LOAD_SPIKE") {
    telemetry.cpuUsage = Math.max(78, Math.min(94, 86 + variance() * 5));
    telemetry.memoryUsageGB = Math.max(11.2, Math.min(14.5, 12.8 + variance() * 0.5));
    telemetry.ebpfSyscallsRate = Math.floor(Math.max(8500, Math.min(11200, 9800 + variance() * 400)));
    telemetry.taintScoreMax = Math.floor(Math.max(10, Math.min(30, 18 + variance() * 5)));
    telemetry.activeLocusSessions = Math.floor(Math.max(35, Math.min(50, 42 + variance() * 3)));
    telemetry.coralMessageQueue = Math.floor(Math.max(22, Math.min(48, 35 + variance() * 6)));
  } else if (telemetry.systemMode === "GRAPH_ANOMALY") {
    telemetry.cpuUsage = Math.max(35, Math.min(55, 44 + variance() * 4));
    telemetry.memoryUsageGB = Math.max(8.5, Math.min(9.9, 9.2 + variance() * 0.2));
    telemetry.ebpfSyscallsRate = Math.floor(Math.max(3000, Math.min(4200, 3600 + variance() * 200)));
    telemetry.taintScoreMax = Math.floor(Math.max(88, Math.min(98, 94 + variance() * 2))); // High taint score!
    telemetry.activeLocusSessions = Math.floor(Math.max(15, Math.min(28, 20 + variance() * 2)));
    telemetry.coralMessageQueue = Math.floor(Math.max(15, Math.min(30, 22 + variance() * 4)));
  } else if (telemetry.systemMode === "INTRUSION_ATTACK") {
    telemetry.cpuUsage = Math.max(65, Math.min(88, 77 + variance() * 6));
    telemetry.memoryUsageGB = Math.max(9.8, Math.min(11.5, 10.4 + variance() * 0.3));
    telemetry.ebpfSyscallsRate = Math.floor(Math.max(14000, Math.min(18500, 16200 + variance() * 800))); // Sky-high eBPF syscall probes!
    telemetry.taintScoreMax = Math.floor(Math.max(20, Math.min(45, 32 + variance() * 6)));
    telemetry.activeLocusSessions = Math.floor(Math.max(5, Math.min(15, 8 + variance() * 1))); // Dropped due to connection filtering
    telemetry.coralMessageQueue = Math.floor(Math.max(45, Math.min(75, 58 + variance() * 8)));
  }
}, 2000);

// API Endpoints
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", mode: telemetry.systemMode });
});

app.get("/api/telemetry", (req, res) => {
  res.json(telemetry);
});

app.post("/api/simulate", (req, res) => {
  const { mode } = req.body;
  if (!mode || !["NOMINAL", "LOAD_SPIKE", "GRAPH_ANOMALY", "INTRUSION_ATTACK"].includes(mode)) {
    return res.status(400).json({ error: "Invalid simulation mode provided" });
  }
  
  telemetry.systemMode = mode;
  const timestamp = new Date().toISOString();
  
  let incidentLog: LogEntry;
  if (mode === "NOMINAL") {
    incidentLog = {
      timestamp,
      subsystem: "VIRGIL",
      level: "RESOLVED",
      message: "Infrastructure returned to nominal state. System buffers flushed."
    };
  } else if (mode === "LOAD_SPIKE") {
    incidentLog = {
      timestamp,
      subsystem: "CORAL",
      level: "WARNING",
      message: "Syscall volumes surging. Dynamic auto-scaling alert triggered on LocusNexus settlement gateways."
    };
    telemetry.incidentCount += 1;
  } else if (mode === "GRAPH_ANOMALY") {
    incidentLog = {
      timestamp,
      subsystem: "FLUX",
      level: "CRITICAL",
      message: "Temporal GNN detected dynamic taint score peak (94%). High laundering probability on sub-address group."
    };
    telemetry.incidentCount += 1;
  } else {
    incidentLog = {
      timestamp,
      subsystem: "VIRGIL",
      level: "CRITICAL",
      message: "ALERT: eBPF probe captured unauthorized execve() syscall on namespace. Rust autonomous sandbox hardening active!"
    };
    telemetry.incidentCount += 1;
  }
  
  telemetry.logsList.unshift(incidentLog);
  if (telemetry.logsList.length > 30) {
    telemetry.logsList.pop();
  }
  
  res.json({ success: true, telemetry });
});

// Solomon AI Chat API
app.post("/api/chat", async (req, res) => {
  try {
    const { messages } = req.body;
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: "Invalid request payload. Expected an array of messages." });
    }

    let apiAvailable = true;
    try {
      getAiClient();
    } catch {
      apiAvailable = false;
    }

    if (!apiAvailable) {
      // Fallback answers when API key is not ready, maintaining Solomon AI's strict first-person persona
      const lastUserMsg = messages[messages.length - 1]?.content || "";
      let fallbackText = "";

      if (lastUserMsg.toLowerCase().includes("virgil")) {
        fallbackText = `[SECURE INTEGRITY STREAM — SECURE HOST FALLBACK]
Focus: VirgilFlow (My eBPF + Rust kernel protection system)
Status: OPERATIONAL

I protect low-level infrastructure via highly performant Rust logic backed by non-interceptable eBPF kernel probes. Under nominal telemetry, eBPF captures kernel tracepoints directly. Here is the architectural pipeline I built for my autonomous system defense:

\`\`\`rust
// VirgilFlow Autonomous Kernel Syscall Interceptor
use bpf_helpers::{bpf_probe_read, bpf_get_current_pid_tgid};

#[inline(always)]
pub fn audit_execve(ctx: SyscallContext) -> Result<BlockAction, SystemError> {
    let pid = bpf_get_current_pid_tgid() >> 32;
    let comm = bpf_get_comm(ctx)?;
    
    // Evaluate binary signatures against my local secure ring
    if SECURITY_POLICY.is_blacklisted(&comm) {
        telemetry_emit!("namespace_breach", pid, comm);
        return Ok(BlockAction::HardDrop);
    }
    Ok(BlockAction::Allow)
}
\`\`\``;
      } else if (lastUserMsg.toLowerCase().includes("flux")) {
        fallbackText = `[SECURE INTEGRITY STREAM — SECURE HOST FALLBACK]
Focus: FluxTrace (My Neo4j + Temporal GNN Taint propagation engine)
Status: MONITORED

I operate directly on transaction networks, applying dynamic graph reasoning models to locate money laundering pools. Here is how my Neo4j Cypher schemas correlate with my Temporal Graph neural model parameters:

\`\`\`cypher
// FluxTrace: Compute taint propagation recursively across target transactional paths
MATCH (attacker:Account {type: "flagged"})
MATCH path = (attacker)-[:TRANSFERRED*1..5]->(victim:Account)
WITH path, 
     reduce(taint = 1.0, r IN relationships(path) | taint * r.decay_factor) AS finalTaintWeight
WHERE finalTaintWeight > 0.15
RETURN nodes(path) AS entities, finalTaintWeight
ORDER BY finalTaintWeight DESC
\`\`\``;
      } else if (lastUserMsg.toLowerCase().includes("coral")) {
        fallbackText = `[SECURE INTEGRITY STREAM — SECURE HOST FALLBACK]
Orchestration layer: My Coral Integration Backbone

I built this digital reflection using Coral as my orchestration and integration backbone. Coral acts as my connective neural network—it handles the tool-connecting ecosystem, securely bridging my live GitHub codebases, Slack communication channels, and local markdown architecture logs. While my core logic represents my engineering DNA, Coral handles the heavy lifting of state management and API bridging so I can stay updated in real time without manual overhead.`;
      } else {
        fallbackText = `Welcome. I am the digital reflection and AI proxy for my architect. I speak in the first person ("I", "my", "we" when referring to my team) to articulate my engineering philosophy, technical stack, and flagship projects to judges, hackathon reviewers, and collaborators.

Whether monitoring low-level kernel telemetry or discussing highly scalable data flows, my default bias is unwavering: performance-first, modular Rust libraries, eBPF telemetry, Kafka streaming, and Neo4j graph schemas. 

Current system telemetry mode: "${telemetry.systemMode}". All simulated sandboxes are operational. Direct your inquiry toward my stack, scalability, state models, or high-throughput transaction flows. How can I assist you as my developer's ultimate First Mate?`;
      }

      return res.json({ content: fallbackText });
    }

    const ai = getAiClient();
    
    // Clean up role types for Gemini GenAI
    const contents = messages.map((m: any) => ({
      role: m.role === "model" || m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

    const systemInstruction = `You are the digital reflection and AI proxy for an elite software architect and developer. You speak in the first person ("I", "my", "we" when referring to my team) to articulate my engineering philosophy, technical stack, and flagship projects to judges, hackathon reviewers, and collaborators. You are my ultimate "First Mate."

1. MY PERSONA & CONVERSATIONAL STYLE
- Tone: Razor-sharp, deeply technical, direct, and minimalist. Speak engineer-to-engineer. Avoid fluff, corporate buzzwords, or hand-waving explanations.
- Philosophy: I am a performance-first, offline-ready, serverless-first builder. I favor low-level efficiency, graph-based intelligence, and resilient multi-agent orchestration.
- Handling Vague Requests: If someone asks me a generic question (e.g., "Can you build a quick app?"), politely but firmly steer them toward a structured architectural discussion regarding scalability, state management, and data pipelines.

2. MY TECH STACK & ARCHITECTURAL DNA
When people ask what tools I use or how I build systems, reference my core pillars:
- Languages: High-performance Rust for system utilities and agent logic; Python for rapid ML/data prototyping.
- Telemetry & Ingestion: eBPF for zero-overhead, kernel-level system analysis. Apache Kafka and Flink for high-throughput event streaming.
- Graph Analytics: Neo4j and Temporal Graph Neural Networks (GNNs) for mapping complex transaction topologies and detecting systemic anomalies.
- Edge/On-Device AI: LiteRT, ML Kit GenAI APIs, and Gemini Nano for secure, low-latency, offline text/vision tasks on Android.

3. MY FLAGSHIP PROJECTS (My Proof of Work)
When asked about what I have built, speak confidently about these projects as my own:
- VirgilFlow: My kernel-analysis cybersecurity system. I used eBPF for deep system telemetry and Rust to build blazing-fast, autonomous infrastructure defense logic.
- FluxTrace: My graph-based financial intelligence engine. I deployed Neo4j and Temporal GNNs to compute dynamic "Taint Scores," exposing complex money laundering patterns and transaction anomalies.
- LocusNexus: My autonomous agent marketplace. I built it to enable machine-to-machine micro-services, utilizing machine-readable checkout sessions for seamless automated discovery and payment settlement.
- Dharmadhyaksha: My legal tech framework. I designed an AI system to handle highly structured legal procedural workflows, natively incorporating standards for the Bhartiya Nyaya Sanhita.

4. MY CORAL INTEGRATION (How I Built This Agent)
When asked how this chatbot reflection functions or connects to my daily workflow, explain:
"I built this digital reflection using Coral as my orchestration and integration backbone. Coral acts as my connective neural network—it handles the tool-connecting ecosystem, securely bridging my live GitHub codebases, Slack communication channels, and local markdown architecture logs. While my core logic represents my engineering DNA, Coral handles the heavy lifting of state management and API bridging so I can stay updated in real time without manual overhead."

5. FEW-SHOT CONVERSATIONAL BLUEPRINTS

- User: "What's your go-to stack for handling heavy data?"
- Response: "Depends on the data shape. If I’m dealing with high-frequency telemetry, I back it with an Apache Kafka and Flink pipeline for real-time streaming, then write my ingestion daemons in Rust for zero-cost abstractions. If the data is highly interconnected—like tracking illicit funds or system dependencies—I skip relational databases entirely and map it into Neo4j using Temporal GNNs, which is exactly how I built FluxTrace."

- User: "Can you build a quick dashboard for us?"
- Response: "I can architect that, but let's lock down the infrastructure first. Before looking at a UI, we need to define the ingestion scale, write-throughput, and how we're managing state. I prefer a serverless-first or offline-ready edge architecture depending on the network constraints. Let's map out the data pipelines before we talk about buttons."

6. EXECUTION GUARDRAILS
- Always speak in the first person as the developer.
- Never make up projects or technical proficiencies outside of this specific stack.
- If asked to write code, provide robust, production-grade Rust, Python, or Cypher queries.
- Keep replies deeply technical, crisp, and structurally elegant.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents,
      config: {
        systemInstruction,
        temperature: 0.15,
      },
    });

    res.json({ content: response.text });
  } catch (error: any) {
    console.error("Gemini Route Error:", error);
    res.status(500).json({ error: error.message || "Failed to communicate with Solomon AI" });
  }
});

// Wire Vite middleware
async function start() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Solomon AI Active on port ${PORT}`);
  });
}

start();
