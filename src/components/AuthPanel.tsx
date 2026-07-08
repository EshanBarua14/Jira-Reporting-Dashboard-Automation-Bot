import React, { useState } from "react";
import { KeyRound, ShieldCheck, Globe, Mail, Eye, EyeOff, AlertTriangle, CheckCircle2, RefreshCw, Compass, BookOpen, MessageSquare, ShieldAlert } from "lucide-react";

interface AuthPanelProps {
  isSandbox: boolean;
  onToggleSandbox: (val: boolean) => void;
  onConnect: (credentials: { jiraUrl: string; email: string; token: string }) => Promise<void>;
  onTestConnection: (credentials: { jiraUrl: string; email: string; token: string }) => Promise<{ success: boolean; message: string; version?: string; serverTitle?: string }>;
  onDisconnect: () => void;
  isConnected: boolean;
  activeUser: { displayName: string; emailAddress: string; avatarUrl: string } | null;
  onClearCache: () => void;

  // Multiplatform fields
  activePlatform: "Jira" | "Confluence" | "Discord";
  onChangeActivePlatform: (platform: "Jira" | "Confluence" | "Discord") => void;

  discordToken: string;
  onChangeDiscordToken: (val: string) => void;
  discordGuildId: string;
  onChangeDiscordGuildId: (val: string) => void;
  isDiscordConnected: boolean;
  onConnectDiscord: () => void;
  onDisconnectDiscord: () => void;
}

export const AuthPanel: React.FC<AuthPanelProps> = ({
  isSandbox,
  onToggleSandbox,
  onConnect,
  onTestConnection,
  onDisconnect,
  isConnected,
  activeUser,
  onClearCache,

  activePlatform,
  onChangeActivePlatform,

  discordToken,
  onChangeDiscordToken,
  discordGuildId,
  onChangeDiscordGuildId,
  isDiscordConnected,
  onConnectDiscord,
  onDisconnectDiscord,
}) => {
  const [jiraUrl, setJiraUrl] = useState(() => {
    return localStorage.getItem("jira_url") || "https://your-domain.atlassian.net";
  });
  const [email, setEmail] = useState(() => {
    return localStorage.getItem("jira_email") || "";
  });
  const [token, setToken] = useState(() => {
    return localStorage.getItem("jira_token") || "";
  });
  const [showToken, setShowToken] = useState(false);
  const [showDiscordToken, setShowDiscordToken] = useState(false);
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleTestHeartbeat = async () => {
    if (isSandbox) return;
    setTesting(true);
    setErrorMsg(null);
    setTestResult(null);

    try {
      const res = await onTestConnection({ jiraUrl, email, token });
      setTestResult({
        success: true,
        message: `Connected successfully to "${res.serverTitle || "Jira"}" (v${res.version || "Cloud"}). Heartbeat request validated!`,
      });
      localStorage.setItem("jira_url", jiraUrl);
      localStorage.setItem("jira_email", email);
      localStorage.setItem("jira_token", token);
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err.message || "Failed lightweight heartbeat check.",
      });
      setErrorMsg(err.message || "Lightweight heartbeat check failed.");
    } finally {
      setTesting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSandbox) return;
    
    setErrorMsg(null);
    setLoading(true);
    try {
      await onConnect({ jiraUrl, email, token });
      localStorage.setItem("jira_url", jiraUrl);
      localStorage.setItem("jira_email", email);
      localStorage.setItem("jira_token", token);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to establish a connection to Jira.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      id="auth-panel-card" 
      className="bg-slate-900/40 backdrop-blur-xl border border-white/10 rounded-2xl p-5 space-y-4 shadow-[0_8px_32px_rgba(0,0,0,0.3)] hover:shadow-[0_8px_32px_rgba(59,130,246,0.1)] transition-all duration-300 relative overflow-hidden"
    >
      <div className="absolute top-0 left-0 w-32 h-32 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Unified Platform Selection Tab Menu */}
      <div className="bg-slate-950/80 border border-white/5 rounded-xl p-1 flex items-center justify-between shrink-0 select-none">
        <button
          type="button"
          onClick={() => onChangeActivePlatform("Jira")}
          className={`flex-1 text-[10px] font-black py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 uppercase tracking-wider ${
            activePlatform === "Jira"
              ? "bg-blue-600 text-white shadow-md shadow-blue-500/10"
              : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
          }`}
        >
          <Compass className="w-3.5 h-3.5" />
          Jira
        </button>
        <button
          type="button"
          onClick={() => onChangeActivePlatform("Confluence")}
          className={`flex-1 text-[10px] font-black py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 uppercase tracking-wider ${
            activePlatform === "Confluence"
              ? "bg-emerald-600 text-white shadow-md shadow-emerald-500/10"
              : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" />
          Confluence
        </button>
        <button
          type="button"
          onClick={() => onChangeActivePlatform("Discord")}
          className={`flex-1 text-[10px] font-black py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 uppercase tracking-wider ${
            activePlatform === "Discord"
              ? "bg-purple-600 text-white shadow-md shadow-purple-500/10"
              : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
          }`}
        >
          <MessageSquare className="w-3.5 h-3.5" />
          Discord
        </button>
      </div>

      <div className="flex items-center justify-between pb-2 border-b border-white/5">
        <h2 className="text-xs font-black text-white flex items-center gap-2 uppercase tracking-wider">
          <KeyRound className="w-4 h-4 text-blue-400 drop-shadow-[0_0_6px_rgba(59,130,246,0.4)]" />
          1. {activePlatform} Login
        </h2>
        <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center gap-1 uppercase tracking-wider">
          <ShieldCheck className="w-3.5 h-3.5" /> READ-ONLY
        </span>
      </div>

      {/* Global Sandbox Toggle */}
      <div className="p-3 rounded-xl bg-slate-950/40 border border-white/5 flex items-center justify-between">
        <div className="pr-2">
          <div className="text-xs font-bold text-slate-200">Interactive Sandbox Mode</div>
          <p className="text-[10px] text-slate-400 mt-0.5 font-medium leading-normal">
            Query pre-seeded SaaS wiki and channels instantly in offline sandbox play environment.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            onToggleSandbox(!isSandbox);
            setErrorMsg(null);
          }}
          className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
            isSandbox ? "bg-gradient-to-r from-blue-500 to-indigo-600" : "bg-slate-800"
          }`}
        >
          <span
            className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
              isSandbox ? "translate-x-5" : "translate-x-0"
            }`}
          />
        </button>
      </div>

      {isSandbox ? (
        <div className="p-3.5 rounded-xl border border-dashed border-blue-500/20 bg-blue-500/5 text-center relative">
          <div className="text-xs font-bold text-blue-400">Sandbox Playground Active</div>
          <p className="text-[10px] text-blue-300 mt-1 font-medium leading-relaxed">
            Viewing seeded <span className="text-white font-semibold">Enterprise SaaS Wiki, Channels & Sprints</span>. Toggle Sandbox off to configure secure private keys.
          </p>
        </div>
      ) : (
        <>
          {/* --- JIRA & CONFLUENCE AUTHENTICATION --- */}
          {(activePlatform === "Jira" || activePlatform === "Confluence") && (
            <>
              {isConnected && activeUser ? (
                <div className="p-3.5 rounded-xl border border-emerald-500/20 bg-emerald-500/5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {activeUser.avatarUrl ? (
                      <img src={activeUser.avatarUrl} alt="Avatar" className="w-8 h-8 rounded-full border border-white/10" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs">
                        {activeUser.displayName.charAt(0)}
                      </div>
                    )}
                    <div>
                      <div className="text-xs font-bold text-white">{activeUser.displayName}</div>
                      <div className="text-[10px] text-slate-400">{activeUser.emailAddress}</div>
                      <div className="text-[10px] text-emerald-400 font-bold mt-1 flex items-center gap-1 uppercase tracking-wider">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                        Connected to Atlassian Workspace
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={onDisconnect}
                    className="text-[10px] font-black text-slate-300 hover:text-white px-3 py-1.5 rounded-lg bg-slate-950/60 hover:bg-red-500/10 border border-white/5 hover:border-red-500/30 transition-all uppercase tracking-wider"
                  >
                    Disconnect
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-[9px] font-extrabold text-slate-400 uppercase tracking-widest mb-1.5">Atlassian Base URL</label>
                    <div className="relative">
                      <Globe className="absolute left-3 top-3 w-3.5 h-3.5 text-slate-500" />
                      <input
                        type="text"
                        required
                        value={jiraUrl}
                        onChange={(e) => setJiraUrl(e.target.value)}
                        placeholder="https://your-domain.atlassian.net"
                        className="w-full text-xs pl-9 pr-3 py-2.5 bg-slate-950/60 border border-white/5 text-slate-200 placeholder-slate-500 rounded-lg focus:outline-none focus:border-blue-500/80 transition-all font-medium"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[9px] font-extrabold text-slate-400 uppercase tracking-widest mb-1.5">Atlassian account email</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 w-3.5 h-3.5 text-slate-500" />
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="developer@company.com"
                        className="w-full text-xs pl-9 pr-3 py-2.5 bg-slate-950/60 border border-white/5 text-slate-200 placeholder-slate-500 rounded-lg focus:outline-none focus:border-blue-500/80 transition-all font-medium"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[9px] font-extrabold text-slate-400 uppercase tracking-widest mb-1.5">Atlassian API Token</label>
                    <div className="relative">
                      <KeyRound className="absolute left-3 top-3 w-3.5 h-3.5 text-slate-500" />
                      <input
                        type={showToken ? "text" : "password"}
                        required
                        value={token}
                        onChange={(e) => setToken(e.target.value)}
                        placeholder="Enter Atlassian API Token..."
                        className="w-full text-xs pl-9 pr-10 py-2.5 bg-slate-950/60 border border-white/5 text-slate-200 placeholder-slate-500 rounded-lg focus:outline-none focus:border-blue-500/80 transition-all font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => setShowToken(!showToken)}
                        className="absolute right-3 top-3 text-slate-500 hover:text-slate-300"
                      >
                        {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1.5 leading-relaxed font-medium">
                      Requires Atlassian API Token. <a href="https://id.atlassian.com/manage-profile/security/api-tokens" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline inline-flex items-center gap-0.5 font-bold">Generate Token ↗</a>
                    </p>
                  </div>

                  {testResult && (
                    <div className={`p-3.5 rounded-xl border flex gap-2.5 text-xs font-semibold ${
                      testResult.success
                        ? "bg-emerald-950/20 border-emerald-900/50 text-emerald-400"
                        : "bg-red-950/20 border-red-900/50 text-red-400"
                    }`}>
                      {testResult.success ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                      )}
                      <div className="text-[11px] leading-relaxed">
                        <span className="font-bold uppercase tracking-wider block mb-0.5">
                          Atlassian Connect Success
                        </span>
                        <p className="font-medium">{testResult.message}</p>
                      </div>
                    </div>
                  )}

                  {errorMsg && (
                    <div className="p-3.5 rounded-xl bg-red-950/20 border border-red-900/50 flex gap-2.5 text-red-400">
                      <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-red-500" />
                      <div className="text-[11px] space-y-1">
                        <span className="font-bold uppercase tracking-wider block text-red-500">Connection Error</span>
                        <p className="font-semibold leading-relaxed">{errorMsg}</p>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3.5">
                    <button
                      type="button"
                      disabled={testing || loading}
                      onClick={handleTestHeartbeat}
                      className="text-xs font-black text-slate-200 bg-slate-950 hover:bg-slate-900 border border-white/10 hover:border-blue-500/30 py-2.5 rounded-lg shadow-md transition-all disabled:opacity-50 flex items-center justify-center gap-1.5 uppercase tracking-wider"
                    >
                      {testing ? <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-400" /> : <Globe className="w-3.5 h-3.5 text-blue-400" />}
                      Test Link
                    </button>

                    <button
                      type="submit"
                      disabled={loading || testing}
                      className="text-xs font-black text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 py-2.5 rounded-lg shadow-lg transition-all disabled:opacity-50 flex items-center justify-center gap-1.5 uppercase tracking-wider"
                    >
                      Connect Suite
                    </button>
                  </div>
                </form>
              )}
            </>
          )}

          {/* --- DISCORD AUTHENTICATION --- */}
          {activePlatform === "Discord" && (
            <div className="space-y-4">
              {isDiscordConnected ? (
                <div className="p-3.5 rounded-xl border border-purple-500/20 bg-purple-500/5 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-white">Discord Guild Bot Integrated</div>
                    <div className="text-[10px] text-purple-400 mt-1 flex items-center gap-1 uppercase tracking-wider font-extrabold">
                      <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse"></span>
                      Guild: {discordGuildId || "Private Channel"}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={onDisconnectDiscord}
                    className="text-[10px] font-black text-slate-300 hover:text-white px-3 py-1.5 rounded-lg bg-slate-950/60 hover:bg-red-500/10 border border-white/5 hover:border-red-500/30 transition-all uppercase tracking-wider"
                  >
                    Disconnect
                  </button>
                </div>
              ) : (
                <div className="space-y-3.5">
                  <div>
                    <label className="block text-[9px] font-extrabold text-slate-400 uppercase tracking-widest mb-1.5">Discord Bot Token</label>
                    <div className="relative">
                      <KeyRound className="absolute left-3 top-3 w-3.5 h-3.5 text-slate-500" />
                      <input
                        type={showDiscordToken ? "text" : "password"}
                        required
                        value={discordToken}
                        onChange={(e) => onChangeDiscordToken(e.target.value)}
                        placeholder="MTA5Mzg..."
                        className="w-full text-xs pl-9 pr-10 py-2.5 bg-slate-950/60 border border-white/5 text-slate-200 placeholder-slate-500 rounded-lg focus:outline-none focus:border-purple-500/80 transition-all font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => setShowDiscordToken(!showDiscordToken)}
                        className="absolute right-3 top-3 text-slate-500 hover:text-slate-300"
                      >
                        {showDiscordToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[9px] font-extrabold text-slate-400 uppercase tracking-widest mb-1.5">Discord Server ID (Guild ID)</label>
                    <div className="relative">
                      <Globe className="absolute left-3 top-3 w-3.5 h-3.5 text-slate-500" />
                      <input
                        type="text"
                        required
                        value={discordGuildId}
                        onChange={(e) => onChangeDiscordGuildId(e.target.value)}
                        placeholder="e.g. 110239485..."
                        className="w-full text-xs pl-9 pr-3 py-2.5 bg-slate-950/60 border border-white/5 text-slate-200 placeholder-slate-500 rounded-lg focus:outline-none focus:border-purple-500/80 transition-all font-mono"
                      />
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={onConnectDiscord}
                    className="w-full text-xs font-black text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 py-2.5 rounded-lg shadow-lg transition-all flex items-center justify-center gap-1.5 uppercase tracking-wider"
                  >
                    <ShieldAlert className="w-3.5 h-3.5 text-white" />
                    Connect Discord Bot
                  </button>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Clear Cache Area */}
      <div className="pt-3 border-t border-white/5 flex items-center justify-between gap-2">
        <span className="text-[10px] text-slate-500 font-medium">Clear app caching states:</span>
        <button
          type="button"
          onClick={onClearCache}
          id="clear-cache-btn"
          className="text-[9px] font-extrabold text-amber-500 hover:text-amber-400 hover:bg-amber-500/10 border border-amber-500/20 hover:border-amber-500/30 px-2.5 py-1.5 rounded-lg transition-all uppercase tracking-wider flex items-center gap-1.5"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
          Flush Session
        </button>
      </div>
    </div>
  );
};
