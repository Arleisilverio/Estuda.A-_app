import React, { useState } from 'react'
import { supabase } from './lib/supabase'
import { Mail, Lock, Eye, EyeOff, Loader2, GraduationCap } from 'lucide-react'

const AppLogo = () => (
    <div className="size-20 relative flex items-center justify-center bg-white rounded-[30%] shadow-2xl shadow-blue-500/20 border-2 border-white/10 overflow-hidden mb-2">
        <img 
            src="https://i.supaimg.com/ab10c538-a9f0-4a7a-9c0d-5a65ded30e00/a022583e-d218-4eac-b41f-63e9255e4177.jpg" 
            alt="Estuda Aí Logo" 
            className="w-full h-full object-cover"
        />
    </div>
)

export default function Login() {
    const [mode, setMode] = useState('login') // 'login' | 'register'
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [acceptedTerms, setAcceptedTerms] = useState(false)
    const [showTerms, setShowTerms] = useState(false)
    const [showPrivacy, setShowPrivacy] = useState(false)

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError('')
        
        if (mode === 'register' && !acceptedTerms) {
            setError('Você precisa aceitar os termos de uso para continuar.')
            return
        }

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
                <div className="flex flex-col items-center gap-4 mb-2">
                    <AppLogo />
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

                        {/* Termos de Uso - Apenas no Cadastro */}
                        {mode === 'register' && (
                            <div className="flex items-start gap-3 px-1 mt-1">
                                <div className="pt-0.5">
                                    <input
                                        type="checkbox"
                                        id="terms"
                                        checked={acceptedTerms}
                                        onChange={e => setAcceptedTerms(e.target.checked)}
                                        className="size-4 rounded-lg bg-estuda-bg border-estuda-primary/20 text-estuda-primary focus:ring-estuda-primary/30 cursor-pointer"
                                    />
                                </div>
                                <label htmlFor="terms" className="text-[10px] sm:text-xs leading-relaxed text-white/50 font-medium cursor-pointer select-none">
                                    Li e concordo com os{' '}
                                    <button type="button" onClick={() => setShowTerms(true)} className="text-estuda-primary font-black hover:underline">Termos de Uso</button>
                                    {' '}e as{' '}
                                    <button type="button" onClick={() => setShowPrivacy(true)} className="text-estuda-primary font-black hover:underline">Políticas de Privacidade</button>.
                                </label>
                            </div>
                        )}

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

            {/* Modal Termos de Uso (Placeholder) */}
            {(showTerms || showPrivacy) && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 sm:p-10 pointer-events-auto">
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => { setShowTerms(false); setShowPrivacy(false) }} />
                    <div className="bg-estuda-surface border border-white/10 w-full max-w-2xl max-h-[80vh] rounded-[2.5rem] p-8 sm:p-10 flex flex-col relative z-20 animate-scale-up overflow-hidden shadow-2xl">
                        <div className="overflow-y-auto pr-4 custom-scrollbar">
                            <h2 className="text-2xl font-black text-white mb-6">
                                {showTerms ? 'Termos de Uso' : 'Políticas de Privacidade'}
                            </h2>
                            <div className="text-sm leading-relaxed text-white/60 space-y-4 font-medium">
                                {showTerms ? (
                                    <>
                                        <p>Seja bem-vindo ao Estuda Aí. Ao utilizar nossa plataforma, você concorda em cumprir e estar vinculado aos seguintes termos:</p>
                                        <p><strong>1. Uso da Plataforma:</strong> O Estuda Aí é uma ferramenta de apoio ao estudo. O uso indevido para trapaças ou plágio é de inteira responsabilidade do usuário.</p>
                                        <p><strong>2. Conteúdo de IA:</strong> As respostas são geradas por Inteligência Artificial e devem ser verificadas pelo usuário. Não garantimos precisão absoluta.</p>
                                        <p><strong>3. Responsabilidade do Professor:</strong> Professores são responsáveis pelo material didático que disponibilizam.</p>
                                    </>
                                ) : (
                                    <>
                                        <p>Sua privacidade é importante para nós. Esta política descreve como tratamos seus dados:</p>
                                        <p><strong>1. Coleta de Dados:</strong> Coletamos e-mail e nome para autenticação e personalização da experiência.</p>
                                        <p><strong>2. Arquivos Enviados:</strong> Os materiais de estudo são processados para gerar conhecimento para a IA e não são compartilhados com terceiros.</p>
                                        <p><strong>3. Segurança:</strong> Utilizamos infraestrutura segura do Supabase (PostgreSQL) para proteger suas informações.</p>
                                    </>
                                )}
                            </div>
                        </div>
                        <button 
                            onClick={() => { setShowTerms(false); setShowPrivacy(false) }}
                            className="mt-8 w-full py-4 rounded-2xl bg-white/5 border border-white/10 font-black text-xs uppercase tracking-widest hover:bg-white/10 transition-colors"
                        >
                            Fechar
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}
