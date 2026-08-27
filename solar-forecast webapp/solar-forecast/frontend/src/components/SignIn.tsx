import React, { useState } from 'react';
import {
  Sun,
  Zap,
  Lock,
  Mail,
  User as UserIcon,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Globe,
  Building2,
  ChevronRight,
} from 'lucide-react';
import { User } from '../types';

interface SignInProps {
  onSignIn: (user: User) => void;
}

const DEMO_USERS: (User & { badge: string; description: string })[] = [
  {
    id: 'demo-1',
    name: 'Eng. Ahmad Mansour',
    email: 'operator@benban-solar.eg',
    role: 'Solar Plant Operator',
    organization: 'Benban Solar Complex (Aswan, Egypt)',
    badge: '🇪🇬 Benban Operator',
    description: '1.65 GWp African Solar Hub access',
  },
  {
    id: 'demo-2',
    name: 'Larissa Silveira',
    email: 'engineer@ons-brasil.gov.br',
    role: 'Grid Operations Lead',
    organization: 'ONS National Grid (Brazil)',
    badge: '🇧🇷 Grid Engineer',
    description: 'Brazilian state cluster forecasting',
  },
  {
    id: 'demo-3',
    name: 'Alex Chen',
    email: 'analyst@sunova.energy',
    role: 'Renewables Forecaster',
    organization: 'Sunova Global Clean Tech',
    badge: '🌐 Global Analyst',
    description: 'Multi-region physics modelling',
  },
];

export const SignIn: React.FC<SignInProps> = ({ onSignIn }) => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [organization, setOrganization] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim() || !email.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }

    if (!password || password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    if (isSignUp && !name.trim()) {
      setError('Please enter your full name.');
      return;
    }

    setIsLoading(true);

    setTimeout(() => {
      setIsLoading(false);
      const user: User = {
        id: `user-${Date.now()}`,
        name: isSignUp ? name.trim() : email.split('@')[0].replace('.', ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
        email: email.trim().toLowerCase(),
        role: isSignUp ? 'Solar PV Engineer' : 'System Operator',
        organization: organization.trim() || 'Renewable Energy Operations',
      };
      onSignIn(user);
    }, 600);
  };

  const handleQuickDemoLogin = (demoUser: User) => {
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      onSignIn(demoUser);
    }, 400);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col lg:flex-row antialiased">
      {/* LEFT PANEL — generated hero visual + branding + feature highlights */}
      <div className="relative lg:w-[46%] lg:min-h-screen flex flex-col justify-between overflow-hidden border-b lg:border-b-0 lg:border-r border-slate-800/80">
        {/* Generated SVG background */}
        <img
          src={`${import.meta.env.BASE_URL}images/signin-hero.svg`}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 w-full h-full object-cover"
        />
        {/* Scrim so text stays legible over the illustration */}
        <div className="absolute inset-0 bg-gradient-to-b from-slate-950/40 via-slate-950/55 to-slate-950/90" />

        <div className="relative z-10 px-8 pt-8 sm:px-10 sm:pt-10">
          <div className="inline-flex items-center space-x-3">
            <div className="h-11 w-11 rounded-2xl bg-gradient-to-tr from-solar-500 to-solar-300 flex items-center justify-center shadow-xl shadow-solar-500/25 ring-2 ring-solar-400/20">
              <Sun className="h-6 w-6 text-slate-950 stroke-[2.5]" />
            </div>
            <div className="text-left">
              <span className="font-display font-bold text-xl tracking-tight text-white block">Sunova</span>
              <span className="instrument-label text-solar-400">Solar Forecast Engine</span>
            </div>
          </div>
        </div>

        <div className="relative z-10 px-8 pb-10 sm:px-10 sm:pb-12 space-y-8">
          <div className="space-y-3 max-w-sm">
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-white tracking-tight leading-tight">
              Forecast every plant.
              <br />Trust every prediction.
            </h1>
            <p className="text-sm text-slate-300 leading-relaxed">
              Satellite-derived weather feeds, pvlib physics transposition, and SAPM temperature modelling — 24 hours ahead.
            </p>
          </div>

          {/* Feature bullets */}
          <div className="space-y-2.5">
            <div className="flex items-start space-x-2.5 text-xs text-slate-300">
              <CheckCircle2 className="h-4 w-4 text-flux-400 shrink-0 mt-0.5" />
              <span><strong className="text-white">Global Asset Support:</strong> Benban (Egypt), Brazilian States & worldwide.</span>
            </div>
            <div className="flex items-start space-x-2.5 text-xs text-slate-300">
              <CheckCircle2 className="h-4 w-4 text-flux-400 shrink-0 mt-0.5" />
              <span><strong className="text-white">pvlib Physics:</strong> 192-step POA transposition, East-West backtracking.</span>
            </div>
            <div className="flex items-start space-x-2.5 text-xs text-slate-300">
              <CheckCircle2 className="h-4 w-4 text-flux-400 shrink-0 mt-0.5" />
              <span><strong className="text-white">Night Masking:</strong> Automatic astronomical solar elevation.</span>
            </div>
          </div>

          {/* Quick Demo Access */}
          <div className="space-y-3 pt-5 border-t border-slate-700/50">
            <div className="flex items-center justify-between">
              <span className="instrument-label text-slate-300 flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5 text-solar-400" />
                One-Click Demo Access
              </span>
            </div>
            <div className="space-y-2">
              {DEMO_USERS.map((demo) => (
                <button
                  key={demo.id}
                  type="button"
                  onClick={() => handleQuickDemoLogin(demo)}
                  disabled={isLoading}
                  className="w-full text-left p-2.5 rounded-xl bg-slate-950/50 hover:bg-slate-900/60 border border-slate-700/70 hover:border-solar-500/40 hover:-translate-y-0.5 backdrop-blur-md transition-all duration-200 flex items-center justify-between group cursor-pointer press-feedback"
                >
                  <div className="space-y-0.5 pr-2">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-semibold text-white group-hover:text-solar-300 transition-colors">
                        {demo.name}
                      </span>
                      <span className="instrument-label px-1.5 py-0.5 bg-slate-800/50 text-slate-300 border border-slate-700 text-[9px]">
                        {demo.badge}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 truncate max-w-[220px]">
                      {demo.organization}
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-slate-500 group-hover:text-solar-400 group-hover:translate-x-0.5 transition-all shrink-0" />
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT PANEL — sign-in form floating over a solar-plant sunset photo */}
      <div className="relative flex-1 flex flex-col justify-center px-6 py-12 sm:px-10 lg:px-16 overflow-hidden">
        <img
          src={`${import.meta.env.BASE_URL}images/signin-bg.jpg`}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-l from-slate-950/20 via-slate-950/35 to-slate-950/60" />

        <div className="relative z-10 w-full max-w-sm mx-auto space-y-6 bg-slate-950/50 backdrop-blur-md border border-slate-800/80 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-black/50">
          <div className="space-y-1">
            <span className="instrument-label text-solar-400">Secure Sign In</span>
            <h2 className="font-display text-2xl font-bold text-white tracking-tight">
              {isSignUp ? 'Create your account' : 'Sign in to Sunova'}
            </h2>
            <p className="text-xs text-slate-400">Access your solar forecasting dashboard</p>
          </div>

          {/* Mode Switch Tabs */}
          <div className="flex rounded-xl bg-slate-900/50 p-1 border border-slate-800">
            <button
              type="button"
              onClick={() => {
                setIsSignUp(false);
                setError(null);
              }}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all duration-200 cursor-pointer press-feedback ${
                !isSignUp
                  ? 'bg-solar-500 text-slate-950 font-bold shadow-md shadow-solar-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setIsSignUp(true);
                setError(null);
              }}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all duration-200 cursor-pointer press-feedback ${
                isSignUp
                  ? 'bg-solar-500 text-slate-950 font-bold shadow-md shadow-solar-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              Create Account
            </button>
          </div>

          {/* Error banner */}
          {error && (
            <div className="p-3 rounded-xl bg-flame-950/50 border border-flame-500/40 text-xs text-flame-300">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignUp && (
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Full Name
                </label>
                <div className="relative">
                  <UserIcon className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-500" />
                  <input
                    type="text"
                    required={isSignUp}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Eng. Tarek Hassan"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-700 focus:border-solar-500 focus:ring-1 focus:ring-solar-500 rounded-xl text-sm font-medium text-white placeholder-slate-600 transition-all"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Work Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-500" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="engineer@sunova.energy"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-700 focus:border-solar-500 focus:ring-1 focus:ring-solar-500 rounded-xl text-sm font-medium text-white placeholder-slate-600 transition-all"
                />
              </div>
            </div>

            {isSignUp && (
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Organization / Plant Location
                </label>
                <div className="relative">
                  <Building2 className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-500" />
                  <input
                    type="text"
                    value={organization}
                    onChange={(e) => setOrganization(e.target.value)}
                    placeholder="e.g. Benban Solar Park, Egypt"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-700 focus:border-solar-500 focus:ring-1 focus:ring-solar-500 rounded-xl text-sm font-medium text-white placeholder-slate-600 transition-all"
                  />
                </div>
              </div>
            )}

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-slate-300">
                  Password
                </label>
                {!isSignUp && (
                  <button
                    type="button"
                    onClick={() => setError('Password reset instructions sent to your email.')}
                    className="text-[11px] text-flux-400 hover:text-flux-300 hover:underline transition-all duration-150"
                  >
                    Forgot password?
                  </button>
                )}
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-500" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-10 pr-10 py-2.5 bg-slate-900 border border-slate-700 focus:border-solar-500 focus:ring-1 focus:ring-solar-500 rounded-xl text-sm font-medium text-white placeholder-slate-600 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-slate-500 hover:text-slate-300 transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {!isSignUp && (
              <div className="flex items-center">
                <input
                  id="remember-me"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-700 bg-slate-900 text-solar-500 focus:ring-solar-500/20"
                />
                <label htmlFor="remember-me" className="ml-2 block text-xs text-slate-400">
                  Remember me on this browser
                </label>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 flex items-center justify-center space-x-2 px-6 py-3 rounded-xl bg-gradient-to-r from-solar-500 to-solar-400 hover:from-solar-400 hover:to-solar-300 hover:shadow-solar-500/30 hover:-translate-y-0.5 text-slate-950 font-bold text-sm shadow-xl shadow-solar-500/20 disabled:opacity-50 disabled:hover:translate-y-0 transition-all duration-200 cursor-pointer press-feedback"
            >
              {isLoading ? (
                <span>Authenticating...</span>
              ) : (
                <>
                  <span>{isSignUp ? 'Create Operator Account' : 'Sign In'}</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          <p className="text-center text-xs text-slate-500">
            Sunova Solar AI &middot; Encrypted Session
          </p>
        </div>
      </div>
    </div>
  );
};

