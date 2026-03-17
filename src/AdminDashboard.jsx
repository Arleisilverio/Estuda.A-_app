
import React, { useState, useEffect } from 'react'
import { 
    Users, 
    User, 
    GraduationCap, 
    ShieldCheck, 
    Trash2, 
    Search, 
    Filter, 
    ArrowLeft, 
    TrendingUp, 
    TrendingDown,
    Calendar,
    BadgeAlert,
    ChevronDown,
    Loader2,
    History
} from 'lucide-react'
import { supabase } from './lib/supabase'

export default function AdminDashboard({ onClose }) {
    const [users, setUsers] = useState([])
    const [logs, setLogs] = useState([])
    const [stats, setStats] = useState({
        total: 0,
        students: 0,
        professors: 0,
        admins: 0,
        deleted: 0
    })
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')
    const [roleFilter, setRoleFilter] = useState('all')
    const [viewMode, setViewMode] = useState('active') // 'active' or 'stats'

    useEffect(() => {
        fetchData()
    }, [])

    const fetchData = async () => {
        setLoading(true)
        try {
            // 1. Fetch active profiles
            const { data: profiles, error: pError } = await supabase
                .from('profiles')
                .select('*')
                .order('created_at', { ascending: false })
            
            if (pError) throw pError

            // 2. Fetch logs (for deletions and history)
            const { data: activityLogs, error: lError } = await supabase
                .from('user_activity_logs')
                .select('*')
                .order('created_at', { ascending: false })

            if (lError) {
                console.warn('Logs table might not exist yet:', lError.message)
            }

            const currentLogs = activityLogs || []
            setLogs(currentLogs)
            setUsers(profiles || [])

            // Calculating stats
            const studentCount = profiles.filter(u => u.user_role === 'student' || !u.user_role).length
            const profCount = profiles.filter(u => u.user_role === 'professor').length
            const adminCount = profiles.filter(u => u.user_role === 'admin').length
            const deletedCount = currentLogs.filter(l => l.event_type === 'deletion').length

            setStats({
                total: profiles.length,
                students: studentCount,
                professors: profCount,
                admins: adminCount,
                deleted: deletedCount
            })

        } catch (err) {
            console.error('Error fetching dashboard data:', err)
        } finally {
            setLoading(false)
        }
    }

    const handleDeleteUser = async (targetUser) => {
        if (!window.confirm(`AVISO IRREVERSÍVEL!\n\nTem certeza que deseja apagar permanentemente a conta de "${targetUser.name || targetUser.email}"?\n\nIsso apagará DOCUMENTOS, QUIZZES e HISTÓRICO em cascata. Esta ação não pode ser desfeita.`)) return

        try {
            // Log deletion event before hard delete
            await supabase.from('user_activity_logs').insert({
                user_id: targetUser.id,
                user_name: targetUser.name,
                user_role: targetUser.user_role,
                course: targetUser.course,
                period: targetUser.period,
                event_type: 'deletion'
            })

            const { error } = await supabase.functions.invoke('user-management', {
                body: { action: 'delete', userId: targetUser.id }
            })

            if (error) throw error
            alert('Usuário removido com sucesso e evento registrado.')
            fetchData()
        } catch (err) {
            alert('Erro ao excluir usuário: ' + err.message)
        }
    }

    const filteredUsers = users.filter(u => {
        const matchesSearch = (u.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                               u.email?.toLowerCase().includes(searchTerm.toLowerCase()))
        const matchesRole = roleFilter === 'all' || (u.user_role || 'student') === roleFilter
        return matchesSearch && matchesRole
    })

    return (
        <div className="fixed inset-0 z-[100] bg-estuda-bg flex flex-col animate-fade-in overflow-hidden">
            {/* Header */}
            <header className="p-6 bg-estuda-surface border-b border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button 
                        onClick={onClose}
                        className="p-2 rounded-2xl bg-white/5 hover:bg-white/10 text-white transition-all"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h1 className="text-xl font-black text-white">Dashboard do Administrador</h1>
                        <p className="text-[10px] text-yellow-500 font-bold uppercase tracking-widest">Gestão Total de Acadêmicos</p>
                    </div>
                </div>
                
                <div className="flex items-center gap-2 bg-black/20 p-1 rounded-2l border border-white/5">
                    <button 
                        onClick={() => setViewMode('active')}
                        className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'active' ? 'bg-yellow-500 text-black shadow-lg shadow-yellow-500/20' : 'text-white/40 hover:text-white'}`}
                    >
                        Usuários Ativos
                    </button>
                    <button 
                        onClick={() => setViewMode('stats')}
                        className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'stats' ? 'bg-yellow-500 text-black shadow-lg shadow-yellow-500/20' : 'text-white/40 hover:text-white'}`}
                    >
                        Estatísticas & Logs
                    </button>
                </div>
            </header>

            <main className="flex-1 overflow-y-auto p-6 lg:p-10 custom-scrollbar">
                {/* Stats Grid */}
                <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-10">
                    <StatCard title="Total" value={stats.total} icon={<Users size={20}/>} color="yellow" />
                    <StatCard title="Alunos" value={stats.students} icon={<GraduationCap size={20}/>} color="green" />
                    <StatCard title="Professores" value={stats.professors} icon={<User size={20}/>} color="blue" />
                    <StatCard title="Admins" value={stats.admins} icon={<ShieldCheck size={20}/>} color="purple" />
                    <StatCard title="Exclusões" value={stats.deleted} icon={<TrendingDown size={20}/>} color="red" />
                </div>

                {viewMode === 'active' ? (
                    <div className="space-y-6">
                        {/* Filters */}
                        <div className="flex flex-col lg:flex-row gap-4 items-center justify-between bg-estuda-surface/30 p-4 rounded-3xl border border-white/5">
                            <div className="relative flex-1 w-full">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" size={18} />
                                <input 
                                    type="text"
                                    placeholder="Buscar por nome ou e-mail..."
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 pl-12 pr-4 text-sm focus:border-yellow-500/50 outline-none transition-all"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                            <div className="flex gap-2 w-full lg:w-auto">
                                <select 
                                    className="bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-xs font-bold outline-none focus:border-yellow-500/50 transition-all flex-1"
                                    value={roleFilter}
                                    onChange={(e) => setRoleFilter(e.target.value)}
                                >
                                    <option value="all">Todos os Cargos</option>
                                    <option value="student">Alunos</option>
                                    <option value="professor">Professores</option>
                                    <option value="admin">Administradores</option>
                                </select>
                            </div>
                        </div>

                        {/* List */}
                        <div className="bg-estuda-surface/20 rounded-[2.55rem] border border-white/5 overflow-hidden">
                            <table className="w-full text-left border-collapse">
                                <thead className="bg-white/5">
                                    <tr>
                                        <th className="px-6 py-4 text-[10px] uppercase font-black tracking-widest text-white/40">Usuário</th>
                                        <th className="px-6 py-4 text-[10px] uppercase font-black tracking-widest text-white/40">Curso / Período</th>
                                        <th className="px-6 py-4 text-[10px] uppercase font-black tracking-widest text-white/40">Cadastro</th>
                                        <th className="px-6 py-4 text-[10px] uppercase font-black tracking-widest text-white/40">Status</th>
                                        <th className="px-6 py-4 text-right"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {loading ? (
                                        <tr>
                                            <td colSpan="5" className="py-20 text-center">
                                                <Loader2 className="animate-spin text-yellow-500 mx-auto mb-4" size={32} />
                                                <p className="text-xs font-bold uppercase tracking-widest opacity-40">Processando base de dados...</p>
                                            </td>
                                        </tr>
                                    ) : filteredUsers.length === 0 ? (
                                        <tr>
                                            <td colSpan="5" className="py-20 text-center opacity-40">Nenhum acadêmico encontrado com esses filtros.</td>
                                        </tr>
                                    ) : (
                                        filteredUsers.map(u => (
                                            <tr key={u.id} className="hover:bg-white/5 transition-colors group">
                                                <td className="px-6 py-5">
                                                    <div className="flex items-center gap-4">
                                                        <div className="size-10 rounded-2xl bg-estuda-primary/10 flex items-center justify-center text-estuda-primary font-black text-xs border border-estuda-primary/20">
                                                            {u.avatar_url ? <img src={u.avatar_url} className="size-full object-cover rounded-2xl"/> : u.name?.charAt(0) || 'U'}
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-black text-white">{u.name || 'Sem Nome'}</p>
                                                            <p className="text-[10px] opacity-40 font-bold">{u.email || 'id: ' + u.id.substring(0,8)}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-5">
                                                    <div className="flex flex-col gap-1">
                                                        <span className="text-xs font-bold text-white/80">{u.course || 'Nenhum'}</span>
                                                        <span className="text-[10px] text-yellow-500/60 font-black uppercase">{u.period ? `${u.period}º Período` : 'Sem período'}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-5">
                                                    <div className="flex items-center gap-2 text-white/40">
                                                        <Calendar size={14} />
                                                        <span className="text-[10px] font-bold">{u.created_at ? new Date(u.created_at).toLocaleDateString('pt-BR') : '---'}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-5">
                                                    <span className={`text-[9px] font-black uppercase px-2 py-1 rounded-lg border ${
                                                        u.user_role === 'admin' ? 'bg-red-500/10 border-red-500/20 text-red-400' :
                                                        u.user_role === 'professor' ? 'bg-blue-500/10 border-blue-500/20 text-blue-400' :
                                                        'bg-green-500/10 border-green-500/20 text-green-400'
                                                    }`}>
                                                        {u.user_role || 'Estudante'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-5 text-right">
                                                    <button 
                                                        onClick={() => handleDeleteUser(u)}
                                                        className="p-3 text-red-500 hover:bg-red-500/10 rounded-2xl transition-all opacity-0 group-hover:opacity-100"
                                                        title="Exclusão Permanente"
                                                    >
                                                        <Trash2 size={18} />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ) : (
                    /* Stats View */
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-fade-in">
                        {/* Feed de Atividade */}
                        <div className="bg-estuda-surface/30 rounded-[2.5rem] border border-white/5 p-8">
                            <h3 className="text-lg font-black text-white mb-6 flex items-center gap-2">
                                <History size={20} className="text-yellow-500" /> Histórico de Movimentação
                            </h3>
                            <div className="space-y-4 max-h-[500px] overflow-y-auto pr-4 custom-scrollbar">
                                {logs.length === 0 ? (
                                    <p className="text-center py-10 opacity-30 italic text-sm">Nenhum log de auditoria encontrado.</p>
                                ) : (
                                    logs.map((l, i) => (
                                        <div key={i} className={`p-4 rounded-2xl border flex items-start gap-4 ${l.event_type === 'deletion' ? 'bg-red-500/5 border-red-500/10' : 'bg-green-500/5 border-green-500/10'}`}>
                                            <div className={`p-2 rounded-xl mt-1 ${l.event_type === 'deletion' ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'}`}>
                                                {l.event_type === 'deletion' ? <TrendingDown size={14} /> : <TrendingUp size={14} />}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex justify-between items-start mb-1">
                                                    <p className="text-xs font-black text-white">{l.event_type === 'deletion' ? 'Conta Excluída' : 'Novo Cadastro'}</p>
                                                    <span className="text-[10px] opacity-40 font-bold">{new Date(l.created_at).toLocaleString('pt-BR')}</span>
                                                </div>
                                                <p className="text-[11px] text-white/60 font-medium truncate">
                                                    {l.user_name || 'Desconhecido'} ({l.user_role || 'aluno'})
                                                </p>
                                                {l.course && <p className="text-[9px] text-yellow-500/50 uppercase font-black mt-1">{l.course} • {l.period}º Período</p>}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        {/* Gráficos / Insights */}
                        <div className="bg-estuda-surface/30 rounded-[2.5rem] border border-white/5 p-8 flex flex-col items-center justify-center text-center">
                            <div className="size-20 rounded-3xl bg-yellow-500/10 flex items-center justify-center text-yellow-500 mb-6">
                                <TrendingUp size={40} />
                            </div>
                            <h3 className="text-xl font-black text-white mb-2">Resumo da Rede</h3>
                            <p className="text-sm text-white/50 max-w-xs mb-8">Base de dados saudável com um crescimento de {stats.total > 0 ? ((stats.total / (stats.total + stats.deleted)) * 100).toFixed(1) : 0}% em retenção acadêmica.</p>
                            
                            <div className="w-full space-y-4">
                                <ProgressBar label="Retenção vs Exclusão" value={stats.total} total={stats.total + stats.deleted} color="yellow" />
                                <ProgressBar label="Academia (Alunos)" value={stats.students} total={stats.total} color="green" />
                                <ProgressBar label="Corpo Docente" value={stats.professors} total={stats.total} color="blue" />
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    )
}

function StatCard({ title, value, icon, color }) {
    const colors = {
        yellow: 'text-yellow-500 bg-yellow-500/10',
        green: 'text-green-500 bg-green-500/10',
        blue: 'text-blue-500 bg-blue-500/10',
        purple: 'text-purple-500 bg-purple-500/10',
        red: 'text-red-500 bg-red-500/10'
    }
    return (
        <div className="bg-estuda-surface/40 p-5 rounded-[2.5rem] border border-white/5 hover:border-white/10 transition-all group overflow-hidden relative">
            <div className="flex items-center gap-3 relative z-10">
                <div className={`p-2 rounded-xl ${colors[color]} group-hover:scale-110 transition-transform`}>
                    {icon}
                </div>
                <div>
                    <p className="text-[9px] font-black uppercase tracking-widest text-white/40">{title}</p>
                    <p className="text-2xl font-black text-white">{value}</p>
                </div>
            </div>
            <div className={`absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity ${colors[color]}`}>
                {icon}
            </div>
        </div>
    )
}

function ProgressBar({ label, value, total, color }) {
    const percentage = total > 0 ? (value / total) * 100 : 0
    const colors = {
        yellow: 'bg-yellow-500',
        green: 'bg-green-500',
        blue: 'bg-blue-500'
    }
    return (
        <div className="w-full text-left">
            <div className="flex justify-between items-center mb-2 px-1">
                <span className="text-[10px] font-black uppercase tracking-widest opacity-60">{label}</span>
                <span className="text-[10px] font-black">{value} / {total}</span>
            </div>
            <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                <div 
                    className={`h-full ${colors[color]} rounded-full transition-all duration-1000 shadow-[0_0_10px_rgba(255,255,255,0.1)]`}
                    style={{ width: `${percentage}%` }}
                ></div>
            </div>
        </div>
    )
}
