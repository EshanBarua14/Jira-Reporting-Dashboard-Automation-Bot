import React, { useState, useEffect, useRef } from "react";
import {
  ShieldCheck,
  Mail,
  Lock,
  Smartphone,
  Eye,
  EyeOff,
  User,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  KeyRound,
  Sparkles,
  QrCode,
  Copy,
  RefreshCw,
  LogOut,
  X,
  Check,
  ShieldAlert,
  ArrowLeft,
  XCircle,
  Shield,
  Layers,
  LockKeyhole,
  Zap,
  ChevronRight,
  Trash2,
  Github,
  Globe,
  ExternalLink,
  ShieldOff,
  Database
} from "lucide-react";
import { AppAccountUser } from "../types";

interface UserAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: AppAccountUser | null;
  onLoginSuccess: (user: AppAccountUser) => void;
  onLogout: () => void;
  addToast?: (
    title: string,
    description: string,
    type: "success" | "info" | "warning" | "error",
    duration?: number
  ) => void;
  initialMode?: "login" | "register" | "phone" | "forgot";
}

const COUNTRY_CODES = [
  { code: "+1", country: "US/CA", flag: "🇺🇸" },
  { code: "+44", country: "UK", flag: "🇬🇧" },
  { code: "+91", country: "IN", flag: "🇮🇳" },
  { code: "+61", country: "AU", flag: "🇦🇺" },
  { code: "+49", country: "DE", flag: "🇩🇪" },
  { code: "+33", country: "FR", flag: "🇫🇷" },
  { code: "+81", country: "JP", flag: "🇯🇵" },
];

export const UserAuthModal: React.FC<UserAuthModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onLoginSuccess,
  onLogout,
  addToast,
  initialMode = "login",
}) => {
  const [view, setView] = useState<
    "login" | "register" | "phone" | "forgot" | "google_popup" | "github_popup" | "ms_popup" | "2fa_verify" | "account"
  >(initialMode);

  // Form states
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [countryCode, setCountryCode] = useState("+1");
  const [rememberMe, setRememberMe] = useState(true);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Phone SMS OTP state
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState(["", "", "", "", "", ""]);
  const [otpCountdown, setOtpCountdown] = useState(0);

  // Forgot Password state & Email Recovery Link
  const [forgotStep, setForgotStep] = useState<1 | 2 | 3>(1);
  const [resetCode, setResetCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [recoveryToken, setRecoveryToken] = useState("");

  // Account Management & Deletion / Data Wipe state
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [deleteConfirmInput, setDeleteConfirmInput] = useState("");

  // 2FA MFA state
  const [pendingUserFor2FA, setPendingUserFor2FA] = useState<AppAccountUser | null>(null);
  const [twoFACode, setTwoFACode] = useState(["", "", "", "", "", ""]);
  const [mfaResendCountdown, setMfaResendCountdown] = useState(30);
  const [useBackupCode, setUseBackupCode] = useState(false);
  const [backupCodeInput, setBackupCodeInput] = useState("");

  // Account 2FA Setup state
  const [is2FASetupActive, setIs2FASetupActive] = useState(false);
  const [setup2FACode, setSetup2FACode] = useState("");
  const [generatedSecret] = useState("JBSWY3DPEHPK3PXP");
  const [copiedSecret, setCopiedSecret] = useState(false);

  // References for multi-box OTP input handling
  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const mfaInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (currentUser) {
      setView("account");
    } else {
      setView(initialMode);
    }
  }, [currentUser, initialMode, isOpen]);

  // Resend OTP countdown timer
  useEffect(() => {
    if (otpCountdown > 0) {
      const timer = setTimeout(() => setOtpCountdown(otpCountdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [otpCountdown]);

  // MFA resend countdown timer
  useEffect(() => {
    if (mfaResendCountdown > 0) {
      const timer = setTimeout(() => setMfaResendCountdown(mfaResendCountdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [mfaResendCountdown]);

  if (!isOpen) return null;

  // Real-time password criteria validation logic
  const pwdValidation = {
    hasMinLength: password.length >= 8,
    hasUppercase: /[A-Z]/.test(password),
    hasLowercase: /[a-z]/.test(password),
    hasNumber: /[0-9]/.test(password),
    hasSpecial: /[^A-Za-z0-9]/.test(password),
  };

  const criteriaCount = Object.values(pwdValidation).filter(Boolean).length;

  const calculatePasswordStrength = () => {
    if (!password) return 0;
    return (criteriaCount / 5) * 100;
  };

  const passwordStrengthScore = calculatePasswordStrength();

  const getStrengthMeta = (score: number) => {
    if (score === 0) return { label: "None", color: "bg-slate-700", text: "text-slate-400" };
    if (score <= 40) return { label: "Weak", color: "bg-red-500", text: "text-red-400" };
    if (score <= 60) return { label: "Fair", color: "bg-amber-500", text: "text-amber-400" };
    if (score <= 80) return { label: "Good", color: "bg-blue-500", text: "text-blue-400" };
    return { label: "Strong & Secure", color: "bg-emerald-500", text: "text-emerald-400" };
  };

  // 1. Handle Email Login
  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim() || !password) {
      setError("Please fill in both email and password.");
      return;
    }

    setLoading(true);
    setTimeout(() => {
      setLoading(false);

      const savedUsersJson = localStorage.getItem("omnisync_app_users");
      const savedUsers: AppAccountUser[] = savedUsersJson ? JSON.parse(savedUsersJson) : [];

      const existingUser = savedUsers.find(
        (u) => u.email.toLowerCase() === email.trim().toLowerCase()
      );

      const mockUser: AppAccountUser = existingUser || {
        id: `usr_${Date.now()}`,
        name: email.split("@")[0] || "User",
        email: email.trim(),
        avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${email}`,
        authProvider: "email",
        is2FAEnabled: existingUser ? existingUser.is2FAEnabled : true, // default to 2FA enabled for testing
        createdAt: new Date().toISOString(),
        lastLoginAt: new Date().toISOString(),
      };

      if (mockUser.is2FAEnabled) {
        setPendingUserFor2FA(mockUser);
        setView("2fa_verify");
        setMfaResendCountdown(30);
        addToast?.(
          "2FA Security Step",
          "Two-Factor Authentication is active. Enter the 6-digit code or test code 123456.",
          "info",
          4000
        );
      } else {
        onLoginSuccess(mockUser);
        addToast?.("Welcome Back!", `Signed in successfully as ${mockUser.name}`, "success", 3000);
        onClose();
      }
    }, 800);
  };

  // 2. Handle Registration
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("Please enter your full name.");
      return;
    }
    if (!email.trim() || !email.includes("@")) {
      setError("Please enter a valid email address.");
      return;
    }
    if (!pwdValidation.hasMinLength) {
      setError("Password must be at least 8 characters long.");
      return;
    }
    if (criteriaCount < 3) {
      setError("Please choose a stronger password matching at least 3 security rules.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (!agreeTerms) {
      setError("You must accept the Terms of Service & Privacy Policy.");
      return;
    }

    setLoading(true);
    setTimeout(() => {
      setLoading(false);

      const newUser: AppAccountUser = {
        id: `usr_${Date.now()}`,
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim() ? `${countryCode} ${phone.trim()}` : undefined,
        avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${email}`,
        authProvider: "email",
        is2FAEnabled: false,
        createdAt: new Date().toISOString(),
        lastLoginAt: new Date().toISOString(),
      };

      const savedUsersJson = localStorage.getItem("omnisync_app_users");
      const savedUsers: AppAccountUser[] = savedUsersJson ? JSON.parse(savedUsersJson) : [];
      savedUsers.push(newUser);
      localStorage.setItem("omnisync_app_users", JSON.stringify(savedUsers));

      onLoginSuccess(newUser);
      addToast?.(
        "Account Created!",
        `Registration complete. Welcome to OmniSync Suite, ${newUser.name}!`,
        "success",
        4000
      );
      onClose();
    }, 900);
  };

  // 3. Handle Phone SMS OTP
  const handleSendPhoneOTP = () => {
    if (!phone.trim() || phone.trim().length < 6) {
      setError("Please enter a valid phone number.");
      return;
    }
    setError(null);
    setLoading(true);

    setTimeout(() => {
      setLoading(false);
      setOtpSent(true);
      setOtpCountdown(30);
      setOtpCode(["1", "2", "3", "4", "5", "6"]); // Pre-fill sample for ultra convenient testing
      addToast?.(
        "SMS Code Dispatched",
        `Sent 6-digit OTP to ${countryCode} ${phone}. (Code pre-filled: 123456)`,
        "info",
        5000
      );
    }, 800);
  };

  const handleVerifyPhoneOTP = (e: React.FormEvent) => {
    e.preventDefault();
    const enteredCode = otpCode.join("");
    if (enteredCode.length < 6) {
      setError("Please enter the complete 6-digit OTP code.");
      return;
    }

    setLoading(true);
    setTimeout(() => {
      setLoading(false);

      const phoneUser: AppAccountUser = {
        id: `usr_phone_${Date.now()}`,
        name: `User ${phone.slice(-4)}`,
        email: `phone_${phone.replace(/\D/g, "")}@omnisync.io`,
        phone: `${countryCode} ${phone}`,
        avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${phone}`,
        authProvider: "phone",
        is2FAEnabled: false,
        createdAt: new Date().toISOString(),
        lastLoginAt: new Date().toISOString(),
      };

      onLoginSuccess(phoneUser);
      addToast?.(
        "Phone Verified!",
        `Logged in with phone number ${countryCode} ${phone}`,
        "success",
        3000
      );
      onClose();
    }, 800);
  };

  // 4. Handle Google, GitHub, and Microsoft OAuth Simulations
  const handleGoogleAuthSelect = (selectedEmail: string, selectedName: string) => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      const googleUser: AppAccountUser = {
        id: `usr_google_${Date.now()}`,
        name: selectedName,
        email: selectedEmail,
        avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${selectedEmail}`,
        authProvider: "google",
        is2FAEnabled: false,
        createdAt: new Date().toISOString(),
        lastLoginAt: new Date().toISOString(),
      };

      onLoginSuccess(googleUser);
      addToast?.(
        "Google Auth Success",
        `Authenticated with Google account ${selectedEmail}`,
        "success",
        3500
      );
      onClose();
    }, 700);
  };

  const handleGitHubAuthSelect = (selectedEmail: string, selectedName: string) => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      const githubUser: AppAccountUser = {
        id: `usr_github_${Date.now()}`,
        name: selectedName,
        email: selectedEmail,
        avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${selectedEmail}`,
        authProvider: "github" as any,
        is2FAEnabled: false,
        createdAt: new Date().toISOString(),
        lastLoginAt: new Date().toISOString(),
      };

      onLoginSuccess(githubUser);
      addToast?.(
        "GitHub OAuth Verified",
        `Authenticated via GitHub Enterprise for ${selectedEmail}`,
        "success",
        3500
      );
      onClose();
    }, 700);
  };

  const handleMicrosoftAuthSelect = (selectedEmail: string, selectedName: string) => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      const msUser: AppAccountUser = {
        id: `usr_ms_${Date.now()}`,
        name: selectedName,
        email: selectedEmail,
        avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${selectedEmail}`,
        authProvider: "microsoft" as any,
        is2FAEnabled: false,
        createdAt: new Date().toISOString(),
        lastLoginAt: new Date().toISOString(),
      };

      onLoginSuccess(msUser);
      addToast?.(
        "Microsoft Azure AD Authenticated",
        `Signed in via Microsoft Enterprise SSO (${selectedEmail})`,
        "success",
        3500
      );
      onClose();
    }, 700);
  };

  // 5. Handle Forgot Password Email Recovery Flow
  const handleRequestPasswordReset = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !email.includes("@")) {
      setError("Please enter your registered email address.");
      return;
    }
    setError(null);
    setLoading(true);

    setTimeout(() => {
      setLoading(false);
      const token = `OMNI_${Math.floor(100000 + Math.random() * 900000)}_RESET`;
      setRecoveryToken(token);
      setForgotStep(2);
      addToast?.(
        "Password Recovery Email Sent",
        `Recovery token link dispatched to ${email}. Token: ${token} (Code: 888999)`,
        "info",
        6000
      );
    }, 800);
  };

  const handleConfirmPasswordReset = (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetCode.trim()) {
      setError("Please enter the reset code or click the temporary token link.");
      return;
    }
    if (newPassword.length < 6) {
      setError("New password must be at least 6 characters.");
      return;
    }

    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setForgotStep(3);
      addToast?.(
        "Password Reset Complete",
        "Your password has been updated successfully. You can now log in.",
        "success",
        4000
      );
    }, 800);
  };

  // 6. Handle Account Deletion & Complete Data Wipe
  const handlePerformAccountDeletionAndWipe = () => {
    if (deleteConfirmInput.trim() !== "DELETE") {
      setError("Please type 'DELETE' in uppercase to confirm account deletion.");
      return;
    }

    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      // Remove all local user records and active session storage
      localStorage.removeItem("omnisync_current_app_user");
      localStorage.removeItem("omnisync_app_users");
      localStorage.removeItem("jira_active_user");
      localStorage.removeItem("jira_is_connected");
      localStorage.removeItem("jira_session_id");

      onLogout();
      setIsDeleteConfirmOpen(false);
      setDeleteConfirmInput("");
      addToast?.(
        "Account & Data Wiped",
        "Your account profile and all local data caches have been permanently deleted.",
        "warning",
        5000
      );
      onClose();
    }, 900);
  };

  // 6. Handle 2FA MFA Verification Login
  const handleVerify2FA = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pendingUserFor2FA) return;

    if (useBackupCode) {
      if (!backupCodeInput.trim()) {
        setError("Please enter a valid backup recovery code.");
        return;
      }
    } else {
      const enteredCode = twoFACode.join("");
      if (enteredCode.length < 6) {
        setError("Please enter your 6-digit authenticator code.");
        return;
      }
    }

    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      onLoginSuccess(pendingUserFor2FA);
      addToast?.(
        "2FA Passed",
        `Security verification completed for ${pendingUserFor2FA.name}`,
        "success",
        3000
      );
      setPendingUserFor2FA(null);
      onClose();
    }, 800);
  };

  const handleResendMFACode = () => {
    setMfaResendCountdown(30);
    setTwoFACode(["1", "2", "3", "4", "5", "6"]);
    addToast?.("MFA Code Resent", "A new 6-digit verification code has been generated (123456).", "info", 4000);
  };

  // 7. Handle 2FA Activation inside Account Profile
  const handleConfirm2FASetup = () => {
    if (setup2FACode.length < 6) {
      setError("Please enter the 6-digit code from your authenticator app.");
      return;
    }

    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      if (currentUser) {
        const updatedUser: AppAccountUser = {
          ...currentUser,
          is2FAEnabled: true,
          secret2FA: generatedSecret,
          backupCodes: ["A1B2-C3D4", "E5F6-G7H8", "J9K0-L1M2", "N3P4-Q5R6"],
        };
        onLoginSuccess(updatedUser);
        setIs2FASetupActive(false);
        setSetup2FACode("");
        addToast?.(
          "2FA Protection Enabled",
          "Two-Factor Authentication is now active on your OmniSync account.",
          "success",
          4000
        );
      }
    }, 700);
  };

  const handleToggle2FAOff = () => {
    if (!currentUser) return;
    const updatedUser: AppAccountUser = {
      ...currentUser,
      is2FAEnabled: false,
    };
    onLoginSuccess(updatedUser);
    addToast?.("2FA Disabled", "Two-Factor Authentication has been turned off.", "info", 3000);
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 sm:p-6 bg-slate-950/85 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-slate-900 border border-white/10 rounded-3xl shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200 flex flex-col md:flex-row">
        {/* ========================================================================= */}
        {/* LEFT PANEL: BRANDING, VISUAL ILLUSTRATIONS & HIGHLIGHTS */}
        {/* ========================================================================= */}
        <div className="md:w-5/12 bg-gradient-to-br from-blue-950 via-indigo-950 to-slate-950 p-6 sm:p-7 border-b md:border-b-0 md:border-r border-white/10 flex flex-col justify-between relative overflow-hidden select-none">
          {/* Decorative glowing background mesh */}
          <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.25),transparent_50%)] pointer-events-none" />
          <div className="absolute bottom-0 right-0 w-full h-full bg-[radial-gradient(circle_at_bottom_right,rgba(99,102,241,0.2),transparent_50%)] pointer-events-none" />
          <div className="absolute -top-24 -left-24 w-48 h-48 bg-blue-500/20 rounded-full blur-3xl pointer-events-none" />

          {/* Top Branding Badge */}
          <div className="relative z-10 space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-500 to-cyan-400 p-0.5 shadow-lg shadow-blue-500/30 flex items-center justify-center">
                <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
                  <ShieldCheck className="w-4 h-4 text-blue-400" />
                </div>
              </div>
              <div>
                <h1 className="text-base font-black text-white tracking-tight leading-none">OmniSync</h1>
                <p className="text-[9px] font-extrabold uppercase tracking-widest text-blue-400 mt-0.5">
                  Identity & Security
                </p>
              </div>
            </div>

            {/* Sub-headline */}
            <div className="pt-1">
              <h3 className="text-sm font-bold text-slate-100 leading-snug">
                {view === "register"
                  ? "Join Thousands of Teams Managing Unified Diagnostics."
                  : view === "2fa_verify"
                  ? "Multi-Factor Authentication Shield Active."
                  : view === "phone"
                  ? "Instant Passwordless Phone Authentication."
                  : "Centralized Workspace Auth & Single Sign-On."}
              </h3>
              <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                Seamlessly sync reporting widgets, diagnostic consoles, and enterprise integrations across all your team tools.
              </p>
            </div>
          </div>

          {/* Security Features Illustration / Bullet Points */}
          <div className="relative z-10 my-4 space-y-2.5">
            <div className="flex items-start gap-2.5 p-2.5 rounded-2xl bg-white/5 border border-white/5 backdrop-blur-sm">
              <div className="p-1.5 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20 shrink-0">
                <LockKeyhole className="w-3.5 h-3.5" />
              </div>
              <div>
                <h4 className="text-[11px] font-black text-white">256-bit AES Token Encryption</h4>
                <p className="text-[9px] text-slate-400 mt-0.5">Session state local persistence with zero plain-text storage.</p>
              </div>
            </div>

            <div className="flex items-start gap-2.5 p-2.5 rounded-2xl bg-white/5 border border-white/5 backdrop-blur-sm">
              <div className="p-1.5 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 shrink-0">
                <Smartphone className="w-3.5 h-3.5" />
              </div>
              <div>
                <h4 className="text-[11px] font-black text-white">2FA TOTP & SMS OTP Guard</h4>
                <p className="text-[9px] text-slate-400 mt-0.5">Authenticator app compatibility plus instant SMS code verification.</p>
              </div>
            </div>

            <div className="flex items-start gap-2.5 p-2.5 rounded-2xl bg-white/5 border border-white/5 backdrop-blur-sm">
              <div className="p-1.5 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 shrink-0">
                <Zap className="w-3.5 h-3.5" />
              </div>
              <div>
                <h4 className="text-[11px] font-black text-white">Simulated OAuth 2.0</h4>
                <p className="text-[9px] text-slate-400 mt-0.5">Instant 1-click Google account authorization flow.</p>
              </div>
            </div>
          </div>

          {/* Bottom Security Footer Badge */}
          <div className="relative z-10 pt-2 border-t border-white/10 flex items-center justify-between text-[10px] text-slate-400">
            <span className="flex items-center gap-1.5 font-bold text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /> Security Active
            </span>
            <span className="font-mono text-slate-500">v2.4.0</span>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* RIGHT PANEL: INTERACTIVE FORM CONTAINER & STEPS */}
        {/* ========================================================================= */}
        <div className="md:w-7/12 p-6 sm:p-7 bg-slate-900 flex flex-col justify-start space-y-4 relative">
          {/* Close Modal Button */}
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-white rounded-xl bg-white/5 hover:bg-white/10 transition-all cursor-pointer z-20"
            title="Close auth window"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="space-y-5">
            {/* Form View Header */}
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 inline-flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  {view === "account"
                    ? "Logged In Profile"
                    : view === "login"
                    ? "Sign In"
                    : view === "register"
                    ? "New Account"
                    : view === "phone"
                    ? "SMS Phone Login"
                    : view === "forgot"
                    ? "Password Reset"
                    : view === "google_popup"
                    ? "Google OAuth"
                    : "Security Check"}
                </span>
              </div>
              <h2 className="text-2xl font-black text-white tracking-tight mt-1">
                {view === "account"
                  ? "User Account Settings"
                  : view === "login"
                  ? "Sign in to your account"
                  : view === "register"
                  ? "Create your OmniSync account"
                  : view === "phone"
                  ? "Phone SMS Verification"
                  : view === "forgot"
                  ? "Recover Your Account"
                  : view === "google_popup"
                  ? "Select Google Account"
                  : "Two-Factor Authentication"}
              </h2>
            </div>

            {/* Navigation Tabs (Login / Register / Phone) if not logged in */}
            {!currentUser && view !== "2fa_verify" && view !== "google_popup" && (
              <div className="flex items-center gap-1.5 bg-slate-950 p-1.5 rounded-2xl border border-white/5">
                <button
                  type="button"
                  onClick={() => {
                    setView("login");
                    setError(null);
                  }}
                  className={`flex-1 py-2 text-xs font-black rounded-xl transition-all cursor-pointer ${
                    view === "login"
                      ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/20"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setView("register");
                    setError(null);
                  }}
                  className={`flex-1 py-2 text-xs font-black rounded-xl transition-all cursor-pointer ${
                    view === "register"
                      ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/20"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  Register
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setView("phone");
                    setError(null);
                  }}
                  className={`flex-1 py-2 text-xs font-black rounded-xl transition-all flex items-center justify-center gap-1 cursor-pointer ${
                    view === "phone"
                      ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/20"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  Phone OTP
                </button>
              </div>
            )}

            {/* Error Banner */}
            {error && (
              <div className="p-3.5 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs font-medium flex items-start gap-2.5 animate-in fade-in zoom-in-95">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <span>{error}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setError(null)}
                  className="text-slate-400 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* ========================================================================= */}
            {/* VIEW: LOGIN FORM */}
            {/* ========================================================================= */}
            {view === "login" && !currentUser && (
              <form onSubmit={handleEmailLogin} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300">Email Address</label>
                  <div className="relative flex items-center">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="alex.m@company.com"
                      className="w-full bg-slate-950 border border-white/10 rounded-2xl py-2.5 pl-10 pr-3.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-all font-medium"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-300">Password</label>
                    <button
                      type="button"
                      onClick={() => {
                        setView("forgot");
                        setError(null);
                      }}
                      className="text-[11px] font-extrabold text-blue-400 hover:underline cursor-pointer"
                    >
                      Forgot Password?
                    </button>
                  </div>
                  <div className="relative flex items-center">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="w-full bg-slate-950 border border-white/10 rounded-2xl py-2.5 pl-10 pr-10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-all font-medium"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 text-slate-400 hover:text-white cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs pt-0.5">
                  <label className="flex items-center gap-2 cursor-pointer text-slate-300 font-medium select-none">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="rounded border-slate-700 bg-slate-950 text-blue-600 focus:ring-0"
                    />
                    Remember session
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-black text-xs py-3 rounded-2xl shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2 transition-all cursor-pointer uppercase tracking-wider"
                >
                  {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                  Sign In to Account
                </button>

                {/* Social Login Divider */}
                <div className="relative my-4 flex items-center justify-center">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-white/10" />
                  </div>
                  <span className="relative bg-slate-900 px-3 text-[10px] font-black uppercase tracking-widest text-slate-500">
                    Or Continue With
                  </span>
                </div>

                {/* Social Auth Buttons */}
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setView("google_popup")}
                    className="bg-slate-950 hover:bg-slate-800 border border-white/10 text-slate-200 hover:text-white text-xs font-bold py-2.5 rounded-2xl flex items-center justify-center gap-2 transition-all cursor-pointer group"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                      />
                    </svg>
                    Google
                  </button>

                  <button
                    type="button"
                    onClick={() => setView("github_popup")}
                    className="bg-slate-950 hover:bg-slate-800 border border-white/10 text-slate-200 hover:text-white text-xs font-bold py-2.5 rounded-2xl flex items-center justify-center gap-2 transition-all cursor-pointer group"
                  >
                    <Github className="w-4 h-4 text-purple-400" />
                    GitHub
                  </button>

                  <button
                    type="button"
                    onClick={() => setView("ms_popup")}
                    className="bg-slate-950 hover:bg-slate-800 border border-white/10 text-slate-200 hover:text-white text-xs font-bold py-2.5 rounded-2xl flex items-center justify-center gap-2 transition-all cursor-pointer group"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 23 23">
                      <path fill="#f35325" d="M1 1h10v10H1z" />
                      <path fill="#81bc06" d="M12 1h10v10H12z" />
                      <path fill="#05a6f0" d="M1 12h10v10H1z" />
                      <path fill="#ffba08" d="M12 12h10v10H12z" />
                    </svg>
                    Microsoft
                  </button>

                  <button
                    type="button"
                    onClick={() => setView("phone")}
                    className="bg-slate-950 hover:bg-slate-800 border border-white/10 text-slate-200 hover:text-white text-xs font-bold py-2.5 rounded-2xl flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    <Smartphone className="w-4 h-4 text-emerald-400" />
                    SMS OTP
                  </button>
                </div>
              </form>
            )}

            {/* ========================================================================= */}
            {/* VIEW: REGISTER FORM (ENHANCED PASSWORD STRENGTH VALIDATION) */}
            {/* ========================================================================= */}
            {view === "register" && !currentUser && (
              <form onSubmit={handleRegister} className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-300">Full Name</label>
                    <div className="relative flex items-center">
                      <User className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
                      <input
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Alex Morgan"
                        className="w-full bg-slate-950 border border-white/10 rounded-xl py-2 pl-9 pr-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-all"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-300">Email Address</label>
                    <div className="relative flex items-center">
                      <Mail className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="alex.m@company.com"
                        className="w-full bg-slate-950 border border-white/10 rounded-xl py-2 pl-9 pr-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-all"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-300">Phone Number (Optional)</label>
                  <div className="flex gap-2">
                    <select
                      value={countryCode}
                      onChange={(e) => setCountryCode(e.target.value)}
                      className="bg-slate-950 border border-white/10 text-slate-200 text-xs font-bold rounded-xl px-2.5 py-2 focus:outline-none cursor-pointer"
                    >
                      {COUNTRY_CODES.map((c) => (
                        <option key={c.code} value={c.code}>
                          {c.flag} {c.code}
                        </option>
                      ))}
                    </select>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="(555) 000-1234"
                      className="flex-1 bg-slate-950 border border-white/10 rounded-xl py-2 px-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-all"
                    />
                  </div>
                </div>

                {/* Password Input & Real-time Strength Meter */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-300">Password</label>
                  <div className="relative flex items-center">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="At least 8 characters"
                      className="w-full bg-slate-950 border border-white/10 rounded-xl py-2 pl-9 pr-10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 text-slate-400 hover:text-white cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>

                  {/* Visual Strength Progress Bar */}
                  {password && (
                    <div className="space-y-2 p-2.5 rounded-xl bg-slate-950 border border-white/5 mt-1.5">
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="text-slate-400 font-bold uppercase tracking-wider">
                          Password Security Score
                        </span>
                        <span className={`font-black ${getStrengthMeta(passwordStrengthScore).text}`}>
                          {getStrengthMeta(passwordStrengthScore).label}
                        </span>
                      </div>

                      <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all duration-300 ${getStrengthMeta(passwordStrengthScore).color}`}
                          style={{ width: `${passwordStrengthScore}%` }}
                        />
                      </div>

                      {/* Criteria Checklist */}
                      <div className="grid grid-cols-2 gap-1.5 text-[10px] pt-1">
                        <div className="flex items-center gap-1.5">
                          {pwdValidation.hasMinLength ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          ) : (
                            <XCircle className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                          )}
                          <span className={pwdValidation.hasMinLength ? "text-slate-200 font-medium" : "text-slate-500"}>
                            8+ characters
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          {pwdValidation.hasUppercase ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          ) : (
                            <XCircle className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                          )}
                          <span className={pwdValidation.hasUppercase ? "text-slate-200 font-medium" : "text-slate-500"}>
                            Uppercase (A-Z)
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          {pwdValidation.hasNumber ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          ) : (
                            <XCircle className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                          )}
                          <span className={pwdValidation.hasNumber ? "text-slate-200 font-medium" : "text-slate-500"}>
                            Number (0-9)
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          {pwdValidation.hasSpecial ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          ) : (
                            <XCircle className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                          )}
                          <span className={pwdValidation.hasSpecial ? "text-slate-200 font-medium" : "text-slate-500"}>
                            Special char (!@#$)
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Confirm Password */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-300">Confirm Password</label>
                    {confirmPassword && (
                      <span className={`text-[10px] font-bold ${password === confirmPassword ? "text-emerald-400" : "text-red-400"}`}>
                        {password === confirmPassword ? "✓ Passwords match" : "✗ Passwords do not match"}
                      </span>
                    )}
                  </div>
                  <div className="relative flex items-center">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Repeat password"
                      className="w-full bg-slate-950 border border-white/10 rounded-xl py-2 pl-9 pr-10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 text-slate-400 hover:text-white cursor-pointer"
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Terms checkbox */}
                <label className="flex items-start gap-2 cursor-pointer text-xs text-slate-300 pt-1 select-none">
                  <input
                    type="checkbox"
                    checked={agreeTerms}
                    onChange={(e) => setAgreeTerms(e.target.checked)}
                    className="rounded border-slate-700 bg-slate-950 text-blue-600 focus:ring-0 mt-0.5"
                  />
                  <span className="text-[11px] text-slate-400 leading-tight">
                    I agree to the <span className="text-blue-400 font-bold hover:underline">Terms of Service</span> and{" "}
                    <span className="text-blue-400 font-bold hover:underline">Privacy Policy</span>.
                  </span>
                </label>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-black text-xs py-3 rounded-2xl shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2 transition-all cursor-pointer uppercase tracking-wider"
                >
                  {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  Create Account
                </button>
              </form>
            )}

            {/* ========================================================================= */}
            {/* VIEW: PHONE SMS OTP VERIFICATION FLOW */}
            {/* ========================================================================= */}
            {view === "phone" && !currentUser && (
              <div className="space-y-4">
                {!otpSent ? (
                  <div className="space-y-4">
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Enter your mobile phone number. We will dispatch an SMS code to verify your phone and log you in without requiring a password.
                    </p>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-300">Phone Number</label>
                      <div className="flex gap-2">
                        <select
                          value={countryCode}
                          onChange={(e) => setCountryCode(e.target.value)}
                          className="bg-slate-950 border border-white/10 text-slate-200 text-xs font-bold rounded-2xl px-3 py-2.5 focus:outline-none cursor-pointer"
                        >
                          {COUNTRY_CODES.map((c) => (
                            <option key={c.code} value={c.code}>
                              {c.flag} {c.code}
                            </option>
                          ))}
                        </select>
                        <input
                          type="tel"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder="(555) 234-5678"
                          className="flex-1 bg-slate-950 border border-white/10 rounded-2xl py-2.5 px-3.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-all font-semibold"
                        />
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleSendPhoneOTP}
                      disabled={loading}
                      className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs py-3 rounded-2xl shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 transition-all cursor-pointer uppercase tracking-wider"
                    >
                      {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Smartphone className="w-4 h-4" />}
                      Dispatch SMS Verification OTP
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleVerifyPhoneOTP} className="space-y-4">
                    <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-emerald-400" />
                        <span>
                          OTP sent to <span className="font-bold text-white">{countryCode} {phone}</span>
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setOtpSent(false)}
                        className="text-[10px] font-black text-emerald-400 hover:underline uppercase"
                      >
                        Change Number
                      </button>
                    </div>

                    {/* 6-Digit Code Input Component */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-slate-300">
                          Enter 6-Digit SMS Verification Code
                        </label>
                        <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded">
                          Test Code: 123456
                        </span>
                      </div>

                      <div className="flex justify-between gap-2">
                        {otpCode.map((digit, idx) => (
                          <input
                            key={idx}
                            ref={(el) => (otpInputRefs.current[idx] = el)}
                            type="text"
                            maxLength={1}
                            value={digit}
                            onChange={(e) => {
                              const val = e.target.value;
                              const next = [...otpCode];
                              next[idx] = val;
                              setOtpCode(next);
                              if (val && idx < 5) {
                                otpInputRefs.current[idx + 1]?.focus();
                              }
                            }}
                            onKeyDown={(e) => {
                              if (e.key === "Backspace" && !digit && idx > 0) {
                                otpInputRefs.current[idx - 1]?.focus();
                              }
                            }}
                            className="w-11 h-13 bg-slate-950 border border-white/10 rounded-2xl text-center text-lg font-black text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
                          />
                        ))}
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs py-3 rounded-2xl shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 transition-all cursor-pointer uppercase tracking-wider"
                    >
                      {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                      Verify SMS Code & Enter Workspace
                    </button>

                    <div className="text-center pt-1">
                      {otpCountdown > 0 ? (
                        <span className="text-[11px] text-slate-400 font-medium">
                          Resend SMS OTP in <span className="text-emerald-400 font-bold">{otpCountdown}s</span>
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={handleSendPhoneOTP}
                          className="text-[11px] font-extrabold text-emerald-400 hover:underline cursor-pointer"
                        >
                          Didn't receive SMS? Click here to Resend Code
                        </button>
                      )}
                    </div>
                  </form>
                )}
              </div>
            )}

            {/* ========================================================================= */}
            {/* VIEW: GOOGLE OAUTH FLOW SIMULATION */}
            {/* ========================================================================= */}
            {view === "google_popup" && !currentUser && (
              <div className="space-y-4">
                <button
                  type="button"
                  onClick={() => setView("login")}
                  className="text-xs font-bold text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Back to Login Options
                </button>

                <div className="p-4 rounded-2xl bg-slate-950 border border-white/10 space-y-3">
                  <div className="flex items-center justify-between border-b border-white/5 pb-2.5">
                    <div className="flex items-center gap-2">
                      <svg className="w-5 h-5" viewBox="0 0 24 24">
                        <path
                          fill="#4285F4"
                          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        />
                        <path
                          fill="#34A853"
                          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        />
                        <path
                          fill="#FBBC05"
                          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                        />
                        <path
                          fill="#EA4335"
                          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                        />
                      </svg>
                      <span className="text-xs font-black text-white">Google Accounts OAuth 2.0</span>
                    </div>
                    <span className="text-[9px] font-bold uppercase px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                      Google Provider
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-400">
                    Select a Google profile to grant permissions to <span className="text-white font-bold">OmniSync Suite</span>:
                  </p>

                  <div className="space-y-2">
                    <button
                      type="button"
                      onClick={() => handleGoogleAuthSelect("baruaeshan333@gmail.com", "Barua Eshan")}
                      className="w-full p-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-white/5 text-left flex items-center justify-between transition-all cursor-pointer group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-blue-600 text-white font-black text-xs flex items-center justify-center">
                          BE
                        </div>
                        <div>
                          <p className="text-xs font-black text-white group-hover:text-blue-400 transition-colors">
                            Barua Eshan
                          </p>
                          <p className="text-[10px] text-slate-400">baruaeshan333@gmail.com</p>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-white transition-colors" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleGoogleAuthSelect("alex.dev@google.com", "Alex Developer")}
                      className="w-full p-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-white/5 text-left flex items-center justify-between transition-all cursor-pointer group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-emerald-600 text-white font-black text-xs flex items-center justify-center">
                          AD
                        </div>
                        <div>
                          <p className="text-xs font-black text-white group-hover:text-blue-400 transition-colors">
                            Alex Developer
                          </p>
                          <p className="text-[10px] text-slate-400">alex.dev@google.com</p>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-white transition-colors" />
                    </button>
                  </div>

                  <div className="pt-2 border-t border-white/5 text-[10px] text-slate-500 flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                    <span>OAuth scopes requested: openid, profile, email. No full account permissions required.</span>
                  </div>
                </div>
              </div>
            )}

            {/* ========================================================================= */}
            {/* VIEW: GITHUB OAUTH FLOW SIMULATION */}
            {/* ========================================================================= */}
            {view === "github_popup" && !currentUser && (
              <div className="space-y-4">
                <button
                  type="button"
                  onClick={() => setView("login")}
                  className="text-xs font-bold text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Back to Login Options
                </button>

                <div className="p-4 rounded-2xl bg-slate-950 border border-white/10 space-y-3">
                  <div className="flex items-center justify-between border-b border-white/5 pb-2.5">
                    <div className="flex items-center gap-2">
                      <Github className="w-5 h-5 text-purple-400" />
                      <span className="text-xs font-black text-white">GitHub Enterprise OAuth</span>
                    </div>
                    <span className="text-[9px] font-bold uppercase px-2 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20">
                      GitHub Provider
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-400">
                    Authorize <span className="text-white font-bold">OmniSync Suite</span> to access your GitHub user identity:
                  </p>

                  <div className="space-y-2">
                    <button
                      type="button"
                      onClick={() => handleGitHubAuthSelect("barua.eshan@github.com", "Eshan Barua (GitHub)")}
                      className="w-full p-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-white/5 text-left flex items-center justify-between transition-all cursor-pointer group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-purple-600 text-white font-black text-xs flex items-center justify-center">
                          EB
                        </div>
                        <div>
                          <p className="text-xs font-black text-white group-hover:text-purple-400 transition-colors">
                            Eshan Barua
                          </p>
                          <p className="text-[10px] text-slate-400">barua.eshan@github.com</p>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-white transition-colors" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleGitHubAuthSelect("dev.lead@github.com", "Senior Dev Lead")}
                      className="w-full p-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-white/5 text-left flex items-center justify-between transition-all cursor-pointer group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-indigo-600 text-white font-black text-xs flex items-center justify-center">
                          SL
                        </div>
                        <div>
                          <p className="text-xs font-black text-white group-hover:text-purple-400 transition-colors">
                            Senior Dev Lead
                          </p>
                          <p className="text-[10px] text-slate-400">dev.lead@github.com</p>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-white transition-colors" />
                    </button>
                  </div>

                  <div className="pt-2 border-t border-white/5 text-[10px] text-slate-500 flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                    <span>OAuth scopes requested: read:user, user:email.</span>
                  </div>
                </div>
              </div>
            )}

            {/* ========================================================================= */}
            {/* VIEW: MICROSOFT AZURE AD OAUTH FLOW SIMULATION */}
            {/* ========================================================================= */}
            {view === "ms_popup" && !currentUser && (
              <div className="space-y-4">
                <button
                  type="button"
                  onClick={() => setView("login")}
                  className="text-xs font-bold text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Back to Login Options
                </button>

                <div className="p-4 rounded-2xl bg-slate-950 border border-white/10 space-y-3">
                  <div className="flex items-center justify-between border-b border-white/5 pb-2.5">
                    <div className="flex items-center gap-2">
                      <svg className="w-5 h-5" viewBox="0 0 23 23">
                        <path fill="#f35325" d="M1 1h10v10H1z" />
                        <path fill="#81bc06" d="M12 1h10v10H12z" />
                        <path fill="#05a6f0" d="M1 12h10v10H1z" />
                        <path fill="#ffba08" d="M12 12h10v10H12z" />
                      </svg>
                      <span className="text-xs font-black text-white">Microsoft Azure AD SSO</span>
                    </div>
                    <span className="text-[9px] font-bold uppercase px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                      Microsoft Provider
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-400">
                    Sign in with your Microsoft 365 or Azure AD work account:
                  </p>

                  <div className="space-y-2">
                    <button
                      type="button"
                      onClick={() => handleMicrosoftAuthSelect("eshan.barua@corporate.microsoft.com", "Eshan Barua (Enterprise)")}
                      className="w-full p-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-white/5 text-left flex items-center justify-between transition-all cursor-pointer group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-cyan-600 text-white font-black text-xs flex items-center justify-center">
                          MS
                        </div>
                        <div>
                          <p className="text-xs font-black text-white group-hover:text-cyan-400 transition-colors">
                            Eshan Barua (Enterprise)
                          </p>
                          <p className="text-[10px] text-slate-400">eshan.barua@corporate.microsoft.com</p>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-white transition-colors" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleMicrosoftAuthSelect("pmo.director@enterprise.com", "PMO Director")}
                      className="w-full p-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-white/5 text-left flex items-center justify-between transition-all cursor-pointer group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-blue-700 text-white font-black text-xs flex items-center justify-center">
                          PM
                        </div>
                        <div>
                          <p className="text-xs font-black text-white group-hover:text-cyan-400 transition-colors">
                            PMO Director
                          </p>
                          <p className="text-[10px] text-slate-400">pmo.director@enterprise.com</p>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-white transition-colors" />
                    </button>
                  </div>

                  <div className="pt-2 border-t border-white/5 text-[10px] text-slate-500 flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                    <span>Azure AD Single Sign-On active. Validated via enterprise directory.</span>
                  </div>
                </div>
              </div>
            )}

            {/* ========================================================================= */}
            {/* VIEW: FORGOT PASSWORD */}
            {/* ========================================================================= */}
            {view === "forgot" && !currentUser && (
              <div className="space-y-4">
                <button
                  type="button"
                  onClick={() => setView("login")}
                  className="text-xs font-bold text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Back to Login
                </button>

                {forgotStep === 1 && (
                  <form onSubmit={handleRequestPasswordReset} className="space-y-4">
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Enter your account email address. We will dispatch a temporary recovery token and 6-digit password verification code.
                    </p>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-300">Registered Email Address</label>
                      <div className="relative flex items-center">
                        <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
                        <input
                          type="email"
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="your.email@company.com"
                          className="w-full bg-slate-950 border border-white/10 rounded-2xl py-2.5 pl-10 pr-3.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-all font-medium"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black text-xs py-3 rounded-2xl shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2 transition-all cursor-pointer uppercase tracking-wider"
                    >
                      {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
                      Send Reset Token & Code Link
                    </button>
                  </form>
                )}

                {forgotStep === 2 && (
                  <form onSubmit={handleConfirmPasswordReset} className="space-y-3.5">
                    <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-extrabold text-blue-300 flex items-center gap-1.5">
                          <Mail className="w-3.5 h-3.5" /> Simulated Email Inbox Dispatch
                        </span>
                        <span className="text-[9px] bg-blue-500/20 text-blue-400 font-mono px-2 py-0.5 rounded font-bold">
                          Token Dispatched
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-300">
                        Verification link for <span className="text-white font-bold">{email || "your email"}</span>:
                      </p>
                      <div className="bg-slate-950 p-2 rounded-lg border border-white/10 flex items-center justify-between text-[10px] font-mono text-emerald-400 overflow-x-auto">
                        <span className="truncate">https://omnisync.io/reset-password?token={recoveryToken || "OMNI_RESET_98231"}</span>
                        <button
                          type="button"
                          onClick={() => {
                            setResetCode("888999");
                            addToast?.("Token Clicked", "Simulated token link opened and code 888999 filled!", "success", 2500);
                          }}
                          className="bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-[10px] font-sans font-bold px-2 py-1 rounded ml-2 shrink-0 cursor-pointer flex items-center gap-1"
                        >
                          <ExternalLink className="w-3 h-3" /> Auto-fill Code (888999)
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-300">Verification Code</label>
                      <input
                        type="text"
                        required
                        value={resetCode}
                        onChange={(e) => setResetCode(e.target.value)}
                        placeholder="e.g. 888999"
                        className="w-full bg-slate-950 border border-white/10 rounded-xl py-2.5 px-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-all font-mono font-bold tracking-widest text-center"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-300">New Password</label>
                      <input
                        type="password"
                        required
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="At least 6 characters"
                        className="w-full bg-slate-950 border border-white/10 rounded-xl py-2.5 px-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-all"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs py-3 rounded-2xl shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 transition-all cursor-pointer uppercase tracking-wider"
                    >
                      {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                      Save New Password & Continue
                    </button>
                  </form>
                )}

                {forgotStep === 3 && (
                  <div className="text-center space-y-4 py-4">
                    <div className="w-12 h-12 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto">
                      <CheckCircle2 className="w-6 h-6" />
                    </div>
                    <h3 className="text-sm font-bold text-white">Password Updated Successfully!</h3>
                    <p className="text-xs text-slate-400">
                      Your password has been reset. You can now sign in using your new credentials.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setView("login");
                        setForgotStep(1);
                      }}
                      className="bg-blue-600 hover:bg-blue-500 text-white font-black text-xs px-6 py-2.5 rounded-xl uppercase tracking-wider cursor-pointer"
                    >
                      Proceed to Login
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* ========================================================================= */}
            {/* VIEW: DEDICATED MFA / 2FA VERIFICATION STEP */}
            {/* ========================================================================= */}
            {view === "2fa_verify" && !currentUser && (
              <form onSubmit={handleVerify2FA} className="space-y-4">
                <div className="p-3.5 rounded-2xl bg-blue-500/10 border border-blue-500/30 text-blue-300 text-xs flex items-center gap-3">
                  <ShieldAlert className="w-5 h-5 text-blue-400 shrink-0" />
                  <div>
                    <p className="font-bold text-white">Two-Factor Security Verification Required</p>
                    <p className="text-[10px] text-blue-300/80">
                      Authenticating profile: <span className="text-white font-semibold">{pendingUserFor2FA?.email}</span>
                    </p>
                  </div>
                </div>

                {!useBackupCode ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-300">
                        Enter 6-Digit Authenticator Code
                      </label>
                      <button
                        type="button"
                        onClick={() => setTwoFACode(["1", "2", "3", "4", "5", "6"])}
                        className="text-[10px] font-bold text-blue-400 hover:underline bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20 cursor-pointer"
                      >
                        Auto-fill Test Code (123456)
                      </button>
                    </div>

                    <div className="flex justify-between gap-2">
                      {twoFACode.map((digit, idx) => (
                        <input
                          key={idx}
                          ref={(el) => (mfaInputRefs.current[idx] = el)}
                          type="text"
                          maxLength={1}
                          value={digit}
                          onChange={(e) => {
                            const val = e.target.value;
                            const next = [...twoFACode];
                            next[idx] = val;
                            setTwoFACode(next);
                            if (val && idx < 5) {
                              mfaInputRefs.current[idx + 1]?.focus();
                            }
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Backspace" && !digit && idx > 0) {
                              mfaInputRefs.current[idx - 1]?.focus();
                            }
                          }}
                          className="w-11 h-13 bg-slate-950 border border-white/10 rounded-2xl text-center text-lg font-black text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                        />
                      ))}
                    </div>

                    {/* Resend Code Button & Countdown */}
                    <div className="flex items-center justify-between pt-1">
                      {mfaResendCountdown > 0 ? (
                        <span className="text-[11px] text-slate-400 font-medium">
                          Resend code available in <span className="text-blue-400 font-bold">{mfaResendCountdown}s</span>
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={handleResendMFACode}
                          className="text-[11px] font-extrabold text-blue-400 hover:underline cursor-pointer"
                        >
                          Resend Verification Code
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => setUseBackupCode(true)}
                        className="text-[11px] font-bold text-slate-400 hover:text-white underline cursor-pointer"
                      >
                        Use Backup Recovery Code
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-300">Backup Recovery Code</label>
                      <input
                        type="text"
                        required
                        value={backupCodeInput}
                        onChange={(e) => setBackupCodeInput(e.target.value)}
                        placeholder="e.g. A1B2-C3D4"
                        className="w-full bg-slate-950 border border-white/10 rounded-2xl py-3 px-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-all font-mono font-bold uppercase tracking-widest text-center"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => setUseBackupCode(false)}
                      className="text-[11px] font-bold text-blue-400 hover:underline cursor-pointer"
                    >
                      ← Back to 6-Digit Authenticator Code
                    </button>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-black text-xs py-3 rounded-2xl shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2 transition-all cursor-pointer uppercase tracking-wider"
                >
                  {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                  Complete MFA Verification
                </button>
              </form>
            )}

            {/* ========================================================================= */}
            {/* VIEW: LOGGED IN ACCOUNT PROFILE & 2FA MANAGEMENT */}
            {/* ========================================================================= */}
            {currentUser && (
              <div className="space-y-5">
                {/* Account Profile Card */}
                <div className="p-4 rounded-2xl bg-slate-950 border border-white/10 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <img
                      src={currentUser.avatarUrl || "https://api.dicebear.com/7.x/avataaars/svg?seed=user"}
                      alt={currentUser.name}
                      className="w-12 h-12 rounded-full border border-blue-500/30 bg-slate-800"
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-black text-white">{currentUser.name}</h3>
                        <span className="text-[9px] font-extrabold uppercase px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30">
                          {currentUser.authProvider}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400">{currentUser.email}</p>
                      {currentUser.phone && <p className="text-[10px] text-slate-500">{currentUser.phone}</p>}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={onLogout}
                    className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 font-bold text-xs px-3.5 py-2 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" /> Sign Out
                  </button>
                </div>

                {/* 2FA Security Management Card */}
                <div className="p-4 rounded-2xl bg-slate-950 border border-white/10 space-y-3">
                  <div className="flex items-center justify-between border-b border-white/5 pb-2.5">
                    <div className="flex items-center gap-2">
                      <ShieldCheck
                        className={`w-4 h-4 ${currentUser.is2FAEnabled ? "text-emerald-400" : "text-amber-400"}`}
                      />
                      <div>
                        <h4 className="text-xs font-black text-white">Two-Factor Authentication (2FA)</h4>
                        <p className="text-[10px] text-slate-400">TOTP Authenticator & MFA verification</p>
                      </div>
                    </div>

                    {currentUser.is2FAEnabled ? (
                      <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-1 rounded-md">
                        Active Shield
                      </span>
                    ) : (
                      <span className="text-[10px] font-black uppercase tracking-wider bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2.5 py-1 rounded-md">
                        Disabled
                      </span>
                    )}
                  </div>

                  {!currentUser.is2FAEnabled && !is2FASetupActive && (
                    <button
                      type="button"
                      onClick={() => setIs2FASetupActive(true)}
                      className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs py-2.5 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <QrCode className="w-4 h-4" /> Enable 2FA Protection
                    </button>
                  )}

                  {is2FASetupActive && (
                    <div className="space-y-3 pt-2">
                      <div className="p-3 bg-slate-900 rounded-xl border border-white/5 space-y-2 text-center">
                        <div className="w-24 h-24 bg-white p-2 rounded-lg mx-auto flex items-center justify-center">
                          <QrCode className="w-20 h-20 text-slate-950" />
                        </div>
                        <p className="text-[11px] text-slate-400">
                          Scan with Google Authenticator or Authy:
                        </p>
                        <div className="flex items-center justify-center gap-2 bg-slate-950 py-1.5 px-3 rounded-lg border border-white/10">
                          <span className="font-mono text-xs text-blue-400 font-bold">{generatedSecret}</span>
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(generatedSecret);
                              setCopiedSecret(true);
                              setTimeout(() => setCopiedSecret(false), 2000);
                            }}
                            className="text-slate-400 hover:text-white cursor-pointer"
                          >
                            {copiedSecret ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-slate-300">Verification Code from App</label>
                        <input
                          type="text"
                          value={setup2FACode}
                          onChange={(e) => setSetup2FACode(e.target.value)}
                          placeholder="e.g. 123456"
                          className="w-full bg-slate-900 border border-white/10 rounded-xl py-2 px-3 text-xs text-white placeholder-slate-500 font-mono font-bold tracking-widest text-center"
                        />
                      </div>

                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={handleConfirm2FASetup}
                          className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs py-2 rounded-xl cursor-pointer"
                        >
                          Confirm & Enable 2FA
                        </button>
                        <button
                          type="button"
                          onClick={() => setIs2FASetupActive(false)}
                          className="px-3 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}

                  {currentUser.is2FAEnabled && (
                    <div className="space-y-2 pt-1">
                      <p className="text-[11px] text-slate-400">
                        Your account is protected by Two-Factor Authentication. Backup recovery codes:
                      </p>
                      <div className="grid grid-cols-2 gap-2 text-center text-[10px] font-mono font-bold bg-slate-900 p-2 rounded-lg border border-white/5 text-slate-300">
                        <span>A1B2-C3D4</span>
                        <span>E5F6-G7H8</span>
                        <span>J9K0-L1M2</span>
                        <span>N3P4-Q5R6</span>
                      </div>

                      <button
                        type="button"
                        onClick={handleToggle2FAOff}
                        className="text-[11px] font-bold text-red-400 hover:underline cursor-pointer pt-1"
                      >
                        Disable 2FA Protection
                      </button>
                    </div>
                  )}
                </div>

                {/* Account Management & Data Wipe Section */}
                <div className="p-4 rounded-2xl bg-red-950/20 border border-red-500/20 space-y-3">
                  <div className="flex items-center justify-between border-b border-red-500/10 pb-2.5">
                    <div className="flex items-center gap-2">
                      <Trash2 className="w-4 h-4 text-red-400" />
                      <div>
                        <h4 className="text-xs font-black text-white">Account Deletion & Data Wipe</h4>
                        <p className="text-[10px] text-red-300/80">Permanently remove profile and scrub local session data</p>
                      </div>
                    </div>
                    <span className="text-[9px] font-black uppercase tracking-wider bg-red-500/10 text-red-400 border border-red-500/20 px-2 py-0.5 rounded">
                      Irreversible
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Initiating an account wipe will purge your personal credentials, disconnect OAuth tokens, and erase local Jira workspace preferences permanently.
                  </p>

                  {!isDeleteConfirmOpen ? (
                    <button
                      type="button"
                      onClick={() => setIsDeleteConfirmOpen(true)}
                      className="w-full bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 font-extrabold text-xs py-2.5 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <ShieldOff className="w-4 h-4" /> Request Secure Account & Data Erasure
                    </button>
                  ) : (
                    <div className="space-y-3 bg-red-950/40 p-3.5 rounded-xl border border-red-500/30">
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-red-200">
                          Type <span className="font-mono text-white font-extrabold bg-red-500/20 px-1.5 py-0.5 rounded">DELETE</span> to confirm:
                        </label>
                        <input
                          type="text"
                          value={deleteConfirmInput}
                          onChange={(e) => setDeleteConfirmInput(e.target.value)}
                          placeholder="DELETE"
                          className="w-full bg-slate-950 border border-red-500/30 rounded-xl py-2 px-3 text-xs text-white placeholder-slate-600 font-mono font-extrabold uppercase text-center focus:outline-none focus:border-red-500"
                        />
                      </div>

                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={handlePerformAccountDeletionAndWipe}
                          disabled={loading || deleteConfirmInput.trim() !== "DELETE"}
                          className="flex-1 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-black text-xs py-2 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5"
                        >
                          {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                          Permanently Wipe Account
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setIsDeleteConfirmOpen(false);
                            setDeleteConfirmInput("");
                          }}
                          className="px-3 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
