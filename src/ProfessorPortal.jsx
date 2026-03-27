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
    Plus,
    Clock,
    Settings,
    Info,
    ShieldCheck,
    ArrowLeft,
    GraduationCap,
    Menu,
    MoreVertical,
    Check,
    X,
    BookOpen,
    Quote
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
    const [onboardingSubjectIds, setOnboardingSubjectIds] = useState([])
    const [onboardingAvatar, setOnboardingAvatar] = useState(null)
    const [professorInfo, setProfessorInfo] = useState({ name: '', avatar: null })

    // Estado para Configurações e Perfil
    const [showSettingsPopover, setShowSettingsPopover] = useState(false)
    const [showEditProfileModal, setShowEditProfileModal] = useState(false)
    const [showAboutModal, setShowAboutModal] = useState(false)
    const [showTermsModal, setShowTermsModal] = useState(false)
    const [editProfileName, setEditProfileName] = useState('')
    const [editProfileAvatar, setEditProfileAvatar] = useState(null)
    const [editProfileSubjectIds, setEditProfileSubjectIds] = useState([])

    // Estado para Gestão de Provas e Anotações
    const [showExamForm, setShowExamForm] = useState(false)
    const [newExam, setNewExam] = useState({ title: '', subject: '', subtitle: '', date: '', time: '' })
    
    const [exams, setExams] = useState([])
    
    // Estados do Chat Unificado (Igual ao App.jsx)
    const [showDocSelect, setShowDocSelect] = useState(false)
    const [selectedDocId, setSelectedDocId] = useState('') // '' significa "Todos"
    const [pendingAction, setPendingAction] = useState(null)
    const [quizMode, setQuizMode] = useState(false)
    const [quizQuestions, setQuizQuestions] = useState([])
    const [quizAnswers, setQuizAnswers] = useState([])
    const [quizResult, setQuizResult] = useState(null)
    const [isThinking, setIsThinking] = useState(false)
    
    // Estado para Anotações do Professor
    const [professorNote, setProfessorNote] = useState('')
    const [savingNote, setSavingNote] = useState(false)


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
            console.log('Fetching professor data for:', session.user.id)
            
            // Buscar as matérias vinculadas ao professor
            const { data: profData, error: profError } = await supabase
                .from('professors')
                .select('subject_id, name, avatar_url, subjects(*)')
                .eq('user_id', session.user.id)

            if (profError) throw profError
            
            if (profData && profData.length > 0) {
                console.log('Professor data found:', profData)
                const subjs = profData.map(p => p.subjects).filter(Boolean)
                console.log('Extracted subjects:', subjs)
                
                // Primeiro atualizamos os dados principais
                setSubjects(subjs)
                if (subjs.length > 0) setSelectedSubject(subjs[0])
                
                setProfessorInfo({
                    name: profData[0].name || session.user.email,
                    avatar: profData[0].avatar_url
                })

                // Inicializar estados de edição
                setEditProfileName(profData[0].name || session.user.email)
                setEditProfileAvatar(profData[0].avatar_url)
                setEditProfileSubjectIds(profData.map(p => p.subject_id))
                
                // SÓ ENTÃO desativamos o onboarding e o loading
                setShowOnboarding(false)
            } else if (isAdmin) {
                // Se for ADM/Super Admin, vamos carregar todas as matérias para ele gerenciar
                console.log('User is Admin/SuperAdmin, bypassing professor onboarding.')
                const { data: allSubjs } = await supabase.from('subjects').select('*')
                if (allSubjs) {
                    setSubjects(allSubjs)
                    if (allSubjs.length > 0) setSelectedSubject(allSubjs[0])
                }
                setProfessorInfo({ name: 'Administrador', avatar: null })
                setShowOnboarding(false)
            } else {
                // Se não tiver dados e não for ADM, inicia onboarding
                console.log('No professor data found, showing onboarding.')
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

    // Funções de Gestão de Perfil
    const handleSaveProfile = async () => {
        if (!editProfileName.trim() || editProfileSubjectIds.length === 0) return
        
        try {
            setLoading(true)
            
            // 1. Deletar associações antigas
            await supabase
                .from('professors')
                .delete()
                .eq('user_id', session.user.id)

            // 2. Inserir novas associações
            const profInserts = editProfileSubjectIds.map(subjId => ({
                user_id: session.user.id,
                name: editProfileName,
                subject_id: subjId,
                avatar_url: editProfileAvatar,
                phone_number: `PROF_${session.user.id.slice(0, 8)}_${subjId}`
            }))

            const { error } = await supabase
                .from('professors')
                .insert(profInserts)
            
            if (error) throw error
            
            await fetchProfessorData()
            setShowEditProfileModal(false)
            alert('Perfil atualizado com sucesso!')
        } catch (err) {
            alert('Erro ao salvar perfil: ' + err.message)
        } finally {
            setLoading(false)
        }
    }

    const handleDeleteAccount = async () => {
        if (!window.confirm('ATENÇÃO: A exclusão é irreversível! Todos os seus dados, matérias vinculadas e documentos serão removidos. Deseja continuar?')) return
        
        try {
            setLoading(true)
            const { error } = await supabase.rpc('delete_user_account', {
                user_id_to_delete: session.user.id
            })
            
            if (error) {
                console.error('Erro ao excluir conta via RPC:', error)
                if (error.message?.includes('could not find the function')) {
                    alert('Erro: A função SQL de exclusão não foi instalada.\nCopie e execute o script SQL fornecido no painel do Supabase.')
                } else {
                    alert('Erro ao excluir conta: ' + error.message)
                }
                return
            }

            alert('Sua conta de professor foi removida com sucesso.')
            await supabase.auth.signOut()
        } catch (err) {
            console.error('Erro fatal ao excluir conta:', err)
            alert('Erro ao excluir conta. Por favor, entre em contato com o suporte.')
        } finally {
            setLoading(false)
        }
    }

    // Lógica Unificada de Ações de IA
    const handleActionClick = (action) => {
        if (!selectedSubject) {
            alert('Selecione uma matéria primeiro.')
            return
        }
        setPendingAction(action)
        setShowDocSelect(true)
    }

    const executePendingAction = async (action, docId) => {
        if (!selectedSubject) return
        
        setIsThinking(true)
        
        try {
            if (action === 'quiz') {
                const { data, error } = await supabase.functions.invoke('generate-quiz', {
                    body: { subjectId: selectedSubject.id, documentId: docId || null, limit: 10 }
                })
                if (error) throw error
                
                const questions = data.questions || []
                if (questions.length > 0) {
                    setQuizQuestions(questions)
                    setQuizAnswers(new Array(questions.length).fill(undefined))
                    setQuizMode(true)
                    setQuizResult(null)
                }
            } else {
                const { data, error } = await supabase.functions.invoke('notebooklm-actions', {
                    body: { action, subjectId: selectedSubject.id, documentId: docId || null }
                })
                if (error) throw error
                
                const newMsg = { 
                    role: 'assistant', 
                    content: data.result, 
                    type: action,
                    source: docId ? documents.find(d => d.id === docId)?.name : 'Todos os Materiais'
                }
                setMessages(prev => [...prev, newMsg])
            }
        } catch (err) {
            console.error('Erro na ação de IA:', err)
            alert('Não foi possível completar a ação. Verifique se o material foi processado.')
        } finally {
            setIsThinking(false)
        }
    }

    const handleQuizAnswer = (questionIdx, optionIdx) => {
        const newAnswers = [...quizAnswers]
        newAnswers[questionIdx] = optionIdx
        setQuizAnswers(newAnswers)
    }

    const finishQuiz = () => {
        let score = 0
        quizQuestions.forEach((q, idx) => {
            if (quizAnswers[idx] === q.answer || q.options[quizAnswers[idx]] === q.answer) {
                score++
            }
        })
        
        const percentage = Math.round((score / quizQuestions.length) * 100)
        setQuizResult({ score, percentage })
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
            const { error: updateErr } = await supabase
                .from('subjects')
                .update({ 
                    professor_notes: professorNote,
                    notes_updated_at: new Date().toISOString()
                })
                .eq('id', selectedSubject.id);
            
            if (updateErr) throw updateErr
            
            setSubjects(prev => prev.map(s => s.id === selectedSubject.id ? { ...s, professor_notes: professorNote } : s))
            setSelectedSubject(prev => ({ ...prev, professor_notes: professorNote }))

            alert('Anotações atualizadas com sucesso!')
        } catch (err) {
            console.error('Erro ao salvar anotação:', err)
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
        if (!onboardingName.trim() || onboardingSubjectIds.length === 0) {
            alert('Por favor, preencha seu nome e escolha as matérias.')
            return
        }

        try {
            setLoading(true)
            console.log('Submitting onboarding for:', onboardingName)
            
            // Inserir uma linha para cada matéria selecionada
            const profInserts = onboardingSubjectIds.map(subjId => ({
                user_id: session.user.id,
                name: onboardingName,
                subject_id: subjId,
                avatar_url: onboardingAvatar,
                phone_number: `PROF_${session.user.id.slice(0, 8)}_${subjId}`
            }))

            const { error } = await supabase
                .from('professors')
                .insert(profInserts)
            
            if (error) throw error
            
            console.log('Onboarding data inserted successfully. Fetching data...')
            // ESSENCIAL: Aguarda o fetch terminar antes de encerrar este fluxo de loading
            await fetchProfessorData()
            
        } catch (err) {
            console.error('Erro no onboarding:', err)
            alert('Erro ao salvar dados: ' + err.message)
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
            
            // Disparar o processamento em background
            supabase.functions.invoke('process-document', {
                body: { documentId: docData.id }
            }).catch(e => console.error('Erro ao chamar processamento:', e))

            alert('Material enviado com sucesso! O processamento iniciará em breve.')
            // Pequeno timeout para garantir que o banco processou antes do fetch
            setTimeout(() => fetchDocuments(), 500)
        } catch (error) {
            console.error('Erro no upload:', error)
            alert('Erro no upload: ' + error.message)
        } finally {
            setUploading(false)
        }
    }

    const handleDeleteDocument = async (doc) => {
        if (!window.confirm(`Tem certeza que deseja excluir o documento "${doc.name}"?`)) return
        
        try {
            setLoading(true)
            // 1. Deletar do Storage
            const { error: storageError } = await supabase.storage
                .from('documents')
                .remove([doc.file_path])

            if (storageError) console.warn('Erro ao remover do storage (pode já não existir):', storageError)

            // 2. Deletar do Banco de Dados
            const { error: dbError } = await supabase
                .from('documents')
                .delete()
                .eq('id', doc.id)

            if (dbError) throw dbError

            alert('Documento removido com sucesso!')
            // Pequeno timeout e refetch agressivo
            setTimeout(() => fetchDocuments(), 500)
        } catch (err) {
            alert('Erro ao excluir documento: ' + err.message)
        } finally {
            setLoading(false)
        }
    }

    const handleAskIA = async (customQuery = null) => {
        // Se customQuery for um texto, usamos ele. Se for objeto (evento), usamos query.
        const textToAsk = (typeof customQuery === 'string') ? customQuery : query;
        if (!textToAsk || !textToAsk.trim() || !selectedSubject) return;

        const userMessage = { role: 'user', content: textToAsk };
        setMessages(prev => [...prev, userMessage]);
        setQuery('');
        setIsThinking(true);

        try {
            // Reforço as instruções de RAG iguais às do aluno
            const ragQuery = `IMPORTANTE: RESPONDA APENAS COM BASE NOS MATERIAIS FORNECIDOS PELO PROFESSOR.
            Responda de forma clara e profissional:
            - Use listas (•) para múltiplos pontos
            - Use negrito (**termo**) para conceitos chave
            - Use espaçamento duplo entre parágrafos
            - Se a informação não estiver nos materiais, diga que não encontrou no conteúdo da disciplina.
            
            Pergunta do Professor (Validação): ${textToAsk}`;

            const { data, error } = await supabase.functions.invoke('ask-ai', {
                body: {
                    query: ragQuery,
                    subjectId: selectedSubject?.id,
                    messages: messages.slice(-5)
                }
            });

            if (error) throw error;

            const aiMessage = { 
                role: 'assistant', 
                content: data.answer, 
                source: data.sources && data.sources.length > 0 ? data.sources[0] : null,
                type: 'chat'
            };
            setMessages(prev => [...prev, aiMessage]);
        } catch (error) {
            console.error('Erro ao perguntar:', error);
            alert('Erro na comunicação com a IA: ' + error.message);
        } finally {
            setIsThinking(false);
        }
    };

    if (loading && !showOnboarding) {
        return (
            <div className="min-h-screen bg-estuda-bg flex flex-col items-center justify-center p-6 text-center">
                <div className="relative mb-8">
                    <div className="absolute inset-0 bg-estuda-primary/20 blur-2xl rounded-full animate-pulse"></div>
                    <Loader2 className="animate-spin text-estuda-primary relative z-10" size={64} />
                </div>
                <h2 className="text-xl font-black text-white mb-2 animate-pulse">Quase lá!</h2>
                <p className="text-white/30 font-bold uppercase tracking-[0.2em] text-[10px]">Configurando o Portal do Professor...</p>
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
                            <label className="block text-[10px] font-black uppercase tracking-widest opacity-50 mb-2 pl-1">Matérias que leciona (Selecione uma ou mais)</label>
                            <div className="grid grid-cols-1 gap-2 max-h-[150px] overflow-y-auto pr-2 custom-scrollbar bg-estuda-bg border border-estuda-primary/10 rounded-2xl p-3">
                                {allAvailableSubjects.map(s => (
                                    <label key={s.id} className="flex items-center gap-3 p-2 rounded-xl hover:bg-white/5 cursor-pointer transition-colors group">
                                        <div className={`size-5 rounded-md border-2 flex items-center justify-center transition-all ${onboardingSubjectIds.includes(s.id) ? 'bg-estuda-primary border-estuda-primary' : 'border-estuda-primary/20 group-hover:border-estuda-primary/50'}`}>
                                            {onboardingSubjectIds.includes(s.id) && <CheckCircle size={12} className="text-white" />}
                                        </div>
                                        <input 
                                            type="checkbox" 
                                            className="hidden" 
                                            checked={onboardingSubjectIds.includes(s.id)}
                                            onChange={() => {
                                                setOnboardingSubjectIds(prev => 
                                                    prev.includes(s.id) 
                                                    ? prev.filter(id => id !== s.id) 
                                                    : [...prev, s.id]
                                                )
                                            }}
                                        />
                                        <span className="text-xs font-bold">{s.name}</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        <button 
                            type="submit"
                            disabled={loading || !onboardingName.trim() || onboardingSubjectIds.length === 0}
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
            <div className="fixed top-6 left-6 z-50 animate-fade-in">
                <div className="flex items-center gap-3">
                    <div className="size-11 flex items-center justify-center bg-white rounded-xl shadow-lg border border-white/10 overflow-hidden">
                        <img 
                            src="https://i.supaimg.com/ab10c538-a9f0-4a7a-9c0d-5a65ded30e00/a022583e-d218-4eac-b41f-63e9255e4177.jpg" 
                            alt="Estuda Aí Logo" 
                            className="w-full h-full object-cover"
                        />
                    </div>
                </div>
            </div>
            {/* Header Portal */}
            <header className="flex items-center justify-between p-6 sm:p-8 bg-black/20 backdrop-blur-xl border-b border-white/5 sticky top-0 z-40">
                <div className="flex items-center gap-4 sm:gap-6">
                    <div className="relative group">
                        {professorInfo.avatar ? (
                            <img src={professorInfo.avatar} className="size-12 sm:size-16 rounded-[1.5rem] border-2 border-estuda-primary/20 object-cover shadow-2xl" alt="avatar" />
                        ) : (
                            <div className="size-12 sm:size-16 rounded-[1.5rem] bg-estuda-primary/10 flex items-center justify-center border-2 border-estuda-primary/20">
                                <GraduationCap size={28} className="text-estuda-primary" />
                            </div>
                        )}
                        <div className="absolute -bottom-1 -right-1 bg-green-500 size-4 rounded-full border-2 border-estuda-bg shadow-lg"></div>
                    </div>
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-estuda-primary opacity-60 mb-1">Acesso Educador</p>
                        <h1 className="text-lg sm:text-2xl font-black text-white leading-tight">Olá, Prof. {professorInfo.name.split(' ')[0]}</h1>
                        <p className="text-[10px] font-bold text-white/40 uppercase tracking-tighter mt-1 flex items-center gap-2">
                            <Book size={10} className="text-estuda-primary" />
                            {subjects.map(s => s.name).join(' • ')}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className="relative">
                        <button 
                            onClick={() => setShowSettingsPopover(!showSettingsPopover)}
                            className="size-10 sm:size-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-white/40 hover:text-estuda-primary hover:bg-estuda-primary/10 transition-all hover:scale-110 active:scale-95 group"
                        >
                            <Settings size={20} className={showSettingsPopover ? 'rotate-90' : 'group-hover:rotate-45'} />
                        </button>

                        {/* Popover de Configurações */}
                        {showSettingsPopover && (
                            <>
                                <div className="fixed inset-0 z-40" onClick={() => setShowSettingsPopover(false)}></div>
                                <div className="absolute right-0 mt-3 w-64 bg-estuda-surface border border-white/10 rounded-3xl shadow-2xl p-2 z-50 animate-fade-in">
                                    <button 
                                        onClick={() => { setShowEditProfileModal(true); setShowSettingsPopover(false); }}
                                        className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-white/5 transition-all text-left"
                                    >
                                        <div className="size-8 rounded-lg bg-estuda-primary/10 flex items-center justify-center text-estuda-primary">
                                            <User size={16} />
                                        </div>
                                        <div>
                                            <p className="text-xs font-black text-white">Editar Perfil</p>
                                            <p className="text-[9px] opacity-40 uppercase tracking-widest font-bold">Nome, Foto e Matérias</p>
                                        </div>
                                    </button>

                                    {isAdmin && (
                                        <button 
                                            onClick={() => { setViewingProfessorPortal(false); setShowSettingsPopover(false); }}
                                            className="w-full flex items-center gap-3 p-3 rounded-2xl bg-yellow-400/5 hover:bg-yellow-400/10 border border-yellow-400/10 transition-all text-left group my-1"
                                        >
                                            <div className="size-8 rounded-lg bg-yellow-400/10 flex items-center justify-center text-yellow-400 group-hover:scale-110 transition-transform">
                                                <ArrowLeft size={16} />
                                            </div>
                                            <div>
                                                <p className="text-xs font-black text-white">Voltar ao App</p>
                                                <p className="text-[9px] opacity-40 uppercase tracking-widest font-bold">Visão de Estudante</p>
                                            </div>
                                        </button>
                                    )}

                                    <div className="h-px bg-white/5 my-2"></div>

                                    <button 
                                        onClick={() => { setShowAboutModal(true); setShowSettingsPopover(false); }}
                                        className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-white/5 transition-all text-left"
                                    >
                                        <div className="size-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-500">
                                            <Info size={16} />
                                        </div>
                                        <span className="text-xs font-bold text-white/80">Sobre o Desenvolvedor</span>
                                    </button>

                                    <button 
                                        onClick={() => { setShowTermsModal(true); setShowSettingsPopover(false); }}
                                        className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-white/5 transition-all text-left"
                                    >
                                        <div className="size-8 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-500">
                                            <ShieldCheck size={16} />
                                        </div>
                                        <span className="text-xs font-bold text-white/80">Termos de Uso</span>
                                    </button>

                                    <div className="h-px bg-white/5 my-2"></div>

                                    <button 
                                        onClick={() => { handleDeleteAccount(); setShowSettingsPopover(false); }}
                                        className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-red-500/5 hover:text-red-500 transition-all text-left group"
                                    >
                                        <div className="size-8 rounded-lg bg-red-500/10 flex items-center justify-center text-red-500">
                                            <Trash2 size={16} />
                                        </div>
                                        <span className="text-xs font-bold opacity-80 group-hover:opacity-100">Excluir Conta Permanente</span>
                                    </button>
                                </div>
                            </>
                        )}
                    </div>

                    <button 
                        onClick={async () => await supabase.auth.signOut()}
                        className="size-10 sm:size-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-white/40 hover:text-red-500 hover:bg-red-500/10 transition-all hover:scale-110 active:scale-95"
                    >
                        <LogOut size={20} />
                    </button>
                </div>
            </header>
            
            <main className="flex-1 mt-8 flex flex-col gap-8 w-full max-w-7xl mx-auto">
                {/* DASHBOARD DOCENTE (Estilo Lovable / Repositório Novo) */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 w-full animate-fade-in">
                    <button 
                        onClick={() => setShowExamForm(true)} 
                        className="bg-estuda-surface border-none shadow-xl shadow-black/20 hover:scale-[1.02] text-left p-6 rounded-[2rem] transition-all flex flex-col items-center justify-center text-center gap-3 relative overflow-hidden group"
                    >
                        <div className="absolute inset-0 bg-estuda-primary/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        <div className="bg-estuda-primary/10 p-4 rounded-2xl text-estuda-primary group-hover:scale-110 transition-transform relative z-10">
                            <FileQuestion size={32} />
                        </div>
                        <div className="relative z-10">
                            <h3 className="font-bold text-sm text-white">Agendar Provas</h3>
                            <p className="text-[10px] text-white/40 uppercase font-black tracking-widest mt-1">Reflete para alunos</p>
                        </div>
                    </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 w-full">
                    {/* Coluna Esquerda: Documentos e Notas */}
                    <div className="lg:col-span-4 flex flex-col gap-6">
                    {/* Lista de Matérias Selecionável (Estilo Compacto) */}
                    <div className="bg-estuda-surface border border-estuda-primary/10 rounded-[2.5rem] p-6 shadow-lg">
                        <select 
                            value={selectedSubject?.id || ''} 
                            onChange={(e) => {
                                const subj = subjects.find(s => s.id === e.target.value)
                                if (subj) setSelectedSubject(subj)
                            }}
                            className="w-full bg-estuda-bg border border-estuda-primary/20 rounded-2xl p-4 text-sm font-black text-white focus:outline-none focus:ring-2 focus:ring-estuda-primary/30 transition-all appearance-none cursor-pointer mb-4"
                        >
                            {subjects.map(s => (
                                <option key={s.id} value={s.id}>{s.icon_name} {s.name}</option>
                            ))}
                        </select>

                        <div className="flex flex-col gap-4">
                            <div className="flex items-center justify-between px-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-estuda-primary">Anotações para a Turma</label>
                                <button 
                                    onClick={handleUpdateNote}
                                    disabled={savingNote || !selectedSubject}
                                    className="text-[9px] font-black uppercase bg-estuda-primary/10 text-estuda-primary px-3 py-1.5 rounded-xl hover:bg-estuda-primary/20 transition-all disabled:opacity-30"
                                >
                                    {savingNote ? 'Salvando...' : 'Salvar'}
                                </button>
                            </div>
                            <textarea
                                value={professorNote}
                                onChange={e => setProfessorNote(e.target.value)}
                                placeholder="Dicas e avisos importantes para os alunos..."
                                className="w-full bg-estuda-bg/50 border border-estuda-primary/5 rounded-[1.5rem] p-4 text-xs font-medium focus:outline-none focus:border-estuda-primary/30 transition-all placeholder:text-white/10 text-white/80 min-h-[120px] resize-none"
                            />
                        </div>
                    </div>

                    {/* Materiais e Upload */}
                    <div className="bg-estuda-surface border border-estuda-primary/10 rounded-[2.5rem] p-6 shadow-lg">
                        <h3 className="text-sm font-black uppercase tracking-widest opacity-50 mb-4 pl-1">Materiais de Estudo</h3>
                        <label className="flex flex-col items-center justify-center p-8 rounded-[2rem] border-2 border-dashed border-estuda-primary/20 bg-estuda-bg hover:bg-estuda-primary/5 hover:border-estuda-primary/50 transition-all cursor-pointer text-center group mb-6">
                            <input type="file" className="hidden" accept=".pdf" onChange={handleFileUpload} disabled={uploading} />
                            {uploading ? (
                                <Loader2 className="animate-spin text-estuda-primary mb-3" size={32} />
                            ) : (
                                <Upload className="text-estuda-primary/40 group-hover:text-estuda-primary mb-3 group-hover:scale-110 transition-all" size={32} />
                            )}
                            <span className="font-bold text-xs">Clique para subir PDF</span>
                            <span className="text-[10px] opacity-40 mt-1 uppercase font-bold tracking-tighter">Máximo 10MB</span>
                        </label>

                        <div className="flex flex-col gap-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                            {documents.map(doc => (
                                <div key={doc.id} className="flex items-center justify-between bg-estuda-bg p-3 rounded-2xl border border-white/5 group">
                                    <div className="flex items-center gap-3 overflow-hidden">
                                        <FileText size={16} className="text-estuda-primary shrink-0" />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs font-bold text-white truncate">{doc.name}</p>
                                            <p className="text-[9px] opacity-40 font-bold uppercase tracking-widest">
                                                {doc.status === 'ready' ? 'Processado' : 'Processando IA...'}
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleDeleteDocument(doc)}
                                        className="p-2 text-red-500/40 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            ))}
                            {documents.length === 0 && (
                                <p className="text-[10px] text-center opacity-30 italic py-4">Nenhum arquivo nesta matéria</p>
                            )}
                        </div>
                    </div>

                    {/* Provas Agendadas */}
                    <div className="bg-estuda-surface border border-estuda-primary/10 rounded-[2.5rem] p-6 shadow-lg">
                        <h3 className="text-sm font-black uppercase tracking-widest opacity-50 mb-4 pl-1">Provas Agendadas</h3>
                        <div className="flex flex-col gap-4 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                            {exams.length === 0 ? (
                                <p className="text-[10px] text-center opacity-30 italic py-4">Nenhuma prova agendada</p>
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
                    <div className="p-4 sm:p-6 border-b border-estuda-primary/10 flex flex-col sm:flex-row items-center justify-between gap-4 bg-white/[0.02]">
                        <div className="flex items-center gap-3 w-full sm:w-auto">
                            <div className="p-2 bg-estuda-primary/10 rounded-xl text-estuda-primary shrink-0">
                                {quizMode ? <FileQuestion size={20} /> : <Sparkles size={20} />}
                            </div>
                            <div className="min-w-0">
                                <h3 className="text-sm font-black text-white truncate">{selectedSubject?.name || 'Selecione uma Matéria'}</h3>
                                <p className="text-[10px] opacity-50 font-bold uppercase tracking-widest truncate">
                                    {quizMode ? 'Quiz em Execução' : 'Validação do Professor Virtual'}
                                </p>
                            </div>
                        </div>

                        {/* Botões de Ação de IA Unificados */}
                        {!quizMode && (
                            <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto pb-2 sm:pb-0 scrollbar-hide">
                                <button
                                    onClick={() => handleActionClick('summary')}
                                    className="bg-estuda-primary text-white px-3 py-2 rounded-xl font-black flex items-center gap-2 hover:scale-105 active:scale-95 transition-all shadow-lg text-[10px] uppercase tracking-tighter shrink-0"
                                >
                                    <Sparkles size={14} /> Resumo
                                </button>
                                <button
                                    onClick={() => handleActionClick('guide')}
                                    className="bg-blue-600 text-white px-3 py-2 rounded-xl font-black flex items-center gap-2 hover:scale-105 active:scale-95 transition-all shadow-lg text-[10px] uppercase tracking-tighter shrink-0"
                                >
                                    <BookOpen size={14} /> Guia
                                </button>
                                <button
                                    onClick={() => handleActionClick('citations')}
                                    className="bg-emerald-600 text-white px-3 py-2 rounded-xl font-black flex items-center gap-2 hover:scale-105 active:scale-95 transition-all shadow-lg text-[10px] uppercase tracking-tighter shrink-0"
                                >
                                    <Quote size={14} /> Citações
                                </button>
                                <button
                                    onClick={() => handleActionClick('quiz')}
                                    className="bg-estuda-primary text-white px-3 py-2 rounded-xl font-black flex items-center gap-2 hover:scale-105 active:scale-95 transition-all shadow-lg text-[10px] uppercase tracking-tighter shrink-0"
                                >
                                    <FileQuestion size={14} /> Quiz (10)
                                </button>
                            </div>
                        )}

                        {quizMode && (
                            <button 
                                onClick={() => { setQuizMode(false); setQuizResult(null); }}
                                className="text-[10px] font-black uppercase text-white/40 hover:text-white transition-colors flex items-center gap-2"
                            >
                                <ChevronLeft size={14} /> Cancelar Quiz
                            </button>
                        )}
                    </div>

                    <div className="flex-1 overflow-hidden flex flex-col relative">
                        {quizMode ? (
                            /* Layout do Quiz Interativo */
                            <div className="flex-1 overflow-hidden flex flex-col">
                                {!quizResult ? (
                                    <>
                                        {/* Status Fixo do Quiz */}
                                        <div className="bg-estuda-bg/50 p-4 border-b border-estuda-primary/10 flex justify-between items-center shrink-0">
                                            <div className="flex flex-col gap-1">
                                                <span className="text-[10px] font-black uppercase opacity-60">Status do Quiz de Validação</span>
                                                <span className="text-sm font-bold">{quizAnswers.filter(a => a !== undefined).length} de 10 respondidas</span>
                                            </div>
                                            <button
                                                onClick={finishQuiz}
                                                disabled={quizAnswers.filter(a => a !== undefined).length < 10}
                                                className={`px-6 py-2 rounded-xl font-bold transition-all ${quizAnswers.filter(a => a !== undefined).length === 10 ? 'bg-estuda-primary text-white' : 'bg-estuda-primary/20 text-estuda-primary/40 cursor-not-allowed'}`}
                                            >
                                                FINALIZAR
                                            </button>
                                        </div>

                                        {/* Lista de Questões com Scroll */}
                                        <div className="flex-1 overflow-y-auto p-6 sm:p-10 flex flex-col gap-8 custom-scrollbar bg-estuda-bg/30">
                                            {quizQuestions.map((q, qIdx) => (
                                                <div key={q.id || qIdx} className="bg-estuda-surface p-6 sm:p-8 rounded-[2rem] border border-estuda-primary/10 animate-fade-in shadow-xl">
                                                    <h3 className="text-lg font-bold mb-6 leading-relaxed">
                                                        <span className="text-estuda-primary mr-2">#{qIdx + 1}</span> {q.question}
                                                    </h3>
                                                    <div className="grid grid-cols-1 gap-3">
                                                        {q.options.map((opt, oIdx) => (
                                                            <button
                                                                key={oIdx}
                                                                onClick={() => handleQuizAnswer(qIdx, oIdx)}
                                                                className={`p-4 rounded-2xl border transition-all text-left font-bold flex items-center gap-4 ${quizAnswers[qIdx] === oIdx ? 'bg-estuda-primary text-white border-estuda-primary shadow-lg' : 'border-estuda-primary/10 bg-estuda-bg/50 hover:bg-estuda-primary/10 text-white/70'}`}
                                                            >
                                                                <span className={`size-8 rounded-lg flex items-center justify-center text-xs font-black shrink-0 ${quizAnswers[qIdx] === oIdx ? 'bg-white/20' : 'bg-estuda-primary/10 text-estuda-primary'}`}>
                                                                    {['A', 'B', 'C', 'D'][oIdx]}
                                                                </span>
                                                                <span className="text-sm">{opt}</span>
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            ))}
                                            <div className="py-12 text-center">
                                                <button
                                                    onClick={finishQuiz}
                                                    disabled={quizAnswers.filter(a => a !== undefined).length < 10}
                                                    className={`px-12 py-4 rounded-2xl font-black text-lg transition-all shadow-xl ${quizAnswers.filter(a => a !== undefined).length === 10 ? 'bg-estuda-primary text-white hover:scale-105 active:scale-95' : 'bg-estuda-primary/20 text-estuda-primary/40 cursor-not-allowed'}`}
                                                >
                                                    ENVIAR PARA VALIDAÇÃO
                                                </button>
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                    /* Resultado do Quiz */
                                    <div className="flex-1 flex flex-col p-8 animate-fade-in text-center overflow-y-auto bg-estuda-bg/20">
                                        <div className="flex flex-col items-center justify-center text-center">
                                            <div className="size-24 rounded-[2rem] bg-estuda-primary text-white flex items-center justify-center mb-6 shadow-2xl shrink-0">
                                                <GraduationCap size={48} />
                                            </div>
                                            <h3 className="text-3xl font-black mb-2">Quiz Finalizado!</h3>
                                            <p className="text-estuda-primary font-bold mb-8 opacity-60 uppercase tracking-widest text-[10px]">Ótimo desempenho em {selectedSubject?.name}</p>

                                            <div className="flex justify-center gap-8 mb-10 w-full max-w-sm">
                                                <div className="flex-1 bg-estuda-bg/50 p-6 rounded-3xl border border-estuda-primary/10 shadow-xl">
                                                    <p className="text-4xl font-black text-estuda-primary">{quizResult.score}</p>
                                                    <p className="text-[10px] uppercase font-black opacity-40 mt-1">Acertos</p>
                                                </div>
                                                <div className="flex-1 bg-estuda-bg/50 p-6 rounded-3xl border border-estuda-primary/10 shadow-xl">
                                                    <p className="text-4xl font-black text-estuda-primary">{quizResult.percentage}%</p>
                                                    <p className="text-[10px] uppercase font-black opacity-40 mt-1">Aproveitamento</p>
                                                </div>
                                            </div>

                                            <div className="flex justify-center pt-4 border-t border-estuda-primary/10">
                                                <button
                                                    onClick={() => { setQuizMode(false); setQuizResult(null); }}
                                                    className="px-8 py-3 rounded-2xl font-black text-sm border-2 border-estuda-primary/20 hover:bg-estuda-primary/10 transition-colors"
                                                >
                                                    Voltar ao Chat
                                                </button>
                                            </div>
                                        </div>

                                        {/* Correção e Feedback */}
                                        <div className="mt-8 pt-4 text-left">
                                            <h4 className="text-xl font-black text-white mb-6 flex items-center gap-2">
                                                <MessageSquare size={20} className="text-estuda-primary" /> Correção e Feedback
                                            </h4>
                                            <div className="flex flex-col gap-6">
                                                {quizQuestions.map((q, qIdx) => {
                                                    const userAnswer = quizAnswers[qIdx]
                                                    const isCorrect = userAnswer === q.answer || q.options[userAnswer] === q.answer
                                                    
                                                    return (
                                                        <div key={qIdx} className={`p-6 rounded-3xl border ${isCorrect ? 'bg-green-500/5 border-green-500/10' : 'bg-red-500/5 border-red-500/10'}`}>
                                                            <p className="font-bold text-sm mb-4 text-white leading-relaxed">
                                                                <span className={`inline-block size-6 rounded-lg text-center leading-6 text-[10px] font-black mr-3 ${isCorrect ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-500'}`}>
                                                                    {qIdx + 1}
                                                                </span>
                                                                {q.question}
                                                            </p>
                                                            <div className="text-xs space-y-2 mt-2">
                                                                <div className="flex items-center gap-2 text-white/50">
                                                                    <span className="font-bold w-16 shrink-0">Sua resp:</span> 
                                                                    <span className={isCorrect ? 'text-green-400 font-bold' : 'text-red-400 line-through'}>{q.options[userAnswer] || "Não respondeu"}</span>
                                                                </div>
                                                                {!isCorrect && (
                                                                    <div className="flex items-center gap-2 text-white/50">
                                                                        <span className="font-bold w-16 shrink-0">Correta:</span>
                                                                        <span className="text-green-400 font-bold">{q.options[q.answer] || q.answer}</span>
                                                                    </div>
                                                                )}
                                                                {q.explanation && (
                                                                    <div className="mt-4 p-4 rounded-xl bg-estuda-surface border border-estuda-primary/20">
                                                                        <div className="flex items-start gap-2">
                                                                            <BookOpen size={16} className="text-estuda-primary shrink-0 mt-0.5" />
                                                                            <div>
                                                                                <p className="text-[10px] font-black uppercase text-estuda-primary mb-1 tracking-widest">Explicação do Professor IA</p>
                                                                                <p className="font-medium text-white/80 leading-relaxed">{q.explanation}</p>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                )}  
                                                            </div>
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            /* Área de Mensagens do Chat — idêntica ao aluno */
                            <div className="flex-1 flex flex-col overflow-hidden">
                                <div className="flex-1 overflow-y-auto p-4 sm:p-6 flex flex-col gap-4 custom-scrollbar bg-estuda-bg/5">
                                    {messages.length === 0 ? (
                                        <div className="flex-1 flex flex-col items-center justify-center text-center p-8 opacity-20">
                                            <MessageSquare size={64} className="mb-4" />
                                            <h3 className="text-xl font-bold">Inicie a Validação</h3>
                                            <p className="text-sm font-medium max-w-xs mx-auto">Use os botões acima para gerar Resumo, Guia, Citações ou Quiz dos materiais de {selectedSubject?.name}.</p>
                                        </div>
                                    ) : (
                                        messages.map((msg, i) => (
                                            <div
                                                key={i}
                                                className={`flex flex-col max-w-[85%] sm:max-w-[70%] ${msg.role === 'user' ? 'self-end items-end' : 'self-start items-start'} animate-fade-in`}
                                            >
                                                <div className={`p-4 sm:p-5 rounded-2xl text-xs sm:text-sm leading-relaxed max-w-full transition-all duration-500 relative whitespace-pre-wrap ${
                                                        msg.role === 'user'
                                                            ? 'bg-estuda-primary text-white font-medium shadow-lg'
                                                            : msg.type === 'summary' 
                                                                ? 'bg-purple-900/20 border-l-4 border-purple-500 text-white/90 shadow-[0_0_20px_rgba(168,85,247,0.1)]'
                                                                : msg.type === 'guide'
                                                                    ? 'bg-blue-900/20 border-l-4 border-blue-500 text-white/90 shadow-[0_0_20px_rgba(59,130,246,0.1)]'
                                                                    : msg.type === 'citations'
                                                                        ? 'bg-emerald-900/20 border-l-4 border-emerald-500 text-white/90 shadow-[0_0_20px_rgba(16,185,129,0.1)]'
                                                                        : 'bg-white/5 text-white/90 border border-white/10'
                                                    }`}>
                                                    {msg.role === 'assistant' && msg.type && msg.type !== 'chat' && (
                                                        <div className="flex items-center gap-2 mb-3 pb-2 border-b border-white/10">
                                                            {msg.type === 'summary' && <><Sparkles size={16} className="text-purple-400" /> <span className="font-bold text-purple-400 uppercase tracking-wider text-[10px]">Resumo Estruturado</span></>}
                                                            {msg.type === 'guide' && <><BookOpen size={16} className="text-blue-400" /> <span className="font-bold text-blue-400 uppercase tracking-wider text-[10px]">Guia de Estudo</span></>}
                                                            {msg.type === 'citations' && <><Quote size={16} className="text-emerald-400" /> <span className="font-bold text-emerald-400 uppercase tracking-wider text-[10px]">Citações Diretas</span></>}
                                                        </div>
                                                    )}
                                                    <div className="whitespace-pre-wrap prose prose-invert max-w-none prose-sm">
                                                        {msg.content}
                                                    </div>
                                                    {msg.role === 'assistant' && msg.source && (
                                                        <div className="mt-3 flex flex-wrap gap-1.5 pt-3 border-t border-white/10">
                                                            <span className="text-[8px] font-bold bg-black/20 px-1.5 py-0.5 rounded border border-white/5 opacity-60 flex items-center gap-1">
                                                                <FileText size={8} /> {msg.source}
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                                <span className="text-[9px] font-black uppercase opacity-30 mt-1 tracking-widest">{msg.role === 'user' ? 'Você' : 'Professor IA'}</span>
                                            </div>
                                        ))
                                    )}
                                    {isThinking && (
                                        <div className="self-start flex flex-col items-start animate-pulse">
                                            <div className="bg-estuda-surface p-4 rounded-2xl border border-estuda-primary/10 flex items-center gap-2">
                                                <Loader2 size={16} className="animate-spin text-estuda-primary" />
                                                <span className="text-xs font-bold opacity-60">O Professor está elaborando...</span>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Barra de Input */}
                                <div className="p-4 bg-estuda-surface border-t border-estuda-primary/10 shrink-0">
                                    <div className="max-w-4xl mx-auto relative flex items-end gap-3">
                                        <div className="flex-1 relative">
                                            <textarea
                                                rows="1"
                                                disabled={isThinking}
                                                value={query}
                                                onChange={(e) => setQuery(e.target.value)}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter' && !e.shiftKey) {
                                                        e.preventDefault();
                                                        handleAskIA();
                                                    }
                                                }}
                                                placeholder={isThinking ? "Aguarde a IA responder..." : "Sua dúvida sobre a matéria..."}
                                                className="w-full bg-estuda-bg border border-estuda-primary/10 rounded-2xl py-3.5 px-5 text-sm focus:outline-none focus:ring-2 focus:ring-estuda-primary/20 transition-all font-medium placeholder:text-estuda-primary/30 resize-none max-h-32 disabled:opacity-50"
                                            />
                                        </div>
                                        <button
                                            onClick={() => handleAskIA()}
                                            disabled={isThinking || !query.trim()}
                                            className="bg-estuda-primary text-white size-12 rounded-2xl flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-lg shrink-0 disabled:opacity-50 disabled:grayscale"
                                        >
                                            {isThinking ? <Loader2 className="animate-spin" size={20} /> : <ChevronRight size={20} />}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
                </div> {/* Fechamento do grid w-full */}
            </main>

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
            {/* Modal Editar Perfil */}
            {showEditProfileModal && (
                <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-md animate-fade-in" onClick={() => setShowEditProfileModal(false)}></div>
                    <div className="bg-estuda-surface border border-white/10 p-6 sm:p-8 rounded-[2.5rem] shadow-2xl w-full max-w-md relative z-10 animate-fade-in flex flex-col max-h-[90vh] overflow-y-auto custom-scrollbar">
                        <h3 className="text-xl font-black mb-6 flex items-center gap-3">
                            <User size={24} className="text-estuda-primary" /> Editar Perfil Profissional
                        </h3>

                        <div className="flex flex-col gap-5">
                            <div className="flex flex-col items-center gap-4">
                                <label className="cursor-pointer group relative">
                                    {editProfileAvatar ? (
                                        <img src={editProfileAvatar} alt="avatar" className="size-24 rounded-3xl border-4 border-estuda-bg object-cover shadow-xl" />
                                    ) : (
                                        <div className="size-24 rounded-3xl border-4 border-estuda-bg bg-estuda-primary/10 flex items-center justify-center shadow-xl">
                                            <User size={40} className="text-estuda-primary" />
                                        </div>
                                    )}
                                    <div className="absolute -bottom-1 -right-1 bg-estuda-primary rounded-xl p-2 shadow-lg group-hover:scale-110 transition-transform">
                                        <Camera size={14} className="text-white" />
                                    </div>
                                    <input 
                                        type="file" 
                                        accept="image/*" 
                                        className="hidden" 
                                        onChange={async (e) => {
                                            const file = e.target.files[0]
                                            if (!file) return
                                            const reader = new FileReader()
                                            reader.onloadend = () => setEditProfileAvatar(reader.result)
                                            reader.readAsDataURL(file)
                                        }} 
                                    />
                                </label>
                            </div>

                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-widest opacity-50 mb-1.5 pl-1">Nome Completo</label>
                                <input
                                    type="text"
                                    value={editProfileName}
                                    onChange={e => setEditProfileName(e.target.value)}
                                    className="w-full bg-estuda-bg border border-white/10 rounded-2xl px-4 py-3 text-sm font-bold focus:outline-none focus:border-estuda-primary transition-all text-white"
                                />
                            </div>

                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-widest opacity-50 mb-2 pl-1">Matérias que Leciona</label>
                                <div className="grid grid-cols-1 gap-2 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar bg-estuda-bg border border-white/5 rounded-2xl p-3">
                                    {allAvailableSubjects.map(s => (
                                        <label key={s.id} className="flex items-center gap-3 p-2 rounded-xl hover:bg-white/5 cursor-pointer transition-colors group">
                                            <div className={`size-5 rounded-md border-2 flex items-center justify-center transition-all ${editProfileSubjectIds.includes(s.id) ? 'bg-estuda-primary border-estuda-primary' : 'border-white/10 group-hover:border-estuda-primary/50'}`}>
                                                {editProfileSubjectIds.includes(s.id) && <CheckCircle size={12} className="text-white" />}
                                            </div>
                                            <input 
                                                type="checkbox" 
                                                className="hidden" 
                                                checked={editProfileSubjectIds.includes(s.id)}
                                                onChange={() => {
                                                    setEditProfileSubjectIds(prev => 
                                                        prev.includes(s.id) 
                                                        ? prev.filter(id => id !== s.id) 
                                                        : [...prev, s.id]
                                                    )
                                                }}
                                            />
                                            <span className="text-xs font-bold">{s.name}</span>
                                        </label>
                                    ))}
                                </div>
                                <p className="text-[9px] opacity-40 mt-2 font-bold uppercase tracking-tighter">Administrador gerencia as matérias disponíveis no portal principal.</p>
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button 
                                    onClick={() => setShowEditProfileModal(false)}
                                    className="flex-1 py-3 rounded-2xl font-black text-xs border border-white/10 hover:bg-white/5 transition-all"
                                >
                                    CANCELAR
                                </button>
                                <button 
                                    onClick={handleSaveProfile}
                                    disabled={loading}
                                    className="flex-1 py-3 rounded-2xl font-black text-xs bg-estuda-primary text-white shadow-lg hover:scale-105 transition-all"
                                >
                                    {loading ? <Loader2 className="animate-spin mx-auto" size={18} /> : 'SALVAR ALTERAÇÕES'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Sobre o Desenvolvedor */}
            {showAboutModal && (
                <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-md animate-fade-in" onClick={() => setShowAboutModal(false)}></div>
                    <div className="bg-estuda-surface border border-white/10 p-8 rounded-[2.5rem] shadow-2xl w-full max-w-sm relative z-10 animate-fade-in flex flex-col items-center text-center">
                        <div className="size-24 rounded-3xl bg-estuda-primary/10 flex items-center justify-center text-estuda-primary mb-6 shadow-inner ring-1 ring-estuda-primary/20">
                            <Sparkles size={40} />
                        </div>
                        <h3 className="text-2xl font-black text-white mb-2">Estuda Aí</h3>
                        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-estuda-primary mb-6">Versão 2.4.0 • 2026</p>
                        
                        <div className="space-y-4 mb-8">
                            <p className="text-sm font-medium leading-relaxed opacity-60">
                                Desenvolvido com dedicação por <span className="text-white font-black">Arlei Silvério</span> para revolucionar o aprendizado acadêmico.
                            </p>
                            <div className="flex flex-col gap-2">
                                <p className="text-[11px] font-bold text-white/40 italic">"Inovação tecnológica ao serviço da educação jurídica e acadêmica."</p>
                            </div>
                        </div>

                        <button 
                            onClick={() => setShowAboutModal(false)}
                            className="w-full py-4 rounded-2xl font-black text-sm bg-white/5 border border-white/10 hover:bg-white/10 transition-all active:scale-95"
                        >
                            FECHAR
                        </button>
                    </div>
                </div>
            )}

            {/* Modal Termos de Uso (Placeholder) */}
            {showTermsModal && (
                <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-md animate-fade-in" onClick={() => setShowTermsModal(false)}></div>
                    <div className="bg-estuda-surface border border-white/10 p-8 rounded-[2.5rem] shadow-2xl w-full max-w-md relative z-10 animate-fade-in flex flex-col h-[80vh]">
                        <h3 className="text-xl font-black mb-6 flex items-center gap-3">
                            <ShieldCheck size={24} className="text-purple-500" /> Termos & Privacidade
                        </h3>
                        <div className="flex-1 overflow-y-auto pr-4 custom-scrollbar text-xs font-bold leading-loose text-white/40 space-y-4">
                            <p className="text-white/80">1. Compromisso com a Educação</p>
                            <p>O Estuda Aí é uma ferramenta de apoio. Os conteúdos gerados por IA devem ser revisados pelo professor para garantir a precisão acadêmica absoluta.</p>
                            <p className="text-white/80">2. Privacidade dos Dados</p>
                            <p>Seus dados profissionais e documentos são utilizados exclusivamente para o processamento da inteligência artificial dentro da sua conta. Não compartilhamos informações com terceiros.</p>
                            <p className="text-white/80">3. Propriedade Intelectual</p>
                            <p>Todo material carregado permanece de propriedade do professor. O app fornece apenas a camada de inteligência e organização.</p>
                        </div>
                        <button 
                            onClick={() => setShowTermsModal(false)}
                            className="w-full mt-6 py-4 rounded-2xl font-black text-sm bg-estuda-primary text-white shadow-lg active:scale-95 transition-all"
                        >
                            LI E CONCORDO
                        </button>
                    </div>
                </div>
            )}

            {/* Seletor de Material Avançado (Migrado do Aluno) */}
            {showDocSelect && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-estuda-bg/90 backdrop-blur-xl animate-fade-in">
                    <div className="bg-estuda-surface w-full max-w-2xl rounded-[3rem] border border-estuda-primary/20 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="p-8 border-b border-white/5 shrink-0">
                            <div className="flex items-center justify-between mb-2">
                                <h3 className="text-2xl font-black text-white">Onde a IA deve buscar?</h3>
                                <button 
                                    onClick={() => setShowDocSelect(false)}
                                    className="p-3 hover:bg-white/5 rounded-2xl transition-all"
                                >
                                    <X size={24} className="opacity-40" />
                                </button>
                            </div>
                            <p className="text-xs font-bold text-white/40 uppercase tracking-widest">
                                Selecione o material base para {
                                    pendingAction === 'quiz' ? 'o seu Quiz de 10 questões' :
                                    pendingAction === 'summary' ? 'o seu Resumo Estruturado' :
                                    pendingAction === 'guide' ? 'o seu Guia de Estudos' : 'as suas Citações'
                                }
                            </p>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 sm:p-8 custom-scrollbar">
                            <div className="grid gap-4">
                                {/* Opção Todos os Materiais */}
                                <button
                                    onClick={() => setSelectedDocId('')}
                                    className={`group relative flex items-center gap-6 p-6 rounded-[2rem] border transition-all text-left ${
                                        selectedDocId === '' 
                                        ? 'bg-estuda-primary border-estuda-primary shadow-2xl shadow-estuda-primary/20 scale-[1.02]' 
                                        : 'bg-white/5 border-white/5 hover:border-estuda-primary/30 hover:bg-white/[0.08]'
                                    }`}
                                >
                                    <div className={`size-14 rounded-2xl flex items-center justify-center shrink-0 transition-colors ${
                                        selectedDocId === '' ? 'bg-white/20 text-white' : 'bg-estuda-primary/10 text-estuda-primary'
                                    }`}>
                                        <Sparkles size={28} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <h4 className="font-black text-lg">Biblioteca Completa</h4>
                                            {selectedDocId === '' && <Check size={18} className="text-white animate-bounce-in" />}
                                        </div>
                                        <p className={`text-xs font-bold uppercase tracking-tighter ${selectedDocId === '' ? 'text-white/70' : 'text-white/30'}`}>
                                            A IA usará todos os materiais disponíveis desta matéria
                                        </p>
                                    </div>
                                </button>

                                <div className="relative py-4 flex items-center gap-4">
                                    <div className="flex-1 h-px bg-white/5"></div>
                                    <span className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em]">Ou escolha um arquivo</span>
                                    <div className="flex-1 h-px bg-white/5"></div>
                                </div>

                                {/* Lista de Arquivos Individuais */}
                                <div className="grid gap-3">
                                    {documents.map(file => (
                                        <button
                                            key={file.id}
                                            onClick={() => setSelectedDocId(file.id)}
                                            className={`group relative flex items-center gap-5 p-5 rounded-2xl border transition-all text-left ${
                                                selectedDocId === file.id 
                                                ? 'bg-white/10 border-estuda-primary shadow-lg ring-1 ring-estuda-primary' 
                                                : 'bg-white/[0.02] border-white/5 hover:bg-white/[0.05] hover:border-white/10'
                                            }`}
                                        >
                                            <div className={`size-12 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                                                selectedDocId === file.id ? 'bg-estuda-primary text-white' : 'bg-white/5 text-white/20'
                                            }`}>
                                                <FileText size={20} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <h4 className={`font-bold text-sm truncate ${selectedDocId === file.id ? 'text-white' : 'text-white/60'}`}>
                                                        {file.name}
                                                    </h4>
                                                    {selectedDocId === file.id && <Check size={14} className="text-estuda-primary" />}
                                                </div>
                                                <p className="text-[10px] font-black opacity-30 uppercase tracking-tighter mt-0.5">Clique para selecionar</p>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="p-8 border-t border-white/5 bg-white/[0.02] shrink-0">
                            <button
                                onClick={() => {
                                    setShowDocSelect(false);
                                    executePendingAction(pendingAction, selectedDocId);
                                }}
                                className="w-full bg-estuda-primary text-white py-5 rounded-2xl font-black text-lg hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-estuda-primary/20 flex items-center justify-center gap-4 group"
                            >
                                <span>CONFIRMAR E GERAR AGORA</span>
                                <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />
                            </button>
                            <p className="text-center mt-4 text-[10px] font-bold text-white/20 uppercase tracking-widest">
                                O processamento pode levar alguns segundos
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
