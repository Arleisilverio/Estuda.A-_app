import React, { useState, useEffect } from 'react'
import { supabase } from './lib/supabase'
import { 
    Upload, 
    FileText, 
    MessageSquare, 
    Layers, 
    ChevronLeft,
    ChevronRight, 
    CheckCircle, 
    Loader2, 
    Brain, 
    LogOut,
    Sparkles,
    Trash2,
    User,
    Camera,
    Book,
    Mail,
    FileQuestion,
    Calendar,
    Plus
} from 'lucide-react'

export default function ProfessorPortal({ session, onLogout, isAdmin, setViewingProfessorPortal }) {
    const [subjects, setSubjects] = useState([])
    const [selectedSubject, setSelectedSubject] = useState(null)
    const [documents, setDocuments] = useState([])
    const [uploading, setUploading] = useState(false)
    const [loading, setLoading] = useState(true)
    const [messages, setMessages] = useState([])
    const [query, setQuery] = useState('')
    
    // Onboarding para novos professores
    const [showOnboarding, setShowOnboarding] = useState(false)
    const [allAvailableSubjects, setAllAvailableSubjects] = useState([])
    const [onboardingName, setOnboardingName] = useState('')
    const [onboardingSubjectId, setOnboardingSubjectId] = useState('')
    const [onboardingAvatar, setOnboardingAvatar] = useState(null)
    const [professorInfo, setProfessorInfo] = useState({ name: '', avatar: null })

    // Estado para Gestão de Provas e Anotações
    const [showExamForm, setShowExamForm] = useState(false)
    const [newExam, setNewExam] = useState({ title: '', subject: '', subtitle: '', date: '', time: '' })
    const [professorNote, setProfessorNote] = useState('')
    const [savingNote, setSavingNote] = useState(false)
    const [exams, setExams] = useState([])


    useEffect(() => {
        if (session) {
            fetchProfessorData()
        }
    }, [session])

    useEffect(() => {
        if (selectedSubject) {
            fetchDocuments()
            fetchExams()
            
            // Se inscrever para mudanças em tempo real na tabela de documentos
            const channel = supabase
                .channel('documents-changes')
                .on('postgres_changes', { 
                    event: '*', 
                    schema: 'public', 
                    table: 'documents',
                    filter: `subject_id=eq.${selectedSubject.id}`
                }, () => {
                    fetchDocuments()
                })
                .subscribe()

            return () => {
                supabase.removeChannel(channel)
            }
        }
    }, [selectedSubject])

    const fetchProfessorData = async () => {
        try {
            setLoading(true)
            // Buscar as matérias vinculadas ao professor
            const { data: profData, error: profError } = await supabase
                .from('professors')
                .select('subject_id, name, avatar_url, subjects(*)')
                .eq('user_id', session.user.id)

            if (profError) throw profError
            
            if (profData && profData.length > 0) {
                const subjs = profData.map(p => p.subjects).filter(Boolean)
                setSubjects(subjs)
                if (subjs.length > 0) setSelectedSubject(subjs[0])
                
                // Salvar info do professor (pegando do primeiro registro vinculante)
                setProfessorInfo({
                    name: profData[0].name || session.user.email,
                    avatar: profData[0].avatar_url
                })
                
                setShowOnboarding(false)
            } else {
                // Se não tiver dados, inicia onboarding
                setShowOnboarding(true)
                const { data: allSubjs } = await supabase.from('subjects').select('*')
                if (allSubjs) setAllAvailableSubjects(allSubjs)
            }
        } catch (err) {
            console.error('Erro ao buscar dados do professor:', err)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        if (selectedSubject) {
            setProfessorNote(selectedSubject.professor_notes || '')
        }
    }, [selectedSubject])

    const handleUpdateNote = async () => {
        if (!selectedSubject) return
        setSavingNote(true)
        try {
            const { error } = await supabase
                .from('subjects')
                .update({ professor_notes: professorNote })
                .eq('id', selectedSubject.id)
            
            if (error) throw error
            alert('Anotações atualizadas com sucesso!')
            
            // Atualizar estado local das matérias
            setSubjects(prev => prev.map(s => s.id === selectedSubject.id ? { ...s, professor_notes: professorNote } : s))
            setSelectedSubject(prev => ({ ...prev, professor_notes: professorNote }))
        } catch (err) {
            alert('Erro ao salvar anotação: ' + err.message)
        } finally {
            setSavingNote(false)
        }
    }

    const handleAddExam = async (e) => {
        e.preventDefault()
        setLoading(true)
        try {
            const { error } = await supabase.from('exams').insert({
                title: newExam.title,
                subject: newExam.subject,
                subtitle: newExam.subtitle,
                date: newExam.date,
                time: newExam.time,
                user_id: session.user.id
            })

            if (error) throw error
            alert('Prova agendada com sucesso!')
            setShowExamForm(false)
            setNewExam({ title: '', subject: '', subtitle: '', date: '', time: '' })
            fetchExams() // Refresh list
        } catch (err) {
            alert('Erro ao agendar prova: ' + err.message)
        } finally {
            setLoading(false)
        }
    }

    const handleOnboardingSubmit = async (e) => {
        e.preventDefault()
        if (!onboardingName.trim() || !onboardingSubjectId) return

        try {
            setLoading(true)
            const { error } = await supabase
                .from('professors')
                .insert({
                    user_id: session.user.id,
                    name: onboardingName,
                    subject_id: onboardingSubjectId,
                    avatar_url: onboardingAvatar,
                    phone_number: 'PENDENTE_' + session.user.id.slice(0, 8)
                })
            
            if (error) throw error
            fetchProfessorData() // Recarregar dados após insert
        } catch (err) {
            alert('Erro no onboarding: ' + err.message)
        } finally {
            setLoading(false)
        }
    }

    const fetchExams = async () => {
        if (!selectedSubject) return
        try {
            const { data, error } = await supabase
                .from('exams')
                .select('*')
                .eq('subject', selectedSubject.name)
                .order('date', { ascending: true })
            
            if (!error && data) setExams(data)
        } catch (err) {
            console.error('Erro ao buscar provas:', err)
        }
    }

    const fetchDocuments = async () => {
        if (!selectedSubject) return
        const { data, error } = await supabase
            .from('documents')
            .select('*')
            .eq('subject_id', selectedSubject.id)
            .order('name', { ascending: true })
        
        if (!error && data) setDocuments(data)
    }

    const handleFileUpload = async (e) => {
        const file = e.target.files[0]
        if (!file || !selectedSubject) return

        try {
            setUploading(true)
            const fileExt = file.name.split('.').pop()
            const fileName = `${Math.random()}.${fileExt}`
            const filePath = `documents/${selectedSubject.id}/${fileName}`

            const { error: uploadError } = await supabase.storage
                .from('documents')
                .upload(filePath, file)

            if (uploadError) throw uploadError

            const { data: docData, error: dbError } = await supabase
                .from('documents')
                .insert({
                    name: file.name,
                    file_path: filePath,
                    subject_id: selectedSubject.id,
                    user_id: session.user.id,
                    status: 'processing'
                })
                .select()
                .single()

            if (dbError) throw dbError
            
            fetchDocuments()

            // Disparar o processamento em background (não aguardamos o resultado aqui)
            supabase.functions.invoke('process-document', {
                body: { documentId: docData.id }
            }).catch(e => console.error('Erro ao chamar processamento:', e))

            alert('Material enviado com sucesso! O processamento iniciará em breve.')
        } catch (err) {
            alert('Erro no upload: ' + err.message)
        } finally {
            setUploading(false)
        }
    }

    const handleAskIA = async () => {
        if (!query.trim() || !selectedSubject) return
        
        const userMsg = { role: 'user', content: query }
        setMessages(prev => [...prev, userMsg])
        setQuery('')
        setLoading(true)

        try {
            const { data, error } = await supabase.functions.invoke('ask-ai', {
                body: { 
                    query, 
                    subjectId: selectedSubject.id,
                    mode: 'curation' // Um modo especial para o professor validar o conteúdo
                }
            })

            if (error) throw error
            setMessages(prev => [...prev, { role: 'assistant', content: data.answer }])
        } catch (err) {
            setMessages(prev => [...prev, { role: 'assistant', content: 'Erro ao consultar IA: ' + err.message }])
        } finally {
            setLoading(false)
        }
    }

    if (loading && subjects.length === 0 && !showOnboarding) {
        return (
            <div className="min-h-screen bg-estuda-bg flex flex-col items-center justify-center p-6">
                <Loader2 className="animate-spin text-estuda-primary mb-4" size={48} />
                <p className="text-white/40 font-bold uppercase tracking-widest text-xs">Carregando Portal do Professor...</p>
            </div>
        )
    }

    if (showOnboarding) {
        return (
            <div className="min-h-screen bg-estuda-bg text-white flex flex-col items-center justify-center p-6">
                <div className="w-full max-w-md bg-estuda-surface border border-estuda-primary/10 rounded-[2.5rem] p-8 shadow-2xl animate-fade-in">
                    <div className="flex flex-col items-center gap-4 mb-8 text-center">
                        <div className="size-16 rounded-3xl bg-estuda-primary/20 flex items-center justify-center text-estuda-primary shadow-xl">
                            <Sparkles size={32} />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black">Bem-vindo, Professor!</h2>
                            <p className="text-xs opacity-50 mt-1">Sua conta foi autorizada pelo administrador. <br/> Complete seu cadastro para começar.</p>
                        </div>
                    </div>

                    <form onSubmit={handleOnboardingSubmit} className="flex flex-col gap-6">
                        {/* Upload Avatar */}
                        <div className="flex flex-col items-center gap-3">
                            <label className="relative group cursor-pointer">
                                <div className="size-24 rounded-[2rem] bg-estuda-bg border-2 border-estuda-primary/20 flex items-center justify-center overflow-hidden transition-all group-hover:border-estuda-primary/50">
                                    {onboardingAvatar ? (
                                        <img src={onboardingAvatar} alt="preview" className="w-full h-full object-cover" />
                                    ) : (
                                        <User size={32} className="opacity-20" />
                                    )}
                                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Camera size={20} />
                                    </div>
                                </div>
                                <input 
                                    type="file" 
                                    className="hidden" 
                                    accept="image/*" 
                                    onChange={(e) => {
                                        const file = e.target.files[0]
                                        if (file) {
                                            const reader = new FileReader()
                                            reader.onload = (ev) => setOnboardingAvatar(ev.target.result)
                                            reader.readAsDataURL(file)
                                        }
                                    }} 
                                />
                            </label>
                            <span className="text-[10px] font-black uppercase tracking-widest opacity-40">Sua Foto (Opcional)</span>
                        </div>

                        <div>
                            <label className="block text-[10px] font-black uppercase tracking-widest opacity-50 mb-2 pl-1">Seu Nome Completo</label>
                            <input 
                                required
                                type="text" 
                                value={onboardingName}
                                onChange={e => setOnboardingName(e.target.value)}
                                className="w-full bg-estuda-bg border border-estuda-primary/10 rounded-2xl px-4 py-3.5 text-sm font-bold focus:outline-none focus:border-estuda-primary/60 transition-all text-white"
                                placeholder="Prof. Exemplo"
                            />
                        </div>

                        <div>
                            <label className="block text-[10px] font-black uppercase tracking-widest opacity-50 mb-2 pl-1">Matéria que leciona</label>
                            <select 
                                required
                                value={onboardingSubjectId}
                                onChange={e => setOnboardingSubjectId(e.target.value)}
                                className="w-full bg-estuda-bg border border-estuda-primary/10 rounded-2xl px-4 py-3.5 text-sm font-bold focus:outline-none focus:border-estuda-primary/60 transition-all text-white appearance-none cursor-pointer"
                            >
                                <option value="">Selecione uma matéria</option>
                                {allAvailableSubjects.map(s => (
                                    <option key={s.id} value={s.id}>{s.name}</option>
                                ))}
                            </select>
                        </div>

                        <button 
                            type="submit"
                            disabled={loading || !onboardingName.trim() || !onboardingSubjectId}
                            className="w-full py-4 rounded-2xl font-black text-sm bg-estuda-primary text-white hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-estuda-primary/30 flex items-center justify-center gap-2 mt-2 disabled:opacity-50"
                        >
                            {loading ? <Loader2 className="animate-spin" size={20} /> : 'CONFIGURAR MEU ACESSO'}
                        </button>
                    </form>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-estuda-bg text-white flex flex-col pt-20 pb-10 px-4 sm:px-10">
            {/* Logo Fixa Topo */}
            <div className="fixed top-6 left-6 z-50 animate-fade-in h-10 w-10 overflow-hidden rounded-xl border border-white/10 shadow-xl bg-white flex items-center justify-center">
                <img 
                    src="https://i.supaimg.com/ab10c538-a9f0-4a7a-9c0d-5a65ded30e00/a022583e-d218-4eac-b41f-63e9255e4177.jpg" 
                    alt="Logo" 
                    className="w-full h-full object-cover"
                />
            </div>
            {/* Header Portal */}
            <div className="flex flex-col sm:flex-row items-center justify-between mb-8 gap-6 bg-estuda-surface p-6 rounded-[2.5rem] border border-estuda-primary/10 shadow-lg">
                <div className="flex items-center gap-5">
                    {/* Avatar do Professor */}
                    <div className="relative">
                        {professorInfo.avatar ? (
                            <img src={professorInfo.avatar} alt="avatar" className="size-16 rounded-[1.8rem] object-cover ring-2 ring-estuda-primary/20 bg-estuda-bg shadow-xl" />
                        ) : (
                            <div className="size-16 rounded-[1.8rem] bg-estuda-primary/20 flex items-center justify-center text-estuda-primary shadow-xl ring-2 ring-estuda-primary/10">
                                <User size={28} />
                            </div>
                        )}
                        <div className="absolute -bottom-1 -right-1 size-6 bg-emerald-500 rounded-lg border-2 border-estuda-surface flex items-center justify-center shadow-lg">
                            <CheckCircle size={12} className="text-white" />
                        </div>
                    </div>

                    <div>
                        <div className="flex items-center gap-2 mb-0.5">
                            <span className="text-[10px] font-black uppercase tracking-widest text-estuda-primary flex items-center gap-1.5">
                                <Sparkles size={10} /> Portal do Professor
                            </span>
                        </div>
                        <h1 className="text-xl font-black text-white">{professorInfo.name}</h1>
                        <p className="text-[10px] font-bold opacity-40 uppercase tracking-tighter flex items-center gap-1.5 mt-0.5">
                            <Book size={10} className="text-estuda-primary/60" /> 
                            Lecionando: <span className="text-white/60">{selectedSubject?.name || 'Carregando...'}</span>
                        </p>
                    </div>
                </div>
                
                <div className="flex items-center gap-4">
                    <div className="hidden sm:flex flex-col items-end mr-2 text-right">
                        <span className="text-[10px] font-black uppercase tracking-widest opacity-30 leading-none mb-1">Status do Agente</span>
                        <div className="flex items-center gap-1.5">
                            <div className="size-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                            <span className="text-[10px] font-black text-emerald-500 uppercase">IA Ativa</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {isAdmin && (
                            <button 
                                onClick={() => setViewingProfessorPortal(false)}
                                className="bg-white/5 hover:bg-white/10 text-white px-5 py-2.5 rounded-2xl transition-all flex items-center gap-2 font-black text-[10px] uppercase tracking-widest border border-white/10 shadow-lg"
                            >
                                <ChevronLeft size={16} /> Voltar ao App
                            </button>
                        )}
                        <button 
                            onClick={onLogout}
                            className="bg-red-500/5 hover:bg-red-500/10 text-red-400 px-5 py-2.5 rounded-2xl transition-all flex items-center gap-2 font-black text-[10px] uppercase tracking-widest border border-red-500/10"
                        >
                            <LogOut size={16} /> Sair
                        </button>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 flex-1">
                {/* Coluna Esquerda: Matérias e Files */}
                <div className="lg:col-span-4 flex flex-col gap-6">
                    {/* Seleção de Matéria */}
                    <div className="bg-estuda-surface border border-estuda-primary/10 rounded-[2rem] p-6 shadow-lg">
                        <h3 className="text-sm font-black uppercase tracking-widest opacity-50 mb-4 pl-1">Minhas Matérias</h3>
                        <div className="flex flex-col gap-2">
                            {subjects.map(s => (
                                <button
                                    key={s.id}
                                    onClick={() => setSelectedSubject(s)}
                                    className={`flex items-center justify-between p-4 rounded-2xl transition-all border-2 ${
                                        selectedSubject?.id === s.id 
                                        ? 'bg-estuda-primary border-estuda-primary/20 shadow-lg' 
                                        : 'bg-estuda-bg border-transparent hover:border-estuda-primary/30'
                                    }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <span className="text-2xl">{s.icon_name}</span>
                                        <span className="font-bold text-sm">{s.name}</span>
                                    </div>
                                    <ChevronRight size={16} className={selectedSubject?.id === s.id ? 'opacity-100' : 'opacity-20'} />
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Upload Area */}
                    <div className="bg-estuda-surface border border-estuda-primary/10 rounded-[2rem] p-6 shadow-lg">
                        <h3 className="text-sm font-black uppercase tracking-widest opacity-50 mb-4 pl-1">Nutrir Conhecimento</h3>
                        <label className="flex flex-col items-center justify-center p-8 rounded-3xl border-2 border-dashed border-estuda-primary/20 bg-estuda-bg hover:bg-estuda-primary/5 hover:border-estuda-primary/50 transition-all cursor-pointer text-center group">
                            <input type="file" className="hidden" accept=".pdf" onChange={handleFileUpload} disabled={uploading} />
                            {uploading ? (
                                <Loader2 className="animate-spin text-estuda-primary mb-3" size={32} />
                            ) : (
                                <Upload className="text-estuda-primary/40 group-hover:text-estuda-primary mb-3 group-hover:scale-110 transition-all" size={32} />
                            )}
                            <span className="font-bold text-xs">Clique para subir PDF</span>
                            <span className="text-[10px] opacity-40 mt-1 uppercase font-bold tracking-tighter">Máximo 10MB</span>
                        </label>

                        {/* Lista de Arquivos */}
                        <div className="mt-8">
                            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] opacity-30 mb-4">Materiais Ativos</h4>
                            <div className="flex flex-col gap-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                                {documents.map(doc => (
                                    <div key={doc.id} className="flex items-center justify-between bg-estuda-bg p-3 rounded-xl border border-white/5">
                                        <div className="flex items-center gap-3 overflow-hidden">
                                            <FileText size={16} className="text-estuda-primary shrink-0" />
                                            <span className="text-[10px] font-bold truncate">{doc.name}</span>
                                        </div>
                                        {doc.status === 'ready' ? (
                                            <CheckCircle size={14} className="text-emerald-500 shrink-0" />
                                        ) : (
                                            <Loader2 size={14} className="animate-spin text-estuda-primary shrink-0" />
                                        )}
                                    </div>
                                ))}
                                {documents.length === 0 && (
                                    <p className="text-[10px] text-center opacity-30 italic">Nenhum arquivo nesta matéria</p>
                                )}
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={() => {
                            setNewExam({ ...newExam, subject: selectedSubject?.name || '' })
                            setShowExamForm(true)
                        }}
                        className="w-full bg-estuda-primary text-white p-5 rounded-[2rem] font-black text-sm hover:scale-105 active:scale-95 transition-all shadow-xl shadow-estuda-primary/20 flex items-center justify-center gap-3"
                    >
                        <Calendar size={20} /> Agendar Nova Prova
                    </button>

                    {/* Lista de Provas Agendadas pelo Professor */}
                    <div className="bg-estuda-surface border border-estuda-primary/10 rounded-[2rem] p-6 shadow-lg">
                        <h3 className="text-sm font-black uppercase tracking-widest opacity-50 mb-4 pl-1">Provas Agendadas</h3>
                        <div className="flex flex-col gap-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                            {exams.length === 0 ? (
                                <p className="text-[10px] text-center opacity-30 italic py-4">Nenhuma prova agendada para esta matéria</p>
                            ) : (
                                exams.map(exam => (
                                    <div key={exam.id} className="bg-estuda-bg p-4 rounded-2xl border border-white/5 relative group">
                                        <div className="flex items-start gap-3">
                                            <div className="size-10 rounded-xl bg-estuda-primary/10 flex flex-col items-center justify-center text-estuda-primary shrink-0 border border-estuda-primary/10">
                                                <span className="text-[8px] font-black uppercase leading-none">{new Date(exam.date + 'T00:00:00').toLocaleDateString('pt-BR', { month: 'short' })}</span>
                                                <span className="text-sm font-black leading-none">{exam.date.split('-')[2]}</span>
                                            </div>
                                            <div className="overflow-hidden">
                                                <h4 className="text-[11px] font-black leading-tight truncate">{exam.title}</h4>
                                                <span className="text-[9px] font-bold opacity-40 uppercase tracking-tighter flex items-center gap-1.5 mt-0.5">
                                                    <Clock size={8} /> {exam.time.substring(0, 5)}
                                                </span>
                                            </div>
                                        </div>
                                        <button 
                                            onClick={async () => {
                                                if (window.confirm('Excluir este agendamento?')) {
                                                    const { error } = await supabase.from('exams').delete().eq('id', exam.id)
                                                    if (!error) fetchExams()
                                                }
                                            }}
                                            className="absolute top-2 right-2 p-1.5 text-red-400 opacity-0 group-hover:opacity-100 transition-all hover:bg-red-500/10 rounded-lg"
                                        >
                                            <Trash2 size={12} />
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>


                {/* Coluna Direita: Chat de Validação */}
                <div className="lg:col-span-8 flex flex-col bg-estuda-surface border border-estuda-primary/10 rounded-[2.5rem] shadow-2xl overflow-hidden min-h-[600px]">
                    <div className="p-6 border-b border-estuda-primary/10 flex items-center justify-between bg-white/[0.02]">
                        <div className="flex items-center gap-3">
                            <Sparkles className="text-estuda-primary" size={20} />
                            <div>
                                <h3 className="text-sm font-bold">Assistente de Curadoria</h3>
                                <p className="text-[10px] opacity-50 font-medium">Valide se o Professor Virtual aprendeu o conteúdo corretamente</p>
                            </div>
                        </div>
                    </div>

                    <div className="px-6 py-4 bg-estuda-bg/20 border-b border-estuda-primary/10">
                        <div className="flex items-center justify-between mb-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-estuda-primary">Anotações para os Alunos</label>
                            <button 
                                onClick={handleUpdateNote}
                                disabled={savingNote || !selectedSubject}
                                className="text-[9px] font-black uppercase bg-estuda-primary/10 text-estuda-primary px-3 py-1 rounded-lg hover:bg-estuda-primary/20 disabled:opacity-30 transition-all"
                            >
                                {savingNote ? 'Salvando...' : 'Salvar Alterações'}
                            </button>
                        </div>
                        <textarea
                            value={professorNote}
                            onChange={e => setProfessorNote(e.target.value)}
                            placeholder="Anote aqui dicas, pontos da prova ou avisos importantes para sua turma..."
                            className="w-full bg-estuda-bg/50 border border-estuda-primary/5 rounded-xl p-3 text-xs font-medium focus:outline-none focus:border-estuda-primary/30 transition-colors placeholder:text-white/10 text-white/80 min-h-[80px] resize-none"
                        />
                    </div>

                    <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar bg-estuda-bg/10">
                        {messages.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-center p-12 opacity-30">
                                <MessageSquare size={48} className="mb-4" />
                                <h4 className="text-lg font-bold mb-2">Inicie a Validação</h4>
                                <p className="text-xs max-w-xs font-medium">Pergunte coisas como \"Faça um resumo dos pontos principais\" ou \"Crie 3 perguntas com base neste PDF\" para testar o conhecimento da IA.</p>
                            </div>
                        ) : (
                            messages.map((msg, i) => (
                                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}>
                                    <div className={`p-4 rounded-2xl max-w-[85%] text-sm leading-relaxed shadow-lg ${
                                        msg.role === 'user' 
                                        ? 'bg-estuda-primary text-white ml-12 rounded-tr-none' 
                                        : 'bg-estuda-surface border border-estuda-primary/10 mr-12 rounded-tl-none'
                                    }`}>
                                        {msg.content}
                                    </div>
                                </div>
                            ))
                        )}
                        {loading && (
                            <div className="flex justify-start animate-pulse">
                                <div className="bg-estuda-surface border border-estuda-primary/10 p-4 rounded-2xl rounded-tl-none flex items-center gap-3">
                                    <Loader2 className="animate-spin text-estuda-primary" size={16} />
                                    <span className="text-[10px] font-black uppercase tracking-widest opacity-40">Pensando...</span>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="p-6 bg-estuda-bg/50 border-t border-estuda-primary/10">
                        <div className="flex gap-3">
                            <div className="flex-1 relative">
                                <input 
                                    type="text" 
                                    placeholder="Pergunte ao Professor Virtual sobre o conteúdo..."
                                    value={query}
                                    onChange={e => setQuery(e.target.value)}
                                    onKeyPress={e => e.key === 'Enter' && handleAskIA()}
                                    className="w-full bg-estuda-bg border border-estuda-primary/10 rounded-2xl py-4 px-6 text-sm focus:outline-none focus:ring-2 focus:ring-estuda-primary/20 transition-all font-medium placeholder:text-white/20"
                                />
                                <div className="absolute right-3 top-1/2 -translate-y-1/2 p-2 bg-estuda-primary/10 rounded-xl text-estuda-primary">
                                    <Layers size={18} />
                                </div>
                            </div>
                            <button 
                                onClick={handleAskIA}
                                disabled={loading || !query.trim()}
                                className="bg-estuda-primary text-white size-14 rounded-2xl flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-xl shadow-estuda-primary/30 disabled:opacity-50"
                            >
                                <ChevronRight size={24} />
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Modal de Agendamento de Prova */}
            {showExamForm && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={() => setShowExamForm(false)}></div>
                    <div className="bg-estuda-surface border border-estuda-primary/20 p-8 rounded-[2.5rem] shadow-2xl w-full max-w-md relative z-10 animate-fade-in flex flex-col overflow-y-auto" style={{ maxHeight: '90vh' }}>
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-2xl font-black text-white flex items-center gap-2">
                                <FileQuestion size={24} className="text-estuda-primary" /> Nova Prova
                            </h3>
                            <button onClick={() => setShowExamForm(false)} className="p-2 rounded-xl hover:bg-white/5 opacity-50 hover:opacity-100 transition-all font-bold text-sm text-white">✕</button>
                        </div>

                        <form onSubmit={handleAddExam} className="flex flex-col gap-4">
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-widest opacity-50 mb-1.5 pl-1">Título da Prova *</label>
                                <input
                                    required
                                    type="text"
                                    placeholder="Ex: P1 — Prova do 1º Bimestre"
                                    value={newExam.title}
                                    onChange={e => setNewExam({ ...newExam, title: e.target.value })}
                                    className="w-full bg-estuda-bg border border-estuda-primary/10 rounded-2xl px-4 py-3 text-sm font-bold focus:outline-none focus:border-estuda-primary/50 transition-colors placeholder:text-white/20 text-white"
                                />
                            </div>

                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-widest opacity-50 mb-1.5 pl-1">Nome da Matéria *</label>
                                <input
                                    required
                                    type="text"
                                    placeholder="Ex: Direito do Trabalho"
                                    value={newExam.subject}
                                    onChange={e => setNewExam({ ...newExam, subject: e.target.value })}
                                    className="w-full bg-estuda-bg border border-estuda-primary/10 rounded-2xl px-4 py-3 text-sm font-bold focus:outline-none focus:border-estuda-primary/50 transition-colors placeholder:text-white/20 text-white"
                                />
                            </div>

                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-widest opacity-50 mb-1.5 pl-1">O que vai cair na prova</label>
                                <textarea
                                    placeholder="Ex: Contratos de Trabalho (arts. 2–11 CLT), Caps. 1 a 4..."
                                    value={newExam.subtitle}
                                    onChange={e => setNewExam({ ...newExam, subtitle: e.target.value })}
                                    className="w-full bg-estuda-bg border border-estuda-primary/10 rounded-2xl px-4 py-3 text-sm font-bold focus:outline-none focus:border-estuda-primary/50 transition-colors placeholder:text-white/20 text-white min-h-[100px] resize-y"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest opacity-50 mb-1.5 pl-1">Data *</label>
                                    <input
                                        required
                                        type="date"
                                        value={newExam.date}
                                        onChange={e => setNewExam({ ...newExam, date: e.target.value })}
                                        className="w-full bg-estuda-bg border border-estuda-primary/10 rounded-2xl px-4 py-3 text-sm font-bold focus:outline-none focus:border-estuda-primary/50 transition-colors text-white [color-scheme:dark]"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest opacity-50 mb-1.5 pl-1">Hora *</label>
                                    <input
                                        required
                                        type="time"
                                        value={newExam.time}
                                        onChange={e => setNewExam({ ...newExam, time: e.target.value })}
                                        className="w-full bg-estuda-bg border border-estuda-primary/10 rounded-2xl px-4 py-3 text-sm font-bold focus:outline-none focus:border-estuda-primary/50 transition-colors text-white [color-scheme:dark]"
                                    />
                                </div>
                            </div>

                            <button
                                disabled={loading}
                                type="submit"
                                className="w-full bg-estuda-primary text-white py-4 rounded-2xl font-black text-sm mt-4 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-lg shadow-estuda-primary/20 disabled:opacity-50"
                            >
                                {loading ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />}
                                Agendar Prova
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}

