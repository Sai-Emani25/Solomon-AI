import { useState, useEffect, useRef, FormEvent } from "react";
import {
  Terminal,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Play,
  Square,
  Sparkles,
  Send,
  HelpCircle,
  Volume1,
  MessageSquare,
  Cpu,
  Bookmark,
  Shield,
  Layers,
  ArrowRight,
  Activity,
  X,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Info,
  Sliders,
  Bell,
  Cpu as CpuIcon,
  Server
} from "lucide-react";
import { Message, LogEntry, TelemetryState } from "./types";

export default function App() {
  // Conversational State
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "init",
      role: "model",
      content: "Welcome reviewer. I am the digital reflection and AI proxy for my architect. I speak in the first person (\"I\", \"my\", \"we\" when referring to my team) to articulate my engineering philosophy, technical stack, and flagship projects to judges, hackathon reviewers, and collaborators.\n\nEverything in my profile is fully responsive. Ask me regarding my core systems codebases like VirgilFlow, FluxTrace, LocusNexus, or Dharmadhyaksha. I can speak and listen to you directly in real time using my newly compiled audio telemetry nodes.",
      timestamp: new Date().toLocaleTimeString()
    }
  ]);
  const [chatInput, setChatInput] = useState<string>("");
  const [chatLoading, setChatLoading] = useState<boolean>(false);

  // Telemetry & Logs Live States
  const [telemetry, setTelemetry] = useState<TelemetryState>({
    systemMode: "NOMINAL",
    uptimeSeconds: 847230,
    cpuUsage: 14.2,
    memoryUsageGB: 6.4,
    ebpfSyscallsRate: 2100,
    taintScoreMax: 12,
    activeLocusSessions: 18,
    coralMessageQueue: 2,
    incidentCount: 0,
    logsList: []
  });
  const [connectionStatus, setConnectionStatus] = useState<"online" | "connecting" | "offline">("connecting");
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);

  // Audio Features State
  const [isListening, setIsListening] = useState<boolean>(false);
  const [speechSupported, setSpeechSupported] = useState<boolean>(false);
  const [speechSynthSupported, setSpeechSynthSupported] = useState<boolean>(false);
  const [autoSpeak, setAutoSpeak] = useState<boolean>(true);
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);
  const [audioPitch, setAudioPitch] = useState<number>(1.0);
  const [audioRate, setAudioRate] = useState<number>(1.0);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceName, setSelectedVoiceName] = useState<string>("");

  // Refs
  const scrollRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const recognitionRef = useRef<any>(null);
  const currentUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Suggested flagship triggers to load into prompt bar
  const portfolioTriggers = [
    {
      name: "VirgilFlow Hooks",
      query: "Explain VirgilFlow eBPF tracepoint security hooks & Rust enforcement logic.",
      icon: <Shield size={12} className="text-[#00ff9c]" />,
      desc: "Autonomic kernel-level syscall defense system."
    },
    {
      name: "FluxTrace Graphs",
      query: "How do FluxTrace GNN models calculate recursive transactional taint scores in Neo4j?",
      icon: <Layers size={12} className="text-[#00ff9c]" />,
      desc: "Temporal GNN financial intelligence tracking."
    },
    {
      name: "LocusNexus Commerce",
      query: "Explain the machine-readable settlement schemas used in LocusNexus.",
      icon: <CpuIcon size={12} className="text-[#00ff9c]" />,
      desc: "Machine-to-machine checkout execution."
    },
    {
      name: "Dharmadhyaksha AI",
      query: "How does Dharmadhyaksha map Indian statutory framework (BNS) procedurally?",
      icon: <Terminal size={12} className="text-[#00ff9c]" />,
      desc: "Procedural statutory compliance engine."
    }
  ];

  // Fetch Telemetry Routine From Endpoint
  const fetchTelemetry = async () => {
    try {
      const response = await fetch("/api/telemetry");
      if (!response.ok) throw new Error("Offline status");
      const data: TelemetryState = await response.json();
      setTelemetry(data);
      setConnectionStatus("online");
    } catch (e) {
      setConnectionStatus("offline");
    }
  };

  // Poll Telemetry periodically
  useEffect(() => {
    fetchTelemetry();
    const interval = setInterval(fetchTelemetry, 3000);
    return () => clearInterval(interval);
  }, []);

  // Initialize Speech Recognition & Synthesis
  useEffect(() => {
    // Check Speech Recognition support
    const SpeechRecognitionClass = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognitionClass) {
      setSpeechSupported(true);
      const recognizer = new SpeechRecognitionClass();
      recognizer.continuous = false;
      recognizer.interimResults = false;
      recognizer.lang = "en-US";

      recognizer.onstart = () => {
        setIsListening(true);
      };

      recognizer.onresult = (event: any) => {
        const text = event.results[0][0].transcript;
        if (text) {
          setChatInput(text);
          // Auto send spoken text
          triggerChatSend(text);
        }
      };

      recognizer.onerror = (event: any) => {
        console.error("Speech recognition error", event.error);
        setIsListening(false);
      };

      recognizer.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognizer;
    }

    // Check Speech Synthesis support
    if ("speechSynthesis" in window) {
      setSpeechSynthSupported(true);
      const synth = window.speechSynthesis;

      // Load voices
      const loadVoices = () => {
        const voices = synth.getVoices();
        setAvailableVoices(voices);

        // Try to pre-select a high-quality Google voice or English default
        const googleEn = voices.find((v) => v.name.includes("Google US English") || v.name.includes("Natural"));
        const systemDefaultEn = voices.find((v) => v.lang.startsWith("en"));
        if (googleEn) {
          setSelectedVoiceName(googleEn.name);
        } else if (systemDefaultEn) {
          setSelectedVoiceName(systemDefaultEn.name);
        }
      };

      loadVoices();
      if (synth.onvoiceschanged !== undefined) {
        synth.onvoiceschanged = loadVoices;
      }
    }

    // Canvas animation loop for audio visualizer wave
    let animationId: number;
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      let phase = 0;

      const resizeCanvas = () => {
        canvas.width = canvas.parentElement?.clientWidth || 400;
        canvas.height = 70;
      };
      resizeCanvas();
      window.addEventListener("resize", resizeCanvas);

      const renderWave = () => {
        if (!ctx) return;
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // State-based wave configuration
        let waveCount = 3;
        let baseFrequency = 0.02;
        let baseAmplitude = 5;
        let speed = 0.05;
        let color = "#1f1f1f"; // Nominal/idle

        if (isListening) {
          // Listening - Green fast dynamic waves
          waveCount = 4;
          baseAmplitude = 16;
          baseFrequency = 0.035;
          speed = 0.12;
          color = "#00ff9c";
        } else if (speakingMessageId) {
          // Speaking - Sky Blue high waves
          waveCount = 4;
          baseAmplitude = 22;
          baseFrequency = 0.028;
          speed = 0.08;
          color = "#38bdf8";
        } else if (chatLoading) {
          // Evaluating - Purple pulsing slow waves
          waveCount = 3;
          baseAmplitude = 10;
          baseFrequency = 0.04;
          speed = 0.06;
          color = "#c084fc";
        }

        phase += speed;

        for (let i = 0; i < waveCount; i++) {
          ctx.beginPath();
          ctx.lineWidth = i === 0 ? 2 : 1;
          
          // Generate opacity falloff
          const opacity = i === 0 ? 0.9 : 0.45 - i * 0.12;
          ctx.strokeStyle = color === "#00ff9c" 
            ? `rgba(0, 255, 156, ${opacity})`
            : color === "#38bdf8"
            ? `rgba(56, 189, 248, ${opacity})`
            : color === "#c084fc"
            ? `rgba(192, 132, 252, ${opacity})`
            : `rgba(40, 40, 40, ${opacity})`;

          const ampModifier = 1 - (i * 0.25);
          const freqModifier = 1 + (i * 0.3);

          for (let x = 0; x < canvas.width; x++) {
            // Apply sine logic with smooth edges (envelope filter)
            const envelope = Math.sin((x / canvas.width) * Math.PI);
            const y = (canvas.height / 2) + Math.sin(x * baseFrequency * freqModifier + phase) * baseAmplitude * ampModifier * envelope;
            
            if (x === 0) {
              ctx.moveTo(x, y);
            } else {
              ctx.lineTo(x, y);
            }
          }
          ctx.stroke();
        }

        animationId = requestAnimationFrame(renderWave);
      };

      renderWave();

      return () => {
        window.removeEventListener("resize", resizeCanvas);
        cancelAnimationFrame(animationId);
      };
    }
  }, [isListening, speakingMessageId, chatLoading]);

  // Sync scroll ref
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, chatLoading]);

  // Toggle voice recognition recording
  const toggleListening = () => {
    if (!speechSupported) {
      alert("Speech recognition is not fully supported in this browser interface. Try Google Chrome or edge for optimum microphone access.");
      return;
    }

    if (isListening) {
      recognitionRef.current?.stop();
    } else {
      // Pause any active synthesized speech before starting to listen
      stopSpeaking();
      try {
        recognitionRef.current?.start();
      } catch (err) {
        console.error("Failed to start recognizer:", err);
      }
    }
  };

  // Convert markdown-heavy texts into spoken-ready clean sentences
  const cleanTextForTTS = (rawText: string) => {
    let clean = rawText;
    
    // Replace code blocks completely to avoid reading syntax jargon
    clean = clean.replace(/```[\s\S]*?```/g, "[Code configuration block printed to your viewport]");
    
    // Remove inline code tics
    clean = clean.replace(/`([^`]+)`/g, "$1");
    
    // Remove robust bolding stars
    clean = clean.replace(/\*\*([^*]+)\*\*/g, "$1");
    
    // Remove italic lines
    clean = clean.replace(/\*([^*]+)\*/g, "$1");
    
    return clean;
  };

  // Speaks out the assistant message using browser speech synthesis
  const speakMessage = (text: string, messageId: string) => {
    if (!speechSynthSupported) return;

    // Stop current speaking
    stopSpeaking();

    const spokenText = cleanTextForTTS(text);
    const utterance = new SpeechSynthesisUtterance(spokenText);
    
    // Attach chosen voice
    if (selectedVoiceName) {
      const matchedVoice = availableVoices.find((v) => v.name === selectedVoiceName);
      if (matchedVoice) {
        utterance.voice = matchedVoice;
      }
    }

    // Attach custom audio pitch & dynamic rate parameters
    utterance.pitch = audioPitch;
    utterance.rate = audioRate;

    utterance.onstart = () => {
      setSpeakingMessageId(messageId);
    };

    utterance.onend = () => {
      setSpeakingMessageId(null);
    };

    utterance.onerror = (e) => {
      console.error("Speech Synthesis Utterance Error:", e);
      setSpeakingMessageId(null);
    };

    currentUtteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  };

  // Stop current utterance instantly
  const stopSpeaking = () => {
    if (speechSynthSupported) {
      window.speechSynthesis.cancel();
      setSpeakingMessageId(null);
    }
  };

  // Trigger simulated states on the server for dynamic logs demonstration
  const triggerSimulation = async (mode: "NOMINAL" | "LOAD_SPIKE" | "GRAPH_ANOMALY" | "INTRUSION_ATTACK") => {
    try {
      const response = await fetch("/api/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode })
      });
      if (response.ok) {
        const data = await response.json();
        setTelemetry(data.telemetry);
        
        // Inject system message in chat logs list
        const levelText = mode === "NOMINAL" ? "INFO" : (mode === "LOAD_SPIKE" ? "WARNING" : "CRITICAL");
        setMessages(prev => [
          ...prev,
          {
            id: String(Date.now()),
            role: "system",
            content: `[ALERT] Mainframe state updated to simulation: ${mode}. Live telemetry registers a new [${levelText}] log stream.`,
            timestamp: new Date().toLocaleTimeString()
          }
        ]);
      }
    } catch (err) {
      console.error("Simulation trigger failed", err);
    }
  };

  // Submit trigger
  const triggerChatSend = async (text: string) => {
    if (!text.trim() || chatLoading) return;

    // Stop speaking if currently running
    stopSpeaking();

    const userMsg: Message = {
      id: String(Date.now()),
      role: "user",
      content: text,
      timestamp: new Date().toLocaleTimeString()
    };

    setMessages((prev) => [...prev, userMsg]);
    setChatLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: [...messages, userMsg].slice(-12) })
      });

      if (!response.ok) throw new Error("Connection failed");

      const resData = await response.json();
      const modelContent = resData.content || "Operational system pipeline error.";
      const modelMsgId = String(Date.now() + 1);

      setMessages((prev) => [
        ...prev,
        {
          id: modelMsgId,
          role: "model",
          content: modelContent,
          timestamp: new Date().toLocaleTimeString()
        }
      ]);

      // Automatically triggers playback if toggle allowed
      if (autoSpeak) {
        speakMessage(modelContent, modelMsgId);
      }
    } catch {
      const fallbackId = String(Date.now() + 1);
      const fallbackStr = "[CONNECTION INTERRUPTED] I am evaluating internal router caches... Direct your request to my local simulations or speak a physical keyword like 'VirgilFlow' or 'FluxTrace' so I can extract native core structures.";
      setMessages((prev) => [
        ...prev,
        {
          id: fallbackId,
          role: "model",
          content: fallbackStr,
          timestamp: new Date().toLocaleTimeString()
        }
      ]);

      if (autoSpeak) {
        speakMessage(fallbackStr, fallbackId);
      }
    } finally {
      setChatLoading(false);
    }
  };

  const handleFormSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (chatInput.trim()) {
      triggerChatSend(chatInput);
      setChatInput("");
    }
  };

  // Helper calculation for active uptime display
  const formatUptimeSeconds = (totalSec: number) => {
    const days = Math.floor(totalSec / (3600 * 24));
    const hours = Math.floor((totalSec % (3600 * 24)) / 3600);
    const mins = Math.floor((totalSec % 3600) / 60);
    return `${days}d ${hours}h ${mins}m`;
  };

  return (
    <div className="min-h-screen bg-[#030303] text-zinc-100 flex flex-col h-screen overflow-hidden font-sans select-none selection:bg-[#00ff9c]/15 selection:text-[#00ff9c]">
      
      {/* HIGH-END MINIMALIST SYSTEM HEADER */}
      <header className="h-[56px] shrink-0 border-b border-[#111111] bg-[#060606] px-6 flex items-center justify-between z-20">
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center">
            <span className="w-2.5 h-2.5 rounded-full bg-[#00ff9c] animate-cyber-pulse relative">
              <span className="absolute inset-0 rounded-full bg-[#00ff9c]/50 animate-ping" />
            </span>
          </div>
          <span className="font-mono text-sm font-semibold tracking-wider text-white uppercase flex items-center gap-1.5">
            SOLOMON CORE <span className="text-[#00ff9c] text-xs px-1.5 py-0.5 bg-zinc-900 rounded font-normal uppercase">Digital Reflection</span>
          </span>
        </div>

        <div className="flex items-center gap-3 text-xs font-mono">
          {/* Real-time Telemetry state header label */}
          <div className="hidden sm:flex items-center gap-2 mr-2">
            <span className="text-zinc-600 uppercase">MODE:</span>
            <span className={`font-bold transition-all px-2 py-0.5 rounded text-[10px] ${
              telemetry.systemMode === "NOMINAL" ? "text-[#00ff9c] bg-[#051610]/80" : "text-red-400 bg-red-950/40"
            }`}>
              {telemetry.systemMode}
            </span>
          </div>

          {/* Trigger logs side-drawer button */}
          <button
            type="button"
            onClick={() => setIsDrawerOpen(true)}
            className="relative flex items-center gap-2 px-3 py-1.5 text-[10.5px] uppercase font-mono border border-zinc-800 bg-[#0e0e0e] hover:bg-zinc-900 text-zinc-200 hover:text-[#00ff9c] hover:border-[#00ff9c]/40 rounded cursor-pointer transition-all"
          >
            <Activity size={11} className="text-[#00ff9c] animate-pulse" />
            <span>Telemetry Logs</span>
            {telemetry.logsList.length > 0 && (
              <span className="bg-red-500 text-[8.5px] font-black text-white px-1 leading-none rounded-full h-3.5 min-w-[14px] flex items-center justify-center animate-bounce">
                {telemetry.logsList.length}
              </span>
            )}
          </button>

          {/* Dynamic MIC indicator badge */}
          <span className="hidden md:inline-block px-2.5 py-1 text-[10px] text-zinc-400 bg-zinc-900 border border-zinc-800 rounded select-none">
            MIC: {speechSupported ? "READY" : "UNSUPPORTED"}
          </span>
        </div>
      </header>

      {/* CORE INTENSION LAYOUT CONTAINER */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden min-h-0 bg-[#040404] relative">
        
        {/* CHAT AND AUDIO COMPONENT VIEWPORTS */}
        <main className="flex-1 flex flex-col h-full bg-[#030303] relative overflow-hidden">
          
          {/* Header Action Strip: Contains Audio & Project Settings Quick Drawers */}
          <div className="px-6 py-3 border-b border-[#111] bg-[#070707] flex flex-wrap md:flex-nowrap items-center justify-between gap-4 z-10">
            
            {/* Audio Wave Dynamics & Simulation metrics */}
            <div className="flex-1 min-w-[200px] flex items-center gap-4">
              <div className="h-full flex flex-col">
                <span className="text-[9.5px] font-mono text-zinc-500 uppercase tracking-wider block">
                  Tele-Auditory Frequency Matrix: {isListening ? "Listening Mode" : speakingMessageId ? "Speaking Response" : "Idle Calibration"}
                </span>
                <div className="w-[180px] md:w-[260px] bg-black/60 border border-zinc-900 rounded mt-1 overflow-hidden shrink-0 flex items-center h-[28px] px-2.5">
                  <canvas ref={canvasRef} className="w-full h-[24px]" />
                </div>
              </div>

              {/* Dynamic Wave Status indicators */}
              <div className="hidden lg:flex flex-col gap-0.5 font-mono text-[9px] text-zinc-500">
                <div className="flex items-center gap-1.5">
                  <span className={`w-1.5 h-1.5 rounded-full ${isListening ? "bg-[#00ff9c] animate-pulse" : "bg-zinc-700"}`} />
                  <span>MIC MONITOR: <b className={isListening ? "text-[#00ff9c]" : ""}>{isListening ? "RECORDING" : "STANDBY"}</b></span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className={`w-1.5 h-1.5 rounded-full ${speakingMessageId ? "bg-sky-400 animate-pulse" : "bg-zinc-700"}`} />
                  <span>TTS ENGINE: <b className={speakingMessageId ? "text-sky-400 font-extrabold" : ""}>{speakingMessageId ? "VOCALIZING" : "IDLE"}</b></span>
                </div>
              </div>
            </div>

            {/* Audio Settings Integration Box */}
            <div className="flex items-center gap-3 shrink-0 flex-wrap sm:flex-nowrap">
              {/* Select voice dropdown */}
              {speechSynthSupported && availableVoices.length > 0 && (
                <div className="flex items-center gap-1.5 bg-black border border-zinc-900 rounded px-2 py-1 select-none">
                  <span className="text-[9px] font-mono text-zinc-500">VOICE:</span>
                  <select
                    value={selectedVoiceName}
                    onChange={(e) => {
                      setSelectedVoiceName(e.target.value);
                      stopSpeaking();
                    }}
                    className="bg-transparent border-0 font-mono text-[9.5px] text-zinc-300 focus:outline-none focus:ring-0 max-w-[120px] sm:max-w-[160px] cursor-pointer"
                  >
                    {availableVoices.map((v) => (
                      <option key={v.name} value={v.name} className="bg-[#0c0c0c] text-zinc-300">
                        {v.name.replace("Microsoft", "").replace("Google", "").trim()}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Autoplay speak toggle */}
              <div className="flex items-center gap-1.5 bg-black border border-zinc-900 rounded px-2.5 py-1">
                <span className="text-[9px] font-mono text-zinc-500">AUTO-SPEAK:</span>
                <button
                  type="button"
                  onClick={() => {
                    setAutoSpeak(!autoSpeak);
                    if (autoSpeak) stopSpeaking();
                  }}
                  className={`text-[9.5px] font-mono cursor-pointer transition-colors ${autoSpeak ? "text-[#00ff9c] font-bold" : "text-zinc-600"}`}
                >
                  {autoSpeak ? "ENABLED" : "MUTED"}
                </button>
              </div>

              {/* Drawer Logs Direct Toggle Button under Strip */}
              <button
                type="button"
                onClick={() => setIsDrawerOpen(true)}
                className="px-2.5 py-1 bg-zinc-900 hover:bg-[#00ff9c]/10 text-[#00ff9c] hover:text-white border border-zinc-800 hover:border-[#00ff9c]/30 rounded font-mono text-[9.5px] flex items-center gap-1 text-[#00ff9c] cursor-pointer transition-all uppercase"
              >
                <Activity size={10} className="animate-pulse" />
                <span>Open Logs Drawer ({telemetry.logsList.length})</span>
              </button>
            </div>

          </div>

          {/* Core Chat Flowing Interface Window */}
          <div className="flex-1 overflow-y-auto px-6 py-6 space-y-5 min-h-0 relative select-text" ref={scrollRef}>
            
            {/* Minimalist Ambient Design Base background overlay */}
            <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-[#030303] to-transparent pointer-events-none select-none z-0" />

            {/* Introductory Identity Block (Architect's First-person declaration card) */}
            <div className="p-4 border border-[#141414] bg-[#070707] rounded font-mono text-[11px] text-zinc-400 leading-relaxed max-w-4xl relative z-10 space-y-2 select-none shadow-[0_4px_12px_rgba(0,0,0,0.6)]">
              <div className="flex justify-between items-center text-zinc-600 font-semibold mb-1">
                <span className="flex items-center gap-1"><Terminal size={11} className="text-[#00ff9c]" /> SYSTEM CO-PILOT TERMINAL INSTANCE</span>
                <span>CALIBRATED FOR: THE HACKATHON JURY</span>
              </div>
              <p>
                This digital presence functions natively as my personal vocal clone and engineering architectural proxy. Speak with me directly using the live microphone, explore code snippets from my production modules, or request concrete evaluations for my projects.
              </p>
              <div className="pt-2 border-t border-[#111] flex flex-wrap gap-y-1.5 items-center justify-between text-[10px] text-zinc-505 select-none text-zinc-500">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span>ORCHESTRATOR LINK BACKBONE: <b>Coral Integration (GitHub/Slack/Docs)</b></span>
                  <span>|</span>
                  <button 
                    type="button" 
                    onClick={() => setIsDrawerOpen(true)}
                    className="text-[#00ff9c] underline hover:text-white"
                  >
                    View Scrolling Syslogs Drawer
                  </button>
                </div>
                <span className="text-zinc-400 flex items-center gap-1 animate-pulse"><span className="w-1.5 h-1.5 rounded-full bg-[#00ff9c]" /> SYSTEM ONLINE</span>
              </div>
            </div>

            {/* Suggestion Grid: Quick launch queries loaded on conversational screen to initiate fast queries */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 max-w-4xl relative z-10 select-none">
              {portfolioTriggers.map((trig, idx) => (
                <button
                  type="button"
                  key={idx}
                  onClick={() => triggerChatSend(trig.query)}
                  className="p-3 bg-[#070707]/90 border border-[#141414] hover:border-[#00ff9c]/55 hover:bg-black/90 rounded text-left flex flex-col gap-1 transition-all group cursor-pointer"
                >
                  <div className="flex items-center gap-1.5">
                    {trig.icon}
                    <span className="text-[11.5px] font-mono font-bold text-zinc-200 group-hover:text-[#00ff9c] truncate">
                      {trig.name}
                    </span>
                  </div>
                  <p className="text-[10px] text-zinc-500 mt-0.5 leading-tight line-clamp-1">
                    {trig.desc}
                  </p>
                  <span className="text-[8.5px] font-mono text-zinc-600 mt-1 flex items-center gap-1 font-semibold">
                    EXECUTE TRIGGER <ArrowRight size={10} className="text-zinc-700 group-hover:translate-x-1 group-hover:text-[#00ff9c] transition-all" />
                  </span>
                </button>
              ))}
            </div>

            {/* Conversation Dialog Stream */}
            <div className="space-y-4 max-w-4xl relative z-10">
              {messages.map((m) => {
                const isAssistant = m.role === "model" || m.role === "system";
                const isSystemMessage = m.role === "system";
                const isSpeakingCurrent = speakingMessageId === m.id;

                if (isSystemMessage) {
                  return (
                    <div 
                      key={m.id} 
                      className="p-3 border border-[#1b1b1b]/70 bg-black/40 text-zinc-500 text-[10px] space-y-1 rounded font-mono tracking-wider leading-relaxed max-w-2xl mx-auto z-10 relative"
                    >
                      <div className="flex justify-between font-bold">
                        <span className="text-amber-500 uppercase flex items-center gap-1 select-none">
                          <AlertTriangle size={10} /> SYS_STATE CRITICAL NOTIFICATION
                        </span>
                        <span>{m.timestamp}</span>
                      </div>
                      <p className="text-zinc-400 select-text leading-normal">{m.content}</p>
                      <button 
                        onClick={() => setIsDrawerOpen(true)}
                        className="text-[9px] text-[#00ff9c] underline hover:text-white uppercase font-bold mt-1"
                      >
                        Inspect Full live log detail in side drawer &gt;&gt;
                      </button>
                    </div>
                  );
                }

                return (
                  <div
                    key={m.id}
                    className={`p-4 rounded border transition-all duration-300 relative ${
                      isAssistant
                        ? "bg-[#080808]/80 border-[#121212] flex flex-col gap-2.5"
                        : "bg-[#0e0e0e]/40 border-zinc-900 ml-12"
                    }`}
                  >
                    {/* Message metadata row */}
                    <div className="flex justify-between items-center select-none text-[10px] font-mono border-b border-[#111] pb-1.5">
                      <span className={`font-bold flex items-center gap-1.5 tracking-wider uppercase ${
                        isAssistant ? "text-[#00ff9c]" : "text-zinc-400"
                      }`}>
                        {isAssistant ? (
                          <>
                            <Sparkles size={11} />
                            SOLOMON_PROXY@LOCAL
                          </>
                        ) : (
                          "OPERATOR@TERMINAL"
                        )}
                      </span>
                      
                      <div className="flex items-center gap-2">
                        <span className="text-zinc-600">{m.timestamp}</span>
                        {/* Audio play/pause triggers per message */}
                        {isAssistant && speechSynthSupported && (
                          <div className="flex items-center gap-1 ml-1.5 border-l border-zinc-800 pl-2">
                            {isSpeakingCurrent ? (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  stopSpeaking();
                                }}
                                className="text-red-400 hover:text-red-300 transition-colors p-1 flex items-center gap-1 cursor-pointer"
                                title="Stop speaking"
                              >
                                <VolumeX size={12} />
                                <span className="text-[9px] font-semibold">MUTE VOICE</span>
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  speakMessage(m.content, m.id);
                                }}
                                className="text-zinc-400 hover:text-[#00ff9c] transition-colors p-1 flex items-center gap-1 cursor-pointer"
                                title="Speak this response"
                              >
                                <Volume2 size={12} />
                                <span className="text-[9px] font-semibold">TALK</span>
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Clean markdown content display */}
                    <div className={`text-sm leading-relaxed whitespace-pre-wrap font-sans ${
                      isAssistant ? "text-zinc-200" : "text-zinc-100 font-medium"
                    }`}>
                      {m.content}
                    </div>

                    {/* Speaking progress pulse accent bar */}
                    {isSpeakingCurrent && (
                      <div className="h-0.5 bg-gradient-to-r from-sky-400 to-[#00ff9c] w-full rounded animate-pulse select-none" />
                    )}
                  </div>
                );
              })}
            </div>

            {/* Evaluation Loading Indicator */}
            {chatLoading && (
              <div className="flex items-center gap-3 p-3 rounded bg-zinc-950/60 border border-zinc-900 text-zinc-400 text-xs font-mono max-w-sm select-none z-10 relative">
                <span className="w-1.5 h-1.5 rounded-full bg-[#00ff9c] animate-ping" />
                <span className="animate-pulse">PARSING INFRASTRUCTURE MODEL ANOMALIES...</span>
              </div>
            )}

            {/* End of message reference */}
            <div className="h-2 select-none" />

          </div>

          {/* IMMERSIVE FIXED BOTTOM CMD INPUT */}
          <div className="p-4 border-t border-[#111] bg-[#070707] z-10">
            <div className="max-w-4xl mx-auto flex gap-3.5 items-center">
              
              {/* Massive microphone button for recording vocal inputs */}
              <button
                type="button"
                onClick={toggleListening}
                className={`w-[48px] h-[48px] rounded-full border flex items-center justify-center transition-all cursor-pointer relative shrink-0 ${
                  isListening
                    ? "bg-red-950/40 border-red-500 text-red-400 shadow-[0_0_12px_rgba(239,68,68,0.4)]"
                    : "bg-black border-zinc-800 text-zinc-400 hover:border-[#00ff9c]/50 hover:text-[#00ff9c] hover:bg-zinc-900/30"
                }`}
                title={isListening ? "Stop listening voice" : "Talk via microphone to Solomon"}
              >
                {isListening ? <MicOff size={20} className="animate-pulse" /> : <Mic size={20} />}
                
                {/* Visual pulse rings if listening active */}
                {isListening && (
                  <>
                    <span className="absolute -inset-1 border border-red-500/35 rounded-full animate-ping pointer-events-none" />
                    <span className="absolute -inset-2 border border-red-500/10 rounded-full animate-ping pointer-events-none delay-100" />
                  </>
                )}
              </button>

              {/* Text submission command input */}
              <form onSubmit={handleFormSubmit} className="flex-1 flex gap-3.5 items-center">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder={
                    isListening
                      ? "Listening to voice input..."
                      : "Type your query or click triggers to analyze portfolios..."
                  }
                  className="flex-1 bg-black border border-zinc-900 text-sm font-mono px-4 py-3 text-zinc-100 rounded focus:border-[#00ff9c] focus:ring-0 focus:outline-none placeholder-zinc-700 transition-colors"
                  disabled={isListening}
                />
                
                <button
                  type="submit"
                  disabled={chatLoading || !chatInput.trim() || isListening}
                  className="h-[44px] px-6 bg-[#00ff9c] hover:bg-[#00dd88] text-black rounded font-mono text-xs font-black tracking-wider transition-all flex items-center gap-2 shrink-0 cursor-pointer disabled:bg-zinc-900 disabled:text-zinc-700 font-bold"
                >
                  <span>EXECUTE</span>
                  <Send size={13} />
                </button>
              </form>

            </div>
          </div>

        </main>

      </div>

      {/* DEDICATED SIDE-DRAWER PANEL FOR SCROLLING LIVE SYSTEM LOGGER STATE */}
      {isDrawerOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-30 transition-opacity duration-300"
          onClick={() => setIsDrawerOpen(false)}
        />
      )}

      <div 
        className={`fixed top-0 right-0 h-full w-[350px] sm:w-[500px] bg-[#090909] border-l border-[#1b1b1b] z-40 shadow-2xl flex flex-col transform transition-transform duration-300 ease-in-out select-none ${
          isDrawerOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Drawer Header Block */}
        <div className="p-4 border-b border-[#1b1b1b] bg-black/40 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-2">
            <Activity size={16} className="text-[#00ff9c]" />
            <div>
              <h3 className="text-xs font-bold font-mono tracking-wider text-white uppercase flex items-center gap-1">
                INFRASTRUCTURE MONITOR
              </h3>
              <p className="text-[9px] font-mono text-zinc-500 leading-none mt-1">
                LIVE TELEMETRY STREAM
              </p>
            </div>
          </div>
          
          <button 
            type="button" 
            onClick={() => setIsDrawerOpen(false)}
            className="p-1 px-2.5 border border-zinc-900 bg-black text-zinc-400 hover:text-[#00ff9c] hover:border-[#00ff9c]/55 rounded font-mono text-[9.5px] flex items-center gap-1 transition-all cursor-pointer"
          >
            <X size={12} />
            <span>CLOSE</span>
          </button>
        </div>

        {/* Live System Parameters Summary Card inside Drawer */}
        <div className="p-4 border-b border-[#1c1c1c] bg-black/20 space-y-3.5 shrink-0">
          <div className="flex justify-between items-center text-xs font-mono">
            <span className="text-zinc-500 uppercase">SYSTEM STABILITY MODE:</span>
            <span className={`px-2 py-0.5 rounded text-[9.5px] font-mono font-bold uppercase border ${
              telemetry.systemMode === "NOMINAL" 
                ? "text-[#00ff9c] bg-emerald-950/20 border-emerald-900/40" 
                : telemetry.systemMode === "INTRUSION_ATTACK"
                ? "text-red-400 bg-red-950/20 border-red-900/40"
                : "text-amber-500 bg-amber-950/20 border-amber-900/40"
            }`}>
              {telemetry.systemMode}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center text-xs font-mono">
            <div className="p-2 bg-black border border-[#141414] rounded">
              <span className="text-[8px] font-mono text-zinc-500 block uppercase mb-1">CPU Load</span>
              <span className="text-zinc-100 font-bold">{telemetry.cpuUsage.toFixed(1)}%</span>
            </div>
            <div className="p-2 bg-black border border-[#141414] rounded">
              <span className="text-[8px] font-mono text-zinc-500 block uppercase mb-1">eBPF Probes</span>
              <span className="text-[#00ff9c] font-bold">{telemetry.ebpfSyscallsRate}/s</span>
            </div>
            <div className="p-2 bg-black border border-[#141414] rounded">
              <span className="text-[8px] font-mono text-zinc-500 block uppercase mb-1">Max Taint</span>
              <span className="text-amber-500 font-bold">{telemetry.taintScoreMax}%</span>
            </div>
          </div>

          {/* Simulated Controls inside Drawer */}
          <div className="p-3 bg-black border border-[#141414] rounded space-y-2.5">
            <div className="flex justify-between items-center">
              <span className="text-[9px] font-mono text-zinc-400 uppercase tracking-wider block font-bold flex items-center gap-1">
                <Sliders size={11} className="text-[#00ff9c]" /> Simulation Telemetry Injectors
              </span>
              <span className="text-[8px] font-mono text-zinc-600 hidden sm:inline">TEST COMPLIANCE</span>
            </div>
            
            <div className="grid grid-cols-2 gap-1.5">
              {[
                { mode: "NOMINAL", label: "Nominal Stack", style: "hover:border-[#00ff9c] hover:text-[#00ff9c]", borderStyle: "border-[#00ff9c]/50 bg-emerald-950/10 text-emerald-300" },
                { mode: "LOAD_SPIKE", label: "Surge Stream", style: "hover:border-blue-400 hover:text-blue-400", borderStyle: "border-blue-900/50 bg-blue-950/10 text-blue-300" },
                { mode: "GRAPH_ANOMALY", label: "GNN Anomaly", style: "hover:border-purple-400 hover:text-purple-400", borderStyle: "border-purple-900/50 bg-purple-950/10 text-purple-300" },
                { mode: "INTRUSION_ATTACK", label: "Intrusion Det", style: "hover:border-red-400 hover:text-red-400", borderStyle: "border-red-900/50 bg-red-950/10 text-red-300" }
              ].map((item) => (
                <button
                  key={item.mode}
                  type="button"
                  onClick={() => triggerSimulation(item.mode as any)}
                  className={`p-1.5 border bg-[#050505] text-[9.5px] uppercase font-mono rounded font-semibold text-zinc-400 transition-all text-center cursor-pointer select-none ${item.style} ${
                    telemetry.systemMode === item.mode ? item.borderStyle : "border-zinc-900"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Live scrolling logs list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5 custom-scrollbar min-h-0 bg-[#060606]/35">
          {telemetry.logsList && telemetry.logsList.length > 0 ? (
            telemetry.logsList.map((log, idx) => {
              // Level Styles Configuration
              let levelClass = "";
              let levelIcon = null;

              if (log.level === "CRITICAL") {
                levelClass = "border-red-950/60 bg-red-950/30 text-red-400";
                levelIcon = <AlertTriangle size={9} />;
              } else if (log.level === "RESOLVED") {
                levelClass = "border-emerald-950/60 bg-emerald-950/30 text-[#00ff9c]";
                levelIcon = <CheckCircle2 size={9} />;
              } else if (log.level === "WARNING") {
                levelClass = "border-amber-950/60 bg-amber-950/30 text-amber-500";
                levelIcon = <AlertTriangle size={9} />;
              } else {
                levelClass = "border-zinc-800 bg-zinc-900/50 text-zinc-400";
                levelIcon = <Info size={9} />;
              }

              // Subsystem badge classes
              let subClass = "";
              if (log.subsystem === "VIRGIL") subClass = "text-pink-400 bg-pink-950/10 border-pink-950/30";
              else if (log.subsystem === "FLUX") subClass = "text-sky-400 bg-sky-950/10 border-sky-950/30";
              else if (log.subsystem === "LOCUS") subClass = "text-purple-400 bg-purple-950/10 border-purple-950/30";
              else if (log.subsystem === "CORAL") subClass = "text-amber-500 bg-amber-950/10 border-amber-950/30";

              return (
                <div 
                  key={idx}
                  className="p-3 border border-[#131313] bg-[#0c0c0c] hover:bg-[#0f0f0f] rounded-sm flex flex-col gap-2 transition-all group overflow-hidden relative"
                >
                  {/* Top-line meta information */}
                  <div className="flex items-center justify-between font-mono text-[9px]">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className={`px-1.5 py-0.5 rounded-xs font-bold text-[8.5px] border ${subClass}`}>
                        {log.subsystem}
                      </span>
                      <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-xs font-black border text-[8.2px] ${levelClass}`}>
                        {levelIcon}
                        <span>{log.level}</span>
                      </span>
                    </div>

                    <span className="text-zinc-600 font-medium group-hover:text-zinc-400 transition-colors">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </span>
                  </div>

                  {/* Operational syslog message text */}
                  <p className="text-[11.5px] text-zinc-300 font-sans leading-relaxed select-text">
                    {log.message}
                  </p>
                </div>
              );
            })
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 text-zinc-600 font-mono select-none">
              <RefreshCw size={20} className="animate-spin text-zinc-700 mb-3" />
              <span className="text-[10px] uppercase font-bold tracking-widest block">WAITING FOR CORE TELEMETRY SOCKETS</span>
              <span className="text-[8.5px] text-zinc-500 mt-1 max-w-[240px] uppercase">
                No system logs recorded yet. Toggle system threat injectors in simulations above to register warnings.
              </span>
            </div>
          )}
        </div>

        {/* Drawer footer details */}
        <div className="p-3 bg-black border-t border-[#1b1b1b] font-mono text-[8.5px] text-zinc-500 text-center select-none uppercase tracking-wide">
          Coral Back-Channel Socket Node Connection: ACTIVE
        </div>
      </div>

      {/* FOOTER BAR WITH SIMPLIFIED AUDIT LOG */}
      <footer className="h-[36px] shrink-0 border-t border-[#111111] bg-[#060606] px-6 flex items-center justify-between font-mono text-[10px] text-zinc-600 select-none z-10">
        <div className="flex items-center gap-4">
          <span>CO-PILOT INTEGRITY MATRIX SECURED</span>
          <span className="hidden sm:inline">|</span>
          <span className="hidden sm:inline">SPEECH BACKBONE: COGNITIVE BROWSER AUDIO SUITE</span>
        </div>
        <div className="flex items-center gap-1 select-none text-[9px]">
          <span>WORKSPACE CONNECTION STATE:</span>
          <span className="text-[#00ff9c] font-black uppercase">TELEMETRY DE-ENHANCED & SHUTDOWN</span>
        </div>
      </footer>

    </div>
  );
}
