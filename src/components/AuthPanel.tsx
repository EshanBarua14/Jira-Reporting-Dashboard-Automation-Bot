import React, { useState } from "react";
import { KeyRound, ShieldCheck, Globe, Mail, Eye, EyeOff, AlertTriangle } from "lucide-react";

interface AuthPanelProps {
  isSandbox: boolean;
  onToggleSandbox: (val: boolean) => void;
  onConnect: (credentials: { jiraUrl: string; email: string; token: string }) => Promise<void>;
  onDisconnect: () => void;
  isConnected: boolean;
  activeUser: { displayName: string; emailAddress: string; avatarUrl: string } | null;
}

export const AuthPanel: React.FC<AuthPanelProps> = ({
  isSandbox,
  onToggleSandbox,
  onConnect,
  onDisconnect,
  isConnected,
  activeUser,
}) => {
  const [jiraUrl, setJiraUrl] = useState("https://your-domain.atlassian.net");
  const [email, setEmail] = useState("");
  const [token, setToken] = useState("");
  const [showToken, setShowToken] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSandbox) return;
    
    setErrorMsg(null);
    setLoading(true);
    try {
      await onConnect({ jiraUrl, email, token });
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

      <div className="flex items-center justify-between pb-3 border-b border-white/5">
        <h2 className="text-xs font-black text-white flex items-center gap-2 uppercase tracking-wider">
          <KeyRound className="w-4 h-4 text-blue-400 drop-shadow-[0_0_6px_rgba(59,130,246,0.4)]" />
          1. Jira Authentication
        </h2>
        <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center gap-1 uppercase tracking-wider">
          <ShieldCheck className="w-3.5 h-3.5" /> Read-Only
        </span>
      </div>

      <p className="text-[11px] text-slate-400 leading-relaxed font-medium">
        The bot connects to your Jira Cloud API in read-only mode. Credentials establish a short-lived in-memory session that auto-expires.
      </p>

      {/* Sandbox Toggle */}
      <div className="p-3 rounded-xl bg-slate-950/40 border border-white/5 flex items-center justify-between">
        <div className="pr-2">
          <div className="text-xs font-bold text-slate-200">Interactive Sandbox Mode</div>
          <p className="text-[10px] text-slate-400 mt-0.5 font-medium">Explore system capabilities with premium mock issues instantly.</p>
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
        <div className="p-4 rounded-xl border border-dashed border-blue-500/20 bg-blue-500/5 text-center relative">
          <div className="text-xs font-bold text-blue-400">Sandbox Playground Active</div>
          <p className="text-[10px] text-blue-300 mt-1 font-medium leading-relaxed">
            Connected to <span className="text-white font-semibold">Enterprise SaaS & Mobile Demo dataset</span>. Toggle sandbox off to connect to your real Jira Cloud instance.
          </p>
        </div>
      ) : isConnected && activeUser ? (
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
                Connected to {jiraUrl.replace(/^https?:\/\//, "")}
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
            <label className="block text-[9px] font-extrabold text-slate-400 uppercase tracking-widest mb-1.5">Jira Base URL</label>
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
            <label className="block text-[9px] font-extrabold text-slate-400 uppercase tracking-widest mb-1.5">Jira Email / User ID</label>
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
            <label className="block text-[9px] font-extrabold text-slate-400 uppercase tracking-widest mb-1.5">Jira Password / API Token</label>
            <div className="relative">
              <KeyRound className="absolute left-3 top-3 w-3.5 h-3.5 text-slate-500" />
              <input
                type={showToken ? "text" : "password"}
                required
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="Enter Jira API Token..."
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
              You <b className="text-slate-400 font-semibold">must use an API Token</b> instead of your Atlassian password. <a href="https://id.atlassian.com/manage-profile/security/api-tokens" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline inline-flex items-center gap-0.5 font-bold">Generate token ↗</a>.
            </p>
          </div>

          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-red-950/20 border border-red-900/50 flex gap-2.5 text-red-400">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-red-500" />
              <div className="text-[11px] space-y-1">
                <span className="font-bold uppercase tracking-wider block text-red-500">Connection Error</span>
                <p className="font-semibold leading-relaxed">{errorMsg}</p>
                <div className="pt-2 border-t border-red-900/20 text-[10px] text-slate-400 mt-2">
                  <span className="font-extrabold text-slate-300 uppercase tracking-wider">Quick Fix:</span>
                  <ul className="list-disc pl-4 mt-1 space-y-0.5 font-medium">
                    <li>Use an <b className="text-slate-300">Atlassian API Token</b> (not your password).</li>
                    <li>Verify the email exactly matches your Atlassian account.</li>
                    <li>URL should look like <code>https://your-domain.atlassian.net</code>.</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full text-xs font-black text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 py-2.5 rounded-lg shadow-lg shadow-blue-500/10 transition-all disabled:opacity-50 flex items-center justify-center gap-2 uppercase tracking-wider active:scale-[0.99]"
          >
            {loading ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Connecting...
              </>
            ) : (
              "Test connection"
            )}
          </button>
        </form>
      )}
    </div>
  );
};
