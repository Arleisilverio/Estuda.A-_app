import React, { useState } from 'react'
import { supabase } from './lib/supabase'
import { Mail, Lock, Eye, EyeOff, Loader2, GraduationCap } from 'lucide-react'

const AppLogo = () => (
    <div className="size-14 relative flex items-center justify-center bg-[#4A90E2] rounded-[30%] shadow-2xl shadow-[#4A90E2]/40 border-2 border-white/10">
        <svg viewBox="0 0 24 24" className="w-[60%] h-[60%] text-white" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M16 11c0-3.5-2.5-5.5-5.5-5.5S5 7.5 5 11c0 3 2.5 5 5.5 5h2" />
            <path d="M16 11h3l2 1-2 1h-3" />
            <circle cx="11.5" cy="9.5" r="0.8" fill="currentColor" stroke="none" />
            <path d="M9 16v3" />
            <path d="M12 16v3" />
        </svg>
    </div>
)

export default function Login() {
    const [mode, setMode] = useState('login') // 'login' | 'register'
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError('')
        setLoading(true)

        try {
            if (mode === 'register') {
                const { error } = await supabase.auth.signUp({ email, password })
                if (error) throw error
            } else {
                const { error } = await supabase.auth.signInWithPassword({ email, password })
                if (error) throw error
            }
        } catch (err) {
            const msgs = {
                'Invalid login credentials': 'E-mail ou senha incorretos.',
                'User already registered': 'Este e-mail já está cadastrado. Faça login.',
                'Password should be at least 6 characters': 'A senha precisa ter pelo menos 6 caracteres.',
                'Unable to validate email address: invalid format': 'Formato de e-mail inválido.',
            }
            setError(msgs[err.message] || err.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-estuda-bg text-estuda-text flex flex-col items-center justify-center p-6 relative overflow-hidden">
            {/* Background decorativo */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-40 -right-40 w-96 h-96 bg-estuda-primary/10 rounded-full blur-3xl" />
                <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-blue-600/5 rounded-full blur-3xl" />
            </div>

            <div className="w-full max-w-sm relative z-10 animate-fade-in">
                {/* Logo e título */}
                <div className="flex flex-col items-center gap-4 mb-10">
                    <AppLogo />
                    <div className="text-center">
                        <h1 className="text-2xl font-black tracking-tight text-white">
                            Estuda <span className="text-estuda-primary">Aí</span>
                        </h1>
                        <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-estuda-secondary mt-1">
                            Caminho para o Sucesso
                        </p>
                    </div>
                </div>

                {/* Card */}
                <div className="bg-estuda-surface border border-estuda-primary/10 rounded-[2.5rem] p-8 shadow-2xl shadow-black/40">
                    {/* Toggle Entrar / Criar Conta */}
                    <div className="flex bg-estuda-bg rounded-2xl p-1 mb-8">
                        {['login', 'register'].map(m => (
                            <button
                                key={m}
                                onClick={() => { setMode(m); setError('') }}
                                className={`flex-1 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider transition-all ${mode === m
                                        ? 'bg-estuda-primary text-white shadow-lg'
                                        : 'text-estuda-secondary hover:text-white'
                                    }`}
                            >
                                {m === 'login' ? 'Entrar' : 'Criar Conta'}
                            </button>
                        ))}
                    </div>

                    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                        {/* E-mail */}
                        <div>
                            <label className="block text-[10px] font-black uppercase tracking-widest opacity-50 mb-1.5 pl-1">
                                E-mail
                            </label>
                            <div className="relative group">
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 group-focus-within:text-estuda-primary transition-colors">
                                    <Mail size={18} />
                                </div>
                                <input
                                    required
                                    type="email"
                                    placeholder="seu@email.com"
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                    autoComplete="email"
                                    className="w-full bg-estuda-bg border border-estuda-primary/10 rounded-2xl pl-12 pr-4 py-3.5 text-sm font-bold focus:outline-none focus:border-estuda-primary/60 transition-colors placeholder:text-white/20 text-white"
                                />
                            </div>
                        </div>

                        {/* Senha */}
                        <div>
                            <label className="block text-[10px] font-black uppercase tracking-widest opacity-50 mb-1.5 pl-1">
                                Senha
                            </label>
                            <div className="relative group">
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 group-focus-within:text-estuda-primary transition-colors">
                                    <Lock size={18} />
                                </div>
                                <input
                                    required
                                    type={showPassword ? 'text' : 'password'}
                                    placeholder={mode === 'register' ? 'Mínimo 6 caracteres' : '••••••••'}
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
                                    className="w-full bg-estuda-bg border border-estuda-primary/10 rounded-2xl pl-12 pr-12 py-3.5 text-sm font-bold focus:outline-none focus:border-estuda-primary/60 transition-colors placeholder:text-white/20 text-white"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
                                >
                                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                        </div>

                        {/* Erro */}
                        {error && (
                            <div className="bg-red-500/10 border border-red-500/20 rounded-2xl px-4 py-3 text-xs font-bold text-red-400 animate-fade-in">
                                {error}
                            </div>
                        )}

                        {/* Botão */}
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-4 rounded-2xl font-black text-sm bg-estuda-primary text-white hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-estuda-primary/30 flex items-center justify-center gap-2 mt-2 disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                            {loading
                                ? <><Loader2 className="animate-spin" size={18} /> Aguarde...</>
                                : mode === 'login' ? 'ENTRAR' : 'CRIAR MINHA CONTA'
                            }
                        </button>
                    </form>

                    {mode === 'login' && (
                        <p className="text-center text-xs opacity-30 font-semibold mt-6">
                            Não tem conta?{' '}
                            <button onClick={() => { setMode('register'); setError('') }} className="text-estuda-primary font-black opacity-100 hover:underline">
                                Cadastre-se grátis
                            </button>
                        </p>
                    )}
                </div>

                <p className="text-center text-[9px] text-white/20 font-semibold mt-8 uppercase tracking-widest">
                    Estuda Aí © 2026 · Todos os direitos reservados
                </p>
            </div>
        </div>
    )
}
