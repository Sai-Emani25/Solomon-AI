export interface LogEntry {
  timestamp: string;
  subsystem: "VIRGIL" | "FLUX" | "LOCUS" | "CORAL";
  level: "INFO" | "WARNING" | "CRITICAL" | "RESOLVED";
  message: string;
}

export interface TelemetryState {
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

export interface Message {
  id: string;
  role: "user" | "model" | "system";
  content: string;
  timestamp: string;
}

export interface ProjectInfo {
  id: string;
  name: string;
  tag: string;
  subsystem: "VIRGIL" | "FLUX" | "LOCUS" | "CORAL";
  philosophy: string;
  stack: string[];
  metrics: string[];
  architectureDetail: string;
  codeSnippet: string;
}
