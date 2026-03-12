import React, { useState, useEffect } from 'react'
import { supabase } from './lib/supabase'
import Login from './Login'
import GradeHoraria from './GradeHoraria'
import ProfessorPortal from './ProfessorPortal'
import {
    FileText,
    Upload,
    Trash2,
    MessageSquare,
    Search,
    BookOpen,
    FileQuestion,
    PlayCircle,
    Settings,
    History,
    LogOut,
    MoreVertical,
    Plus,
    User,
    GraduationCap,
    Clock,
    Calendar,
    Layers,
    ChevronLeft,
    ChevronRight,
    Loader2,
    Sparkles,
    Quote,
    Users,
    Mail
} from 'lucide-react'

// Imagens para o carrossel
const CAROUSEL_IMAGES = [
    "https://images.unsplash.com/photo-1544377193-33dcf4d68fb5?q=80&w=1600&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?q=80&w=1600&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?q=80&w=1600&auto=format&fit=crop"
]

const AppLogo = ({ className = "size-9 sm:size-11" }) => (
    <div className={`${className} relative flex items-center justify-center bg-[#4A90E2] rounded-[30%] shadow-lg shadow-[#4A90E2]/20 transition-all duration-300 border-2 border-white/10`}>
        <svg viewBox="0 0 24 24" className="w-[60%] h-[60%] text-white" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            {/* O Passarinho Original Estuda Aí - Traçado Simples e Fiel */}
            <path d="M16 11c0-3.5-2.5-5.5-5.5-5.5S5 7.5 5 11c0 3 2.5 5 5.5 5h2" />
            <path d="M16 11h3l2 1-2 1h-3" />
            <circle cx="11.5" cy="9.5" r="0.8" fill="currentColor" stroke="none" />
            <path d="M9 16v3" />
            <path d="M12 16v3" />
        </svg>
    </div>
)

function App() {
    const [session, setSession] = useState(undefined) // undefined = loading, null = no session
    const [query, setQuery] = useState('')
    const [messages, setMessages] = useState([])
    const [files, setFiles] = useState([])
    const [response, setResponse] = useState(null)
    const [isMenuOpen, setIsMenuOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [uploading, setUploading] = useState(false)
    // Estado de Navegação e Contexto
    const [activeTab, setActiveTab] = useState('estudo') // estudo, perfil, provas, grade
    const [selectedSubject, setSelectedSubject] = useState(null)
    const [userRole, setUserRole] = useState('student') // student, professor, admin

    // Admin check — based on database role
    const isAdmin = userRole === 'admin'
    const isProfessor = userRole === 'professor' || userRole === 'admin'
    const isSuperAdmin = session?.user?.email === 'arlei85@hotmail.com'

    // Estado de Provas
    const [exams, setExams] = useState([])
    const [showExamForm, setShowExamForm] = useState(false)
    const [newExam, setNewExam] = useState({ title: '', subtitle: '', subject: '', date: '', time: '' })

    // Estado do Quiz
    const [quizMode, setQuizMode] = useState(false)
    const [quizQuestions, setQuizQuestions] = useState([])
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
    const [quizAnswers, setQuizAnswers] = useState([])
    const [quizResult, setQuizResult] = useState(null)

    // Quiz Control States
    const [showDocSelect, setShowDocSelect] = useState(false)
    const [selectedDocId, setSelectedDocId] = useState('')
    const [pendingAction, setPendingAction] = useState(null) // 'quiz', 'summary', 'guide', 'citations'

    // Estado do Carrossel (dados do banco)
    const [currentSlide, setCurrentSlide] = useState(0)
    const [carouselSlides, setCarouselSlides] = useState([
        { id: '1', url: 'https://images.unsplash.com/photo-1544377193-33dcf4d68fb5?q=80&w=1600&auto=format&fit=crop', caption: '' },
        { id: '2', url: 'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?q=80&w=1600&auto=format&fit=crop', caption: '' },
        { id: '3', url: 'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?q=80&w=1600&auto=format&fit=crop', caption: '' },
    ])
    const [showCarouselManager, setShowCarouselManager] = useState(false)
    const [newSlideUrl, setNewSlideUrl] = useState('')
    const [newSlideCaption, setNewSlideCaption] = useState('')
    const [showAbout, setShowAbout] = useState(false)

    // Estado das Matérias
    const [subjects, setSubjects] = useState([])
    const [showSubjectForm, setShowSubjectForm] = useState(false)
    const [newSubjectName, setNewSubjectName] = useState('')
    const [newSubjectIcon, setNewSubjectIcon] = useState('⚖️')
    const [userId, setUserId] = useState(null)

    // Estado do Perfil do Aluno
    const [perfil, setPerfil] = useState({ nome: '', turma: '', turno: '', curso: '', periodo: '', avatar: null })
    const [showPerfilForm, setShowPerfilForm] = useState(false)
    const [perfilDraft, setPerfilDraft] = useState({ nome: '', turma: '', turno: '', curso: '', periodo: '', avatar: null })

    // Estado da Grade
    const [schedule, setSchedule] = useState([])
    const [showScheduleForm, setShowScheduleForm] = useState(false)
    const [newScheduleItem, setNewScheduleItem] = useState({ day_of_week: 'SEG', start_time: '08:00', end_time: '09:00', subject_name: '', prof: '', color: '#4A90E2' })

    // Estado do Histórico de Quizzes
    const [quizHistory, setQuizHistory] = useState([])

    // Estado de Gestão de Professores (ADM)
    const [authEmails, setAuthEmails] = useState([])
    const [newAuthEmail, setNewAuthEmail] = useState('')
    const [isManagingProfs, setIsManagingProfs] = useState(false)
    const [isManagingUsers, setIsManagingUsers] = useState(false)
    const [usersList, setUsersList] = useState([])

    const fetchUsersList = async () => {
        setLoading(true)
        try {
            const { data, error } = await supabase.functions.invoke('user-management', {
                body: { action: 'list' }
            })
            if (error) throw error
            if (data.users) setUsersList(data.users)
        } catch (err) {
            console.error('Erro ao buscar lista de usuários:', err)
        } finally {
            setLoading(false)
        }
    }

    const deleteUser = async (targetUserId, targetEmail) => {
        if (!window.confirm(`AVISO IRREVERSÍVEL!\n\nTem certeza que deseja apagar permanentemente a conta de "${targetEmail}"?\n\nIsso apagará todos os documentos, quizzes, histórico e dados desta conta em efeito cascata. Esta ação não pode ser desfeita.`)) return
        
        setLoading(true)
        try {
            const { error } = await supabase.functions.invoke('user-management', {
                body: { action: 'delete', userId: targetUserId }
            })
            if (error) throw error
            alert('Usuário excluído com sucesso.')
            fetchUsersList()
        } catch (err) {
            console.error('Erro ao excluir usuário:', err)
            alert('Erro ao excluir usuário: ' + err.message)
        } finally {
            setLoading(false)
        }
    }

    const deleteOwnAccount = async () => {
        if (!window.confirm('⚠️ AVISO MÁXIMO ⚠️\n\nVocê tem certeza absoluta? Esta ação apagará permanentemente sua conta e TODOS os seus arquivos, quizzes e notas definitivamente.\n\nA exclusão é irreversível.')) return
        
        setLoading(true)
        try {
            const { error } = await supabase.functions.invoke('user-management', {
                body: { action: 'delete' }
            })
            if (error) throw error
            alert('Sua conta e todos os dados foram removidos com sucesso.')
            await supabase.auth.signOut()
        } catch (err) {
            console.error('Erro ao excluir própria conta:', err)
            alert('Erro ao excluir conta: ' + err.message)
        } finally {
            setLoading(false)
        }
    }

    const fetchAuthEmails = async () => {
        const { data, error } = await supabase
            .from('authorized_professor_emails')
            .select('*')
            .order('created_at', { ascending: false })
        if (!error && data) setAuthEmails(data)
    }

    const addAuthEmail = async () => {
        if (!newAuthEmail.trim()) return
        const { error } = await supabase
            .from('authorized_professor_emails')
            .insert({ email: newAuthEmail.trim().toLowerCase(), added_by: session?.user?.id })
        
        if (error) {
            alert('Erro ao adicionar e-mail: ' + error.message)
        } else {
            setNewAuthEmail('')
            fetchAuthEmails()
        }
    }

    const removeAuthEmail = async (email) => {
        const { error } = await supabase
            .from('authorized_professor_emails')
            .delete()
            .eq('email', email)
        
        if (error) alert('Erro ao remover e-mail.')
        else fetchAuthEmails()
    }

    useEffect(() => {
        if (isAdmin && activeTab === 'perfil') {
            fetchAuthEmails()
        }
        if (isSuperAdmin && activeTab === 'perfil') {
            fetchUsersList()
        }
    }, [isAdmin, isSuperAdmin, activeTab])

    const handleAvatarChange = (e) => {
        const file = e.target.files[0]
        if (!file) return
        const reader = new FileReader()
        reader.onload = (ev) => setPerfilDraft(p => ({ ...p, avatar: ev.target.result }))
        reader.readAsDataURL(file)
    }
    const handleSavePerfil = async () => {
        try {
            setLoading(true)
            const { data: { session } } = await supabase.auth.getSession()
            if (!session) return

            const { error } = await supabase
                .from('profiles')
                .upsert({
                    id: session.user.id,
                    name: perfilDraft.nome,
                    course: perfilDraft.curso,
                    period: perfilDraft.periodo,
                    class_group: perfilDraft.turma,
                    shift: perfilDraft.turno,
                    avatar_url: perfilDraft.avatar,
                    updated_at: new Date()
                })

            if (error) throw error
            setPerfil(perfilDraft)
            setShowPerfilForm(false)
        } catch (e) {
            console.error('Erro ao salvar perfil:', e)
            alert('Erro ao salvar perfil.')
        } finally {
            setLoading(false)
        }
    }
    const openPerfilForm = () => {
        setPerfilDraft({ ...perfil })
        setShowPerfilForm(true)
    }
    const SUBJECT_ICONS = ['⚖️', '📖', '🏛️', '📜', '🎓', '💼', '✌️', '📚']

    useEffect(() => {
        // Listen to auth state changes reactively
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session)
            if (session) {
                const uid = session.user.id
                setUserId(uid)
                fetchProfile(uid)
                fetchSubjects()
                fetchExams()
                fetchSchedule()
                fetchQuizHistory(uid)
                fetchCarouselImages()
            } else {
                // Reset all state on logout
                setUserId(null)
                setPerfil({ nome: '', turma: '', turno: '', curso: '', periodo: '', avatar: null })
                setSubjects([])
                setExams([])
                setSchedule([])
                setFiles([])
                setQuizHistory([])
            }
        })

        const timer = setInterval(() => {
            setCurrentSlide((prev) => (prev + 1) % Math.max(carouselSlides.length, 1))
        }, 5000)

        return () => {
            subscription.unsubscribe()
            clearInterval(timer)
        }
    }, [carouselSlides.length])

    const fetchProfile = async (uid) => {
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', uid)
            .single()

        if (data && !error) {
            setPerfil({
                nome: data.name || '',
                curso: data.course || '',
                periodo: data.period || '',
                turma: data.class_group || '',
                turno: data.shift || '',
                avatar: data.avatar_url || null
            })
            setUserRole(data.user_role || 'student')
        }
    }

    const fetchSubjects = async () => {
        try {
            const { data, error } = await supabase
                .from('subjects')
                .select('*')
                .order('name')
            if (error) throw error
            if (data) setSubjects(data.map(s => ({ id: s.id, name: s.name, icon: s.icon_name })))
        } catch (e) {
            console.error('Erro ao buscar matérias:', e)
        }
    }

    const fetchCarouselImages = async () => {
        try {
            const { data, error } = await supabase
                .from('carousel_images')
                .select('*')
                .order('display_order')
            if (!error && data && data.length > 0) {
                setCarouselSlides(data)
            }
        } catch (e) {
            console.warn('Erro ao buscar carrossel:', e)
        }
    }

    const fetchSchedule = async () => {
        try {
            const { data, error } = await supabase
                .from('schedule')
                .select('*')
                .order('start_time')
            if (error) throw error
            setSchedule(data || [])
        } catch (e) {
            console.error('Erro ao buscar grade:', e)
        }
    }

    const fetchDocuments = async (subjectId = null) => {
        try {
            if (!subjectId) {
                setFiles([])
                return
            }
            
            let query = supabase
                .from('documents')
                .select('*')
                .eq('subject_id', subjectId)
                .order('created_at', { ascending: false })

            const { data, error } = await query

            if (error) console.error('Erro ao buscar documentos:', error)
            else setFiles(data || [])
        } catch (e) {
            console.warn('Supabase não conectado ou erro de rede')
        }
    }

    const fetchQuizHistory = async (uid) => {
        try {
            const { data, error } = await supabase
                .from('quiz_history')
                .select('*')
                .eq('user_id', uid)
                .order('created_at', { ascending: false })
                .limit(20)
            if (error) throw error
            setQuizHistory(data || [])
        } catch (e) {
            console.warn('Erro ao buscar histórico de quizzes:', e)
        }
    }

    const fetchExams = async () => {
        try {
            const { data, error } = await supabase
                .from('exams')
                .select('*')
                .order('date', { ascending: true })
            if (error) throw error
            setExams(data || [])
        } catch (e) {
            console.warn('Erro ao buscar provas:', e)
        }
    }

    const handleAddExam = async (e) => {
        e.preventDefault()
        setLoading(true)
        try {
            const { data: { session } } = await supabase.auth.getSession()
            if (!session) { alert('Você precisa estar logado.'); return }

            const { error } = await supabase
                .from('exams')
                .insert([{
                    user_id: session.user.id,
                    title: newExam.title,
                    subtitle: newExam.subtitle,
                    subject: newExam.subject,
                    date: newExam.date,
                    time: newExam.time
                }])
            if (error) throw error

            setShowExamForm(false)
            setNewExam({ title: '', subtitle: '', subject: '', date: '', time: '' })
            fetchExams()
        } catch (err) {
            console.error('Erro ao adicionar prova:', err)
            alert('Erro ao salvar prova: ' + err.message)
        } finally {
            setLoading(false)
        }
    }


    const handleFileUpload = async (event) => {
        const file = event.target.files[0]
        if (!file) return

        setUploading(true)
        try {
            const fileExt = file.name.split('.').pop()
            const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`
            const filePath = `${fileName}`

            // 1. Upload the file to storage
            const { error: uploadError } = await supabase.storage
                .from('documents')
                .upload(filePath, file)

            if (uploadError) throw uploadError

            // 2. Register document in database with status 'processing'
            const { data: docData, error: dbError } = await supabase
                .from('documents')
                .insert({
                    user_id: session?.user?.id,
                    name: file.name,
                    file_path: filePath,
                    subject_id: selectedSubject?.id,
                    status: 'processing'
                })
                .select().single()

            if (dbError) throw dbError

            // Fetch to update the UI with 'processing' status
            await fetchDocuments(selectedSubject?.id)

            // 3. Trigger AI processing (async, wait for it)
            const { data: { session: currentSession } } = await supabase.auth.getSession()

            const processResponse = await fetch('https://qdbsdsnhygxlzrjmvhva.supabase.co/functions/v1/process-document', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${currentSession?.access_token || ''}`
                },
                body: JSON.stringify({ documentId: docData.id })
            })

            if (!processResponse.ok) {
                const errData = await processResponse.json().catch(() => ({}))
                throw new Error(errData.error || 'Erro ao processar o arquivo com IA')
            }

            // Fetch again to update UI with 'ready' status
            await fetchDocuments(selectedSubject?.id)
            alert('Documento processado com sucesso! O Professor IA já aprendeu este conteúdo.')

        } catch (error) {
            console.error('Erro no upload ou processamento:', error.message)
            alert(`Erro: ${error.message}`)
        } finally {
            setUploading(false)
        }
    }

    const handleAsk = async () => {
        if (!query.trim()) return
        const userMessage = { role: 'user', content: query }
        setMessages(prev => [...prev, userMessage])
        setQuery('')
        setLoading(true)

        try {
            const { data, error } = await supabase.functions.invoke('ask-ai', {
                body: {
                    query: query,
                    subjectId: selectedSubject?.id,
                    messages: messages.slice(-5) // Enviar contexto recente
                }
            })
            if (error) throw error
            const aiMessage = { role: 'assistant', content: data.answer }
            setMessages(prev => [...prev, aiMessage])
        } catch (error) {
            console.error('Erro ao perguntar:', error)
            alert('Não foi possível se comunicar com o Professor: ' + error.message)
        } finally {
            setLoading(false)
        }
    }

    const handleSubjectClick = (subject) => {
        setSelectedSubject(subject)
        setActiveTab('estudo')
        setResponse(null)
        setMessages([])
        setQuery('')
        fetchDocuments(subject.id)
    }

    const generateQuiz = async (filterDocId = '') => {
        if (!selectedSubject) return

        // Limite de 1 quiz por matéria por dia para alunos
        if (userRole === 'student') {
            try {
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                
                const { count, error: checkError } = await supabase
                    .from('quiz_history')
                    .select('*', { count: 'exact', head: true })
                    .eq('user_id', session.user.id)
                    .eq('subject_id', selectedSubject.id)
                    .gte('created_at', today.toISOString());

                if (checkError) throw checkError;

                if (count && count > 0) {
                    alert(`Você já realizou o quiz de "${selectedSubject.name}" hoje. \n\nPara otimizar seu aprendizado e evitar sobrecarga, permitimos apenas um quiz por matéria por dia. Volte amanhã para um novo desafio!`);
                    return;
                }
            } catch (err) {
                console.error('Erro ao verificar limite de quiz:', err);
            }
        }

        setLoading(true)
        setShowDocSelect(false)
        
        try {
            const { data, error } = await supabase.functions.invoke('generate-quiz', {
                body: { 
                    subjectId: selectedSubject.id,
                    subjectName: selectedSubject.name,
                    documentId: filterDocId || undefined,
                    count: 10
                }
            })

            if (error) throw error
            if (!data || !data.questions || data.questions.length === 0) {
                throw new Error("Nenhuma questão retornada pela IA")
            }

            setQuizQuestions(data.questions)
            setCurrentQuestionIndex(0)
            setQuizAnswers([])
            setQuizResult(null)
            setQuizMode(true)
            
            if (!data.basedOnMaterials) {
                // Pequeno aviso se não usou os materiais
                setTimeout(() => alert("Aviso: Nenhum material de estudo processado foi encontrado para esta matéria. O Quiz foi gerado com conhecimentos gerais Acadêmicos."), 500)
            }
        } catch (error) {
            console.error('Erro ao gerar quiz:', error)
            alert('Não foi possível gerar as questões do Quiz neste momento.')
        } finally {
            setLoading(false)
        }
    }

    const handleActionClick = (action) => {
        setPendingAction(action)
        setSelectedDocId('')
        if (files.length > 1) {
            setShowDocSelect(true)
        } else {
            executePendingAction(action, files.length === 1 ? files[0].id : '')
        }
    }

    const executePendingAction = (action, docId) => {
        if (!action) return
        
        switch (action) {
            case 'quiz':
                generateQuiz(docId)
                break
            case 'summary':
                generateSummary(docId)
                break
            case 'guide':
                generateStudyGuide(docId)
                break
            case 'citations':
                generateCitations(docId)
                break
            default:
                break
        }
    }

    const generateSummary = async (docId) => {
        if (!selectedSubject) return
        setLoading(true)
        setShowDocSelect(false)
        
        const userMsg = { role: 'user', content: 'Gerar resumo estruturado do material.' }
        setMessages(prev => [...prev, userMsg])

        try {
            const { data, error } = await supabase.functions.invoke('notebooklm-actions', {
                body: { 
                    action: 'summary',
                    subjectId: selectedSubject.id,
                    documentId: docId || undefined
                }
            })

            if (error) throw error
            const aiMessage = { role: 'assistant', content: data.result, type: 'summary' }
            setMessages(prev => [...prev, aiMessage])
        } catch (error) {
            console.error('Erro ao gerar resumo:', error)
            alert('Não foi possível gerar o resumo. Tente novamente em instantes.')
        } finally {
            setLoading(false)
        }
    }

    const generateStudyGuide = async (docId) => {
        if (!selectedSubject) return
        setLoading(true)
        setShowDocSelect(false)
        
        const userMsg = { role: 'user', content: 'Criar guia de estudo para este material.' }
        setMessages(prev => [...prev, userMsg])

        try {
            const { data, error } = await supabase.functions.invoke('notebooklm-actions', {
                body: { 
                    action: 'guide',
                    subjectId: selectedSubject.id,
                    documentId: docId || undefined
                }
            })

            if (error) throw error
            const aiMessage = { role: 'assistant', content: data.result, type: 'guide' }
            setMessages(prev => [...prev, aiMessage])
        } catch (error) {
            console.error('Erro ao gerar guia:', error)
            alert('Não foi possível gerar o guia de estudo.')
        } finally {
            setLoading(false)
        }
    }

    const generateCitations = async (docId) => {
        if (!selectedSubject) return
        setLoading(true)
        setShowDocSelect(false)
        
        const userMsg = { role: 'user', content: 'Extrair citações diretas relevantes.' }
        setMessages(prev => [...prev, userMsg])

        try {
            const { data, error } = await supabase.functions.invoke('notebooklm-actions', {
                body: { 
                    action: 'citations',
                    subjectId: selectedSubject.id,
                    documentId: docId || undefined
                }
            })

            if (error) throw error
            const aiMessage = { role: 'assistant', content: data.result, type: 'citations' }
            setMessages(prev => [...prev, aiMessage])
        } catch (error) {
            console.error('Erro ao buscar citações:', error)
            alert('Não foi possível extrair as citações.')
        } finally {
            setLoading(false)
        }
    }

    const handleQuizAnswer = (questionIdx, optionIdx) => {
        const newAnswers = [...quizAnswers]
        newAnswers[questionIdx] = optionIdx
        setQuizAnswers(newAnswers)
    }

    const finishQuiz = () => {
        const correctCount = quizAnswers.reduce((acc, ans, idx) => {
            const q = quizQuestions[idx]
            const isCorrect = ans === q.answer || q.options[ans] === q.answer
            return isCorrect ? acc + 1 : acc
        }, 0)
        const result = {
            score: correctCount,
            total: quizQuestions.length,
            percentage: Math.round((correctCount / quizQuestions.length) * 100)
        }
        setQuizResult(result)
        saveQuizResult(result)
    }

    const saveQuizResult = async (result) => {
        try {
            const { data: { session } } = await supabase.auth.getSession()
            if (!session) return

            await supabase.from('quiz_history').insert({
                user_id: session.user.id,
                subject_name: selectedSubject.name,
                subject_id: selectedSubject.id,
                score: result.score,
                total_questions: result.total
            })
            
            fetchQuizHistory(session.user.id)
        } catch (e) {
            console.error('Erro ao salvar resultado:', e)
        }
    }

    const handleAddSubjectSubmit = async (e) => {
        e.preventDefault()
        if (newSubjectName.trim()) {
            try {
                setLoading(true)
                const { data: { session } } = await supabase.auth.getSession()
                if (!session) return
                const { error } = await supabase
                    .from('subjects')
                    .insert([{ name: newSubjectName.trim(), icon_name: newSubjectIcon, user_id: session.user.id }])

                if (error) throw error

                fetchSubjects()
                setShowSubjectForm(false)
                setNewSubjectName('')
                setNewSubjectIcon('⚖️')
            } catch (e) {
                console.error('Erro ao criar matéria:', e)
            } finally {
                setLoading(false)
            }
        }
    }

    const handleAddScheduleItem = async (e) => {
        e.preventDefault()
        try {
            setLoading(true)
            const { data: { session } } = await supabase.auth.getSession()
            if (!session) return

            const { error } = await supabase
                .from('schedule')
                .insert([{
                    user_id: session.user.id,
                    day_of_week: newScheduleItem.day_of_week,
                    start_time: newScheduleItem.start_time,
                    end_time: newScheduleItem.end_time,
                    subject_name: newScheduleItem.subject_name,
                    room: newScheduleItem.prof, // Reutilizando campo prof p/ room se necessário ou prof
                    color: newScheduleItem.color
                }])

            if (error) throw error
            fetchSchedule()
            setShowScheduleForm(false)
            setNewScheduleItem({ day_of_week: 'SEG', start_time: '08:00', end_time: '09:00', subject_name: '', prof: '', color: '#4A90E2' })
        } catch (e) {
            console.error('Erro ao salvar aula:', e)
        } finally {
            setLoading(false)
        }
    }

    // Auth guard — show loading spinner, login screen, or app
    if (session === undefined) {
        return (
            <div className="min-h-screen bg-estuda-bg flex items-center justify-center">
                <div className="flex flex-col items-center gap-4 opacity-40">
                    <Loader2 size={40} className="animate-spin text-estuda-primary" />
                    <p className="text-xs font-black uppercase tracking-widest">Carregando...</p>
                </div>
            </div>
        )
    }

    if (!session) {
        return <Login />
    }

    // Redirecionamento para Portal do Professor
    if (userRole === 'professor') {
        return <ProfessorPortal session={session} onLogout={() => supabase.auth.signOut()} />
    }

    return (
        <div className="min-h-screen bg-estuda-bg text-estuda-text selection:bg-estuda-primary selection:text-estuda-bg transition-colors duration-500">
            {/* Header */}
            <header className="h-16 sm:h-20 px-4 sm:px-12 flex items-center justify-between border-b border-estuda-primary/10 bg-estuda-bg/80 backdrop-blur-xl sticky top-0 z-50">
                <div className="flex items-center gap-2 sm:gap-3 group">
                    <AppLogo />
                    <div>
                        <h1 className="text-base sm:text-lg font-black tracking-tighter leading-none mb-1 text-white">Estuda <span className="text-estuda-primary">Aí</span></h1>
                        <p className="text-[7px] sm:text-[9px] text-estuda-secondary font-bold uppercase tracking-[0.2em]">Caminho para o Sucesso</p>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <div className="text-right flex flex-col justify-center">
                        <p className="text-sm font-black text-white leading-tight">
                            {perfil.nome ? perfil.nome.split(' ')[0] : 'Estudante'}
                        </p>
                        <p className="text-[9px] text-estuda-primary font-bold uppercase tracking-wider leading-tight">
                            {perfil.curso || 'Não definido'} {perfil.periodo ? `· ${perfil.periodo}º Período` : ''}
                        </p>
                        <p className="text-[8px] text-white/40 font-bold uppercase tracking-widest mt-0.5">
                            {perfil.turno || '---'} {perfil.turma ? `[${perfil.turma}]` : ''}
                        </p>
                    </div>
                    <div className="relative">
                        <button
                            onClick={() => setIsMenuOpen(!isMenuOpen)}
                            className="size-11 sm:size-12 rounded-2xl border-2 border-estuda-primary/20 p-0.5 hover:border-estuda-primary transition-all overflow-hidden bg-estuda-surface shadow-xl flex items-center justify-center rotate-2 hover:rotate-0"
                        >
                            {perfil.avatar ? (
                                <img src={perfil.avatar} alt="Perfil" className="w-full h-full object-cover rounded-xl" />
                            ) : (
                                <div className="w-full h-full bg-estuda-primary/10 flex items-center justify-center rounded-xl">
                                    <User size={24} className="text-estuda-primary" />
                                </div>
                            )}
                        </button>
                        {isMenuOpen && (
                            <div className="absolute right-0 mt-3 w-48 glass rounded-2xl shadow-xl border border-estuda-primary/10 py-2 z-50 animate-fade-in">
                                {isAdmin && (
                                    <div className="px-4 py-1.5">
                                        <span className="text-[9px] font-black uppercase tracking-widest text-yellow-400 bg-yellow-400/10 px-2 py-0.5 rounded-full">⭐ Administrador</span>
                                    </div>
                                )}
                                <button
                                    onClick={() => { openPerfilForm(); setIsMenuOpen(false); }}
                                    className="w-full px-4 py-2 flex items-center gap-2 hover:bg-estuda-primary/5 text-sm font-medium"
                                >
                                    <Settings size={16} /> Minha Conta
                                </button>
                                <div className="h-px bg-estuda-primary/10 my-1 mx-2"></div>
                                <button
                                    onClick={async () => {
                                        await supabase.auth.signOut()
                                        setIsMenuOpen(false)
                                    }}
                                    className="w-full px-4 py-2 flex items-center gap-2 hover:bg-red-500/10 text-red-400 text-sm font-bold"
                                >
                                    <LogOut size={16} /> Sair da Conta
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </header>

            <main className="flex-1 max-w-6xl mx-auto w-full px-6 py-6 flex flex-col gap-8">

                {/* Carrossel de Imagens */}
                {activeTab === 'estudo' && !selectedSubject && (
                    <section className="relative rounded-[1.5rem] sm:rounded-[2.5rem] overflow-hidden group shadow-2xl shadow-estuda-primary/10 h-48 sm:h-80 lg:h-96">
                        <div className="absolute inset-0 bg-gradient-to-t from-estuda-bg/80 to-transparent z-10 pointer-events-none"></div>

                        {carouselSlides.map((slide, idx) => (
                            <div
                                key={slide.id || idx}
                                className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${idx === currentSlide ? 'opacity-100' : 'opacity-0'}`}
                            >
                                <img src={slide.url} className="w-full h-full object-cover" alt={slide.caption || `Slide ${idx + 1}`} />
                            </div>
                        ))}

                        {/* Texto sobre o carrossel */}
                        <div className="absolute bottom-6 left-6 sm:bottom-10 sm:left-10 z-20 text-white animate-fade-in pr-6">
                            <h2 className="text-xl sm:text-3xl font-bold mb-1 sm:mb-2">
                                {carouselSlides[currentSlide]?.caption || 'Potencialize seus estudos'}
                            </h2>
                            <p className="text-[10px] sm:text-sm opacity-90 font-medium">Use nossa IA para entender conteúdos complexos em segundos.</p>
                        </div>

                        {/* Seletores de bolinha */}
                        <div className="absolute bottom-4 right-6 sm:bottom-6 sm:right-10 z-20 flex gap-1.5 sm:gap-2">
                            {carouselSlides.map((_, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => setCurrentSlide(idx)}
                                    className={`size-1.5 sm:size-2.5 rounded-full transition-all ${idx === currentSlide ? 'bg-estuda-primary w-5 sm:w-8' : 'bg-white/20'}`}
                                />
                            ))}
                        </div>

                        {/* Botão Gerenciar Slides — apenas admin */}
                        {isAdmin && (
                            <button
                                onClick={() => setShowCarouselManager(true)}
                                className="absolute top-4 right-4 z-20 bg-black/40 text-white px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 hover:bg-black/60 transition-all"
                            >
                                <Settings size={12} /> Gerenciar Slides
                            </button>
                        )}
                    </section>
                )}

                {/* Content Area Switcher */}
                {!selectedSubject ? (
                    <>
                        {/* Seção de Matérias (Home) */}
                        {activeTab === 'estudo' && (
                            <section className="animate-fade-in" style={{ animationDelay: '0.2s' }}>
                                <div className="flex items-center justify-between mb-6">
                                    <h3 className="text-xl font-bold flex items-center gap-3">
                                        <Layers size={24} className="text-estuda-primary" /> Minhas Matérias
                                    </h3>
                                    <button
                                        onClick={() => setActiveTab('grade')}
                                        className="text-xs font-bold text-estuda-primary hover:underline"
                                    >
                                        Ver todas
                                    </button>
                                </div>

                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    {isAdmin && (
                                        <button
                                            onClick={() => setShowSubjectForm(true)}
                                            className="flex flex-col items-center justify-center gap-3 p-6 rounded-[2rem] border-2 border-dashed border-estuda-primary/20 bg-estuda-surface/50 hover:bg-estuda-surface hover:border-estuda-primary transition-all group aspect-square"
                                        >
                                            <div className="size-12 rounded-full bg-estuda-primary/10 flex items-center justify-center text-estuda-primary group-hover:scale-110 transition-transform">
                                                <Plus size={24} />
                                            </div>
                                            <span className="text-sm font-bold">Adicionar</span>
                                        </button>
                                    )}

                                    {subjects.map(subject => (
                                        <div
                                            key={subject.id}
                                            className="group relative"
                                        >
                                            <div
                                                onClick={() => handleSubjectClick(subject)}
                                                className="flex flex-col items-center justify-center gap-3 p-6 rounded-[2rem] bg-estuda-surface shadow-sm border border-estuda-primary/5 hover:shadow-xl hover:-translate-y-1 transition-all aspect-square cursor-pointer overflow-hidden relative group"
                                            >
                                                <div className="text-4xl mb-2 group-hover:scale-110 transition-transform">{subject.icon}</div>
                                                <span className="text-sm font-bold text-center leading-tight">{subject.name}</span>
                                            </div>
                                            {isAdmin && (
                                                <button
                                                    onClick={async (e) => {
                                                        e.stopPropagation();
                                                        if (confirm(`ATENÇÃO! Excluir a matéria "${subject.name}"? Todos os PDFs da matéria serão apagados da nuvem e do aplicativo para sempre. Prosseguir?`)) {
                                                            try {
                                                                // 1. Procurar os arquivos da matéria alvo
                                                                const { data: docsToPurge } = await supabase
                                                                    .from('documents')
                                                                    .select('id, file_path')
                                                                    .eq('subject_id', subject.id);

                                                                // 2. Existem PDFs fisicos atrelados a ela?
                                                                if (docsToPurge && docsToPurge.length > 0) {
                                                                    const paths = docsToPurge.map(doc => doc.file_path);
                                                                    
                                                                    // 2.1 Queimar PDFs do Supabase Storage
                                                                    await supabase.storage.from('documents').remove(paths);
                                                                    
                                                                    // 2.2 Queimar Tabela Documentos (o Supabase já limpa document_chunks em cascata graças ao CASCADE que preparamos)
                                                                    await supabase.from('documents').delete().eq('subject_id', subject.id);
                                                                }

                                                                // 3. Finalmente deletar Raiz Principal (Subject)
                                                                const { error: rootErr } = await supabase.from('subjects').delete().eq('id', subject.id);
                                                                if (rootErr) throw rootErr;

                                                                // 4. Update da UI
                                                                fetchSubjects();
                                                                if (selectedSubject?.id === subject.id) {
                                                                    setSelectedSubject(null);
                                                                    setFiles([]);
                                                                }
                                                            } catch (err) {
                                                                alert('Falha total ao excluir a matéria com seus arquivos: ' + err.message);
                                                            }
                                                        }
                                                    }}
                                                    className="absolute top-4 right-4 p-1.5 bg-red-500/10 text-red-500 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500 hover:text-white"
                                                >
                                                    <Trash2 size={12} />
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </section>
                        )}
                    </>
                ) : (
                    <section className="animate-fade-in flex flex-col h-[calc(100vh-14rem)]">
                        {/* Cabeçalho do Professor IA */}
                        <div className="flex items-center justify-between bg-estuda-surface p-4 sm:p-6 rounded-t-[2rem] border border-estuda-primary/10 shadow-lg relative shrink-0">
                            <div className="absolute top-0 left-0 w-1 h-full bg-estuda-primary"></div>
                            <div className="flex items-center gap-4">
                                <button
                                    onClick={() => { setSelectedSubject(null); setQuizMode(false) }}
                                    className="p-2 hover:bg-estuda-primary/10 rounded-full transition-colors"
                                >
                                    <ChevronLeft size={24} />
                                </button>
                                <div>
                                    <span className="text-[10px] font-black uppercase tracking-widest text-estuda-primary">Professor IA Dedicado</span>
                                    <h2 className="text-xl sm:text-2xl font-bold">{selectedSubject?.name}</h2>
                                </div>
                            </div>

                            {!quizMode && (
                                <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 px-2 sm:px-0">
                                    <button
                                        onClick={() => handleActionClick('summary')}
                                        className="bg-purple-600 text-white px-3 py-2 sm:px-4 sm:py-2.5 rounded-xl font-bold flex items-center gap-2 hover:scale-105 active:scale-95 transition-all shadow-lg text-[10px] sm:text-xs whitespace-nowrap"
                                    >
                                        <Sparkles size={16} /> Resumo
                                    </button>
                                    <button
                                        onClick={() => handleActionClick('guide')}
                                        className="bg-blue-600 text-white px-3 py-2 sm:px-4 sm:py-2.5 rounded-xl font-bold flex items-center gap-2 hover:scale-105 active:scale-95 transition-all shadow-lg text-[10px] sm:text-xs whitespace-nowrap"
                                    >
                                        <BookOpen size={16} /> Guia
                                    </button>
                                    <button
                                        onClick={() => handleActionClick('citations')}
                                        className="bg-emerald-600 text-white px-3 py-2 sm:px-4 sm:py-2.5 rounded-xl font-bold flex items-center gap-2 hover:scale-105 active:scale-95 transition-all shadow-lg text-[10px] sm:text-xs whitespace-nowrap"
                                    >
                                        <Quote size={16} /> Citações
                                    </button>
                                    <button
                                        onClick={() => handleActionClick('quiz')}
                                        className="bg-estuda-primary text-white px-3 py-2 sm:px-4 sm:py-2.5 rounded-xl font-bold flex items-center gap-2 hover:scale-105 active:scale-95 transition-all shadow-lg text-[10px] sm:text-xs whitespace-nowrap"
                                    >
                                        <FileQuestion size={16} /> Quiz (10)
                                    </button>
                                </div>
                            )}
                        </div>

                        {quizMode ? (
                            /* Modo Quiz em Lista */
                            <div className="flex-1 overflow-hidden flex flex-col bg-estuda-surface border-x border-estuda-primary/10">
                                {!quizResult ? (
                                    <>
                                        {/* Status Fixo do Quiz */}
                                        <div className="bg-estuda-bg/50 p-4 border-b border-estuda-primary/10 flex justify-between items-center shrink-0">
                                            <div className="flex flex-col gap-1">
                                                <span className="text-[10px] font-black uppercase opacity-60">Progresso do Quiz</span>
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
                                        <div className="flex-1 overflow-y-auto p-4 sm:p-8 flex flex-col gap-8 custom-scrollbar">
                                            {quizQuestions.map((q, qIdx) => (
                                                <div key={q.id} className="bg-estuda-bg/30 p-6 rounded-3xl border border-estuda-primary/5 animate-fade-in">
                                                    <h3 className="text-lg font-bold mb-6 leading-relaxed">
                                                        <span className="text-estuda-primary mr-2">#{qIdx + 1}</span> {q.question}
                                                    </h3>
                                                    <div className="grid grid-cols-1 gap-3">
                                                        {q.options.map((opt, oIdx) => (
                                                            <button
                                                                key={oIdx}
                                                                onClick={() => handleQuizAnswer(qIdx, oIdx)}
                                                                className={`p-4 rounded-2xl border transition-all text-left font-bold flex items-center gap-4 ${quizAnswers[qIdx] === oIdx ? 'bg-estuda-primary text-white border-estuda-primary shadow-lg' : 'border-estuda-primary/10 bg-estuda-bg/50 hover:bg-estuda-primary/10 text-estuda-text'}`}
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
                                            <div className="py-10 text-center">
                                                <button
                                                    onClick={finishQuiz}
                                                    disabled={quizAnswers.filter(a => a !== undefined).length < 10}
                                                    className={`px-12 py-4 rounded-2xl font-black text-lg transition-all shadow-xl ${quizAnswers.filter(a => a !== undefined).length === 10 ? 'bg-estuda-primary text-white hover:scale-105 active:scale-95' : 'bg-estuda-primary/20 text-estuda-primary/40 cursor-not-allowed'}`}
                                                >
                                                    ENVIAR RESPOSTAS
                                                </button>
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                    /* Resultado do Quiz */
                                    <div className="flex-1 flex flex-col p-8 animate-fade-in text-center overflow-y-auto">
                                        <div className="flex flex-col items-center justify-center text-center">
                                            <div className="size-24 rounded-full bg-estuda-primary text-white flex items-center justify-center mb-6 shadow-2xl shrink-0">
                                                <GraduationCap size={48} />
                                            </div>
                                            <h3 className="text-3xl font-black mb-2">Quiz Finalizado!</h3>
                                            <p className="text-estuda-primary-medium font-bold mb-8">Ótimo desempenho em {selectedSubject?.name}</p>

                                            <div className="flex justify-center gap-8 mb-10 w-full max-w-sm">
                                                <div className="flex-1 bg-estuda-bg/50 p-4 rounded-3xl border border-estuda-primary/5">
                                                    <p className="text-4xl font-black text-estuda-primary">{quizResult.score}</p>
                                                    <p className="text-[10px] uppercase font-black opacity-40">Acertos</p>
                                                </div>
                                                <div className="flex-1 bg-estuda-bg/50 p-4 rounded-3xl border border-estuda-primary/5">
                                                    <p className="text-4xl font-black text-estuda-primary">{quizResult.percentage}%</p>
                                                    <p className="text-[10px] uppercase font-black opacity-40">Aproveitamento</p>
                                                </div>
                                            </div>

                                            <div className="flex justify-center gap-4 mt-8 pt-6 border-t border-estuda-primary/10">
                                                <button
                                                    onClick={() => {
                                                        setQuizMode(false)
                                                        setQuizResult(null)
                                                    }}
                                                    className="px-8 py-3 rounded-2xl font-black text-sm border-2 border-estuda-primary/20 hover:bg-estuda-primary/10 transition-colors"
                                                >
                                                    Voltar aos Estudos
                                                </button>
                                            </div>
                                        </div>

                                        {/* Mapeamento das questões para revisão (Erros) */}
                                        <div className="mt-8 pt-4">
                                            <h4 className="text-xl font-black text-white mb-6 flex items-center gap-2">
                                                <MessageSquare size={20} className="text-estuda-primary" /> Correção e Feedback
                                            </h4>
                                            <div className="flex flex-col gap-6">
                                                {quizQuestions.map((q, qIdx) => {
                                                    const userAnswer = quizAnswers[qIdx]
                                                    const isCorrect = userAnswer === q.answer || q.options[userAnswer] === q.answer
                                                    
                                                    return (
                                                        <div key={qIdx} className={`p-5 rounded-2xl border ${isCorrect ? 'bg-green-500/5 border-green-500/20' : 'bg-red-500/5 border-red-500/20'}`}>
                                                            <p className="font-bold text-sm mb-3 text-white">
                                                                <span className={`inline-block w-6 h-6 rounded-md text-center leading-6 text-xs mr-2 ${isCorrect ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-500'}`}>
                                                                    {qIdx + 1}
                                                                </span>
                                                                {q.question}
                                                            </p>
                                                            <div className="text-xs space-y-2 mt-2">
                                                                <div className="flex items-center gap-2 text-white/50">
                                                                    <span className="font-bold w-12 shrink-0">Sua exp:</span> 
                                                                    <span className={isCorrect ? 'text-green-400 font-bold' : 'text-red-400 line-through'}>{q.options[userAnswer] || "Não respondeu"}</span>
                                                                </div>
                                                                {!isCorrect && q.explanation && (
                                                                    <div className="mt-4 p-4 rounded-xl bg-estuda-surface border border-estuda-primary/20">
                                                                        <div className="flex items-start gap-2">
                                                                            <BookOpen size={16} className="text-estuda-primary shrink-0 mt-0.5" />
                                                                            <div>
                                                                                <p className="text-[10px] font-black uppercase text-estuda-primary mb-1 tracking-widest">Explicação do Professor</p>
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
                            /* Modo Chat WhatsApp */
                            <div className="flex-1 flex flex-col bg-estuda-surface border-x border-estuda-primary/10 overflow-hidden relative">
                                {/* Área de Mensagens */}
                                <div className="flex-1 overflow-y-auto p-4 sm:p-6 flex flex-col gap-4 custom-scrollbar bg-estuda-bg/50">
                                    {messages.length === 0 ? (
                                        <div className="flex-1 flex flex-col items-center justify-center text-center p-8 opacity-20">
                                            <MessageSquare size={64} className="mb-4" />
                                            <h3 className="text-xl font-bold">Inicie um papo com o Prof. Virtual</h3>
                                            <p className="text-sm font-medium max-w-xs mx-auto">Tire dúvidas sobre seus arquivos de {selectedSubject?.name} agora mesmo.</p>
                                        </div>
                                    ) : (
                                        messages.map((msg, idx) => (
                                            <div
                                                key={idx}
                                                className={`flex flex-col max-w-[85%] sm:max-w-[70%] ${msg.role === 'user' ? 'self-end items-end' : 'self-start items-start'} animate-fade-in`}
                                            >
                                                <div className={`p-4 sm:p-5 rounded-2xl text-xs sm:text-sm leading-relaxed max-w-full transition-all duration-500 relative ${
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
                                                        {msg.role === 'assistant' && msg.type && (
                                                            <div className="flex items-center gap-2 mb-3 pb-2 border-b border-white/10">
                                                                {msg.type === 'summary' && <><Sparkles size={16} className="text-purple-400" /> <span className="font-bold text-purple-400 uppercase tracking-wider text-[10px]">Resumo Estruturado</span></>}
                                                                {msg.type === 'guide' && <><BookOpen size={16} className="text-blue-400" /> <span className="font-bold text-blue-400 uppercase tracking-wider text-[10px]">Guia de Estudo</span></>}
                                                                {msg.type === 'citations' && <><Quote size={16} className="text-emerald-400" /> <span className="font-bold text-emerald-400 uppercase tracking-wider text-[10px]">Citações Diretas</span></>}
                                                            </div>
                                                        )}
                                                        <div className="whitespace-pre-wrap prose prose-invert max-w-none prose-sm">
                                                            {msg.content}
                                                        </div>

                                                        {msg.sources && (
                                                            <div className="mt-3 flex flex-wrap gap-1.5 pt-3 border-t border-white/10">
                                                                {msg.sources.map((s, i) => (
                                                                    <span key={i} className="text-[8px] font-bold bg-black/20 px-1.5 py-0.5 rounded border border-white/5 opacity-60">
                                                                        {s}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        )}

                                                        {/* Indicador de "rabinho" do balão */}
                                                        <div className={`absolute top-0 size-3 transform ${msg.role === 'user' ? 'bg-estuda-primary right-[-6px] rounded-br-full translate-x-1/2' : 'bg-white/10 border-l border-t border-white/10 left-[-6px] rounded-bl-full -translate-x-1/2'}`}></div>
                                                    </div>
                                                <span className="text-[9px] font-black uppercase opacity-30 mt-1 tracking-widest">{msg.role === 'user' ? 'Você' : 'Professor IA'}</span>
                                            </div>
                                        ))
                                    )}
                                    {loading && (
                                        <div className="self-start flex flex-col items-start animate-pulse">
                                            <div className="bg-estuda-surface p-4 rounded-2xl border border-estuda-primary/10 rounded-tl-none flex items-center gap-2">
                                                <Loader2 size={16} className="animate-spin text-estuda-primary" />
                                                <span className="text-xs font-bold opacity-60">O Professor está elaborando...</span>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Barra de Input Estilo WhatsApp (Inferior) */}
                                <div className="p-4 bg-estuda-surface border-t border-estuda-primary/10 shrink-0">
                                    <div className="max-w-4xl mx-auto relative flex items-end gap-3">
                                        <div className="flex-1 relative">
                                            <textarea
                                                rows="1"
                                                value={query}
                                                onChange={(e) => setQuery(e.target.value)}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter' && !e.shiftKey) {
                                                        e.preventDefault();
                                                        handleAsk();
                                                    }
                                                }}
                                                placeholder="Sua dúvida sobre a matéria..."
                                                className="w-full bg-estuda-bg border border-estuda-primary/10 rounded-2xl py-3.5 px-5 pr-12 text-sm focus:outline-none focus:ring-2 focus:ring-estuda-primary/20 transition-all font-medium placeholder:text-estuda-primary/30 resize-none max-h-32"
                                            />
                                            <button
                                                className="absolute right-3 bottom-0 top-0 m-auto text-white/40 hover:text-estuda-primary p-1"
                                                onClick={() => {/* Anexar */ }}
                                            >
                                                <Layers size={20} />
                                            </button>
                                        </div>
                                        <button
                                            onClick={handleAsk}
                                            disabled={loading || !query.trim()}
                                            className="bg-estuda-primary text-white size-12 rounded-2xl flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-lg shrink-0"
                                        >
                                            {loading ? <Loader2 className="animate-spin" size={20} /> : <Search size={20} />}
                                        </button>
                                    </div>
                                    <p className="text-[10px] text-center mt-3 opacity-30 font-bold uppercase tracking-widest">O Professor IA utiliza seus materiais como base de conhecimento</p>
                                </div>
                            </div>
                        )}
                    </section>
                )}

                {/* Aba de Provas */}
                {activeTab === 'provas' && !selectedSubject && (
                    <section className="animate-fade-in flex flex-col gap-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-xl sm:text-3xl font-bold flex items-center gap-3">
                                <FileQuestion size={32} className="text-estuda-primary" /> Provas
                            </h3>
                            {isAdmin && (
                                <button
                                    onClick={() => setShowExamForm(true)}
                                    className="bg-estuda-primary text-white px-4 py-2 sm:px-6 sm:py-3 rounded-[1rem] sm:rounded-2xl font-bold flex items-center gap-2 hover:scale-105 active:scale-95 transition-all shadow-lg text-xs sm:text-sm"
                                >
                                    <Calendar size={18} /> <span>Adicionar Prova</span>
                                </button>
                            )}
                        </div>

                        {exams.length === 0 ? (
                            <div className="bg-estuda-surface/40 border-2 border-dashed border-estuda-primary/10 rounded-[2rem] flex flex-col items-center justify-center text-estuda-text/40 p-12 text-center sm:h-64 h-48">
                                <Calendar size={48} className="opacity-20 mb-4 sm:w-16 sm:h-16 w-12 h-12" />
                                <h4 className="text-base sm:text-lg font-bold mb-2 opacity-60">Nenhuma prova agendada</h4>
                                <p className="text-xs sm:text-sm font-medium opacity-40 max-w-xs">Mantenha seu calendário organizado adicionando suas próximas datas de avaliação.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {exams.map(exam => (
                                    <div key={exam.id} className="bg-estuda-surface p-6 rounded-[2rem] border border-estuda-primary/10 hover:shadow-xl hover:-translate-y-1 transition-all group relative overflow-hidden flex flex-col">
                                        <div className="absolute top-0 right-0 w-24 h-24 bg-estuda-primary/5 rounded-bl-[4rem] -z-0"></div>
                                        <div className="flex items-start gap-4 mb-4 relative z-10">
                                            <div className="size-14 rounded-2xl bg-estuda-bg flex flex-col items-center justify-center text-estuda-primary shadow-inner border border-estuda-primary/10 shrink-0">
                                                <span className="text-[10px] font-black uppercase tracking-tighter opacity-70">
                                                    {new Date(exam.date + 'T00:00:00').toLocaleDateString('pt-BR', { month: 'short' })}
                                                </span>
                                                <span className="text-xl font-black leading-none">{exam.date.split('-')[2]}</span>
                                            </div>
                                            <div className="pt-1 overflow-hidden">
                                                <h4 className="font-bold text-lg leading-tight mb-1 truncate">{exam.title}</h4>
                                                <span className="text-[10px] font-black uppercase text-estuda-secondary tracking-widest bg-estuda-secondary/10 px-2 py-0.5 rounded-full inline-block truncate max-w-full">{exam.subject}</span>
                                            </div>
                                        </div>
                                        {exam.subtitle && <p className="text-sm font-medium opacity-70 mb-4 line-clamp-2 relative z-10">{exam.subtitle}</p>}
                                        <div className="flex items-center justify-between gap-2 mt-auto pt-4 border-t border-estuda-primary/5 relative z-10">
                                            <div className="flex items-center gap-1.5 text-estuda-text">
                                                <Clock size={16} className="text-estuda-primary opacity-80" />
                                                <span className="text-xs font-bold opacity-80 uppercase">{exam.time.substring(0, 5)}</span>
                                            </div>
                                            {isAdmin && (
                                                <button
                                                    onClick={async () => {
                                                        if (confirm('Excluir esta prova?')) {
                                                            const { error } = await supabase.from('exams').delete().eq('id', exam.id);
                                                            if (!error) fetchExams();
                                                        }
                                                    }}
                                                    className="p-2 text-red-500/20 hover:text-red-500 transition-colors"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}


                    </section>
                )}

                {/* Aba Grade Horária */}
                {activeTab === 'grade' && !selectedSubject && (() => {
                    const days = ['SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB']
                    const dayLabels = { SEG: 'Segunda', TER: 'Terça', QUA: 'Quarta', QUI: 'Quinta', SEX: 'Sexta', SÁB: 'Sábado' }

                    return (
                        <section className="animate-fade-in pb-24 flex flex-col gap-5">
                            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-estuda-surface p-6 rounded-[2rem] border border-estuda-primary/10">
                                <div className="text-center sm:text-left">
                                    <div className="inline-block bg-estuda-primary/10 border border-estuda-primary/20 px-4 py-1 rounded-full mb-2">
                                        <span className="text-estuda-primary font-black uppercase" style={{ fontSize: 10, letterSpacing: '0.12em' }}>{perfil.turma || 'Turmas Normais'}</span>
                                    </div>
                                    <h2 className="text-2xl font-black">Grade Semanal</h2>
                                    <p className="opacity-50 font-semibold mt-1" style={{ fontSize: 10 }}>{perfil.turno || 'MANHÃ'} · {perfil.curso || 'DIREITO'} · arraste para o lado →</p>
                                </div>
                                {isAdmin && (
                                    <button
                                        onClick={() => setShowScheduleForm(true)}
                                        className="bg-estuda-primary text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 hover:scale-105 active:scale-95 transition-all shadow-lg"
                                    >
                                        <Plus size={20} /> Adicionar Aula
                                    </button>
                                )}
                            </div>

                            {schedule.length === 0 ? (
                                <div className="bg-estuda-surface/40 border-2 border-dashed border-estuda-primary/10 rounded-[2rem] p-12 text-center">
                                    <Calendar size={48} className="opacity-10 mx-auto mb-4" />
                                    <p className="text-sm font-bold opacity-40 uppercase tracking-widest">Nenhuma aula cadastrada</p>
                                    <button onClick={() => setShowScheduleForm(true)} className="mt-4 text-estuda-primary font-black text-xs hover:underline uppercase">Montar minha grade agora</button>
                                </div>
                            ) : (
                                <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch', paddingBottom: 12 }}>
                                    <div style={{ display: 'flex', gap: 10, minWidth: 'max-content', padding: '4px 4px 8px' }}>
                                        {days.map((day) => (
                                            <div key={day} style={{ width: 180, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
                                                <div className="bg-estuda-primary/10 rounded-2xl p-3 border border-estuda-primary/20 text-center">
                                                    <p style={{ fontWeight: 900, fontSize: 14, color: 'white', margin: 0 }}>{day}</p>
                                                    <p style={{ fontWeight: 700, fontSize: 10, opacity: 0.4, margin: 0 }}>{dayLabels[day]}</p>
                                                </div>
                                                <div className="flex flex-col gap-2">
                                                    {schedule.filter(s => s.day_of_week === day).map((item) => (
                                                        <div
                                                            key={item.id}
                                                            style={{
                                                                borderRadius: 16,
                                                                background: (item.color || '#4A90E2') + '15',
                                                                border: '1px solid ' + (item.color || '#4A90E2') + '30',
                                                                padding: '12px',
                                                                position: 'relative'
                                                            }}
                                                            className="group transition-all hover:bg-white/5"
                                                        >
                                                            <div className="flex items-center gap-2 mb-2">
                                                                <span style={{ width: 6, height: 6, borderRadius: '50%', background: item.color || '#4A90E2' }}></span>
                                                                <span style={{ fontSize: 9, fontWeight: 900, color: item.color || '#4A90E2' }}>{item.start_time.substring(0, 5)} - {item.end_time.substring(0, 5)}</span>
                                                            </div>
                                                            <p style={{ fontWeight: 900, fontSize: 12, lineHeight: 1.3, color: '#fff', margin: 0 }}>{item.subject_name}</p>
                                                            {item.room && <p style={{ fontWeight: 700, fontSize: 9, color: 'rgba(255,255,255,0.4)', marginTop: 4 }}>{item.room}</p>}

                                                            {isAdmin && (
                                                                <button
                                                                    onClick={async () => {
                                                                        const { error } = await supabase.from('schedule').delete().eq('id', item.id);
                                                                        if (!error) fetchSchedule();
                                                                    }}
                                                                    className="absolute top-2 right-2 p-1 text-red-500/30 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                                                                >
                                                                    <Trash2 size={10} />
                                                                </button>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </section>
                    )
                })()}

                {/* Aba Perfil */}
                {activeTab === 'perfil' && !selectedSubject && (
                    <section className="animate-fade-in flex flex-col gap-6 pb-24">

                        {/* Card do Perfil */}
                        <div className="bg-estuda-surface rounded-[2.5rem] border border-estuda-primary/10 overflow-hidden">
                            {/* Banner */}
                            <div className="h-24 bg-gradient-to-r from-estuda-primary/30 to-blue-600/20 relative"></div>

                            <div className="px-6 pb-6">
                                {/* Avatar + Botão Editar */}
                                <div className="flex items-end justify-between -mt-10 mb-4">
                                    <div className="relative">
                                        {perfilDraft.avatar ? (
                                            <img src={perfilDraft.avatar} alt="avatar" className="w-20 h-20 rounded-3xl border-4 border-estuda-surface object-cover shadow-xl" />
                                        ) : (
                                            <div className="w-20 h-20 rounded-3xl border-4 border-estuda-surface bg-estuda-primary/20 flex items-center justify-center shadow-xl">
                                                <User size={36} className="text-estuda-primary" />
                                            </div>
                                        )}
                                    </div>
                                    <button
                                        onClick={openPerfilForm}
                                        className="flex items-center gap-2 bg-estuda-primary text-white px-5 py-2 rounded-2xl font-black text-xs hover:scale-105 active:scale-95 transition-all shadow-lg"
                                    >
                                        <Settings size={14} /> {perfil.nome ? 'Editar Perfil' : 'Configurar Perfil'}
                                    </button>
                                    <button
                                        onClick={() => setShowAbout(true)}
                                        className="flex items-center gap-2 bg-white/5 text-white/60 px-5 py-2 rounded-2xl font-black text-xs hover:bg-white/10 hover:text-white transition-all border border-white/5"
                                    >
                                        <Sparkles size={14} /> Sobre o Criador
                                    </button>
                                </div>

                                {/* Dados */}
                                {perfil.nome ? (
                                    <div className="flex flex-col gap-1">
                                        <h2 className="text-xl font-black">{perfil.nome}</h2>
                                        <div className="flex flex-wrap gap-2 mt-2">
                                            {perfil.curso && <span className="text-[10px] font-black uppercase tracking-wider bg-estuda-primary/10 text-estuda-primary px-3 py-1 rounded-full border border-estuda-primary/20">{perfil.curso}</span>}
                                            {perfil.periodo && <span className="text-[10px] font-black uppercase tracking-wider bg-white/5 px-3 py-1 rounded-full border border-white/10">{perfil.periodo}º Período</span>}
                                            {perfil.turma && <span className="text-[10px] font-black uppercase tracking-wider bg-white/5 px-3 py-1 rounded-full border border-white/10">Turma {perfil.turma}</span>}
                                            {perfil.turno && <span className="text-[10px] font-black uppercase tracking-wider bg-white/5 px-3 py-1 rounded-full border border-white/10">{perfil.turno}</span>}
                                        </div>
                                    </div>
                                ) : (
                                    <p className="text-sm opacity-40 font-semibold">Clique em "Configurar Perfil" para preencher seus dados.</p>
                                )}
                            </div>
                        </div>

                        {/* Botão Excluir Conta (Auto-exclusão) */}
                        <div className="px-4">
                            <button 
                                onClick={deleteOwnAccount}
                                className="w-full flex items-center justify-center gap-3 p-4 rounded-3xl border border-red-500/20 bg-red-500/5 text-red-500 font-black text-xs uppercase tracking-widest hover:bg-red-500/10 transition-all active:scale-[0.98]"
                            >
                                <Trash2 size={16} /> Excluir Minha Conta
                            </button>
                            <p className="text-[9px] text-center text-white/20 mt-3 font-bold uppercase tracking-tighter">Atenção: A exclusão é imediata e irreversível.</p>
                        </div>

                        {/* Histórico de Quizzes */}
                        <div className="bg-estuda-surface p-6 sm:p-8 rounded-[2.5rem] border border-estuda-primary/10">
                            <h3 className="text-lg font-black mb-5 flex items-center gap-3">
                                <History size={22} className="text-estuda-primary" /> Desempenho nos Quizzes
                            </h3>
                            {quizHistory.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-10 opacity-40 text-center">
                                    <PlayCircle size={40} className="mb-3 opacity-30" />
                                    <p className="text-sm font-bold">Nenhum quiz realizado ainda</p>
                                    <p className="text-xs mt-1">Complete um quiz na aba Estudo para ver seu histórico aqui.</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {Array.from(quizHistory.reduce((acc, item) => {
                                        if (!acc.has(item.subject_id)) acc.set(item.subject_id, item)
                                        return acc
                                    }, new Map()).values()).map(item => {
                                        const pct = item.total_questions > 0 ? Math.round((item.score / item.total_questions) * 100) : 0
                                        const color = pct >= 70 ? 'text-green-400' : pct >= 50 ? 'text-estuda-primary' : 'text-red-400'
                                        return (
                                            <div key={item.id} className="bg-estuda-bg/50 p-5 rounded-3xl border border-estuda-primary/5 flex items-center justify-between">
                                                <div className="overflow-hidden mr-2">
                                                    <p className="text-[10px] font-black uppercase opacity-40 mb-1 truncate">{item.subject_name}</p>
                                                    <p className="text-lg font-bold">{item.score}/{item.total_questions} Acertos</p>
                                                    <p className="text-[9px] opacity-30 font-semibold mt-0.5">{new Date(item.created_at).toLocaleDateString('pt-BR')}</p>
                                                </div>
                                                <div className="text-right shrink-0">
                                                    <p className={`text-2xl font-black ${color}`}>{pct}%</p>
                                                    <p className="text-[10px] font-bold opacity-40">Pontuação</p>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            )}
                        </div>

                        {/* Gestão de Professores — Somente ADM */}
                        {isAdmin && (
                            <div className="bg-estuda-surface p-6 sm:p-8 rounded-[2.5rem] border border-estuda-primary/10 shadow-lg">
                                <div className="flex items-center justify-between mb-6">
                                    <h3 className="text-lg font-black flex items-center gap-3">
                                        <GraduationCap size={22} className="text-estuda-primary" /> Autorizar Professores
                                    </h3>
                                    <button 
                                        onClick={() => setIsManagingProfs(!isManagingProfs)}
                                        className="text-[10px] font-black uppercase tracking-widest text-estuda-primary hover:underline"
                                    >
                                        {isManagingProfs ? 'Fechar' : 'Gerenciar Lista'}
                                    </button>
                                </div>

                                {isManagingProfs ? (
                                    <div className="flex flex-col gap-6 animate-fade-in">
                                        <div className="flex gap-2">
                                            <input 
                                                type="email" 
                                                placeholder="email@professor.com"
                                                value={newAuthEmail}
                                                onChange={e => setNewAuthEmail(e.target.value)}
                                                className="flex-1 bg-estuda-bg border border-estuda-primary/10 rounded-2xl px-4 py-3 text-sm font-bold focus:outline-none focus:border-estuda-primary/60 transition-all text-white placeholder:text-white/20"
                                            />
                                            <button 
                                                onClick={addAuthEmail}
                                                className="bg-estuda-primary text-white px-6 rounded-2xl font-black text-xs hover:scale-105 active:scale-95 transition-all shadow-lg"
                                            >
                                                Autorizar
                                            </button>
                                        </div>

                                        <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                                            {authEmails.length === 0 ? (
                                                <p className="text-[10px] text-center opacity-30 italic py-4 font-bold uppercase tracking-widest">Nenhum e-mail autorizado ainda</p>
                                            ) : (
                                                authEmails.map(item => (
                                                    <div key={item.email} className="flex items-center justify-between bg-estuda-bg/50 p-4 rounded-2xl border border-white/5 group hover:border-estuda-primary/20 transition-all">
                                                        <div className="flex flex-col">
                                                            <span className="text-xs font-bold text-white">{item.email}</span>
                                                            <span className="text-[9px] opacity-30 font-bold uppercase">Adicionado em {new Date(item.created_at).toLocaleDateString()}</span>
                                                        </div>
                                                        <button 
                                                            onClick={() => removeAuthEmail(item.email)}
                                                            className="p-2 text-red-400 opacity-0 group-hover:opacity-100 transition-all hover:bg-red-400/10 rounded-xl"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-4 bg-estuda-bg/50 p-4 rounded-3xl border border-white/5">
                                        <div className="size-12 rounded-2xl bg-estuda-primary/10 flex items-center justify-center text-estuda-primary">
                                            <Users size={24} />
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-xs font-bold">{authEmails.length} Professores Autorizados</p>
                                            <p className="text-[10px] opacity-40 font-medium">Os e-mails nesta lista serão promovidos automaticamente ao se cadastrarem.</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Gestão Global de Usuários — Somente SUPER ADM (Arlei) */}
                        {isSuperAdmin && (
                            <div className="bg-estuda-surface p-6 sm:p-8 rounded-[2.5rem] border border-yellow-500/20 shadow-[0_0_30px_rgba(234,179,8,0.05)]">
                                <div className="flex items-center justify-between mb-6">
                                    <h3 className="text-lg font-black flex items-center gap-3 text-yellow-500">
                                        <Users size={22} /> Gerenciar Todos os Usuários
                                    </h3>
                                    <button 
                                        onClick={() => setIsManagingUsers(!isManagingUsers)}
                                        className="text-[10px] font-black uppercase tracking-widest text-yellow-500 hover:underline"
                                    >
                                        {isManagingUsers ? 'Ocultar Lista' : 'Ver Todos'}
                                    </button>
                                </div>

                                {isManagingUsers ? (
                                    <div className="flex flex-col gap-4 animate-fade-in max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                                        {usersList.length === 0 ? (
                                            <p className="text-[10px] text-center opacity-30 italic py-4 font-bold uppercase tracking-widest text-white/40">Carregando usuários...</p>
                                        ) : (
                                            usersList.map(u => (
                                                <div key={u.id} className="flex items-center justify-between bg-estuda-bg/50 p-4 rounded-2xl border border-white/5 group hover:border-yellow-500/20 transition-all">
                                                    <div className="flex flex-col min-w-0">
                                                        <span className="text-xs font-black text-white truncate">{u.name}</span>
                                                        <span className="text-[10px] font-bold text-white/40 truncate">{u.email}</span>
                                                        <div className="flex items-center gap-2 mt-1">
                                                            <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full ${u.role === 'admin' ? 'bg-red-500/20 text-red-400' : u.role === 'professor' ? 'bg-blue-500/20 text-blue-400' : 'bg-green-500/20 text-green-400'}`}>
                                                                {u.role}
                                                            </span>
                                                            <span className="text-[8px] opacity-20 font-bold text-white">Criado em {new Date(u.created_at).toLocaleDateString()}</span>
                                                        </div>
                                                    </div>
                                                    {u.email !== 'arlei85@hotmail.com' && (
                                                        <button 
                                                            onClick={() => deleteUser(u.id, u.email)}
                                                            className="p-2 text-red-400 opacity-40 group-hover:opacity-100 transition-all hover:bg-red-400/10 rounded-xl"
                                                            title="Excluir Usuário"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    )}
                                                </div>
                                            ))
                                        )}
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-4 bg-estuda-bg/30 p-4 rounded-3xl border border-white/5 opacity-60">
                                        <div className="size-12 rounded-2xl bg-yellow-500/10 flex items-center justify-center text-yellow-500">
                                            <Users size={24} />
                                        </div>
                                        <div className="flex-1 text-xs">
                                            <p className="font-bold text-white">Painel de Controle de Usuários</p>
                                            <p className="opacity-60 text-white">Visualize, filtre e gerencie permanentemente todos os cadastros do app.</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </section>
                )}



            </main>

            {/* Modal Gerenciar Carrossel — somente ADM */}
            {showCarouselManager && isAdmin && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowCarouselManager(false)}></div>
                    <div className="bg-estuda-surface border border-estuda-primary/20 p-6 sm:p-8 rounded-[2.5rem] shadow-2xl w-full max-w-md relative z-10 animate-fade-in flex flex-col gap-6" style={{ maxHeight: '90vh', overflowY: 'auto' }}>
                        <h3 className="text-xl font-black text-white flex items-center gap-2">
                            <Settings size={22} className="text-yellow-400" /> Gerenciar Slides
                        </h3>

                        {/* List of current slides */}
                        <div className="flex flex-col gap-2">
                            {carouselSlides.map((slide, idx) => (
                                <div key={slide.id || idx} className="flex items-center gap-3 p-3 rounded-2xl bg-estuda-bg/50 border border-estuda-primary/10 group">
                                    <img src={slide.url} className="size-10 rounded-xl object-cover shrink-0" alt="" />
                                    <span className="flex-1 text-xs font-bold truncate opacity-60">{slide.caption || slide.url}</span>
                                    <button
                                        onClick={async () => {
                                            if (!slide.id) return;
                                            const { error } = await supabase.from('carousel_images').delete().eq('id', slide.id);
                                            if (!error) fetchCarouselImages();
                                        }}
                                        className="p-1.5 text-red-500/40 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            ))}
                        </div>

                        {/* Add new slide */}
                        <div className="flex flex-col gap-3 pt-4 border-t border-estuda-primary/10">
                            <label className="text-xs font-black uppercase tracking-widest opacity-60">URL da Imagem</label>
                            <input
                                type="url"
                                placeholder="https://images.unsplash.com/..."
                                value={newSlideUrl}
                                onChange={e => setNewSlideUrl(e.target.value)}
                                className="bg-estuda-bg border border-estuda-primary/10 rounded-2xl px-4 py-3 text-sm font-medium focus:outline-none focus:border-estuda-primary/50 text-white placeholder:text-white/20"
                            />
                            <label className="text-xs font-black uppercase tracking-widest opacity-60">Legenda (título do slide)</label>
                            <input
                                type="text"
                                placeholder="Ex: Bons estudos!"
                                value={newSlideCaption}
                                onChange={e => setNewSlideCaption(e.target.value)}
                                className="bg-estuda-bg border border-estuda-primary/10 rounded-2xl px-4 py-3 text-sm font-medium focus:outline-none focus:border-estuda-primary/50 text-white placeholder:text-white/20"
                            />
                            <button
                                onClick={async () => {
                                    if (!newSlideUrl.trim()) return;
                                    const { error } = await supabase.from('carousel_images').insert({
                                        url: newSlideUrl.trim(),
                                        caption: newSlideCaption.trim(),
                                        display_order: carouselSlides.length
                                    });
                                    if (!error) {
                                        setNewSlideUrl('');
                                        setNewSlideCaption('');
                                        fetchCarouselImages();
                                    }
                                }}
                                disabled={!newSlideUrl.trim()}
                                className="bg-estuda-primary text-white py-3 rounded-2xl font-black text-sm hover:scale-105 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                                + Adicionar Slide
                            </button>
                        </div>

                        <button onClick={() => setShowCarouselManager(false)} className="text-xs font-bold opacity-40 hover:opacity-70 text-center">Fechar</button>
                    </div>
                </div>
            )}

            {/* Floating Bottom Nav */}
            <nav className="fixed bottom-6 left-4 right-4 max-w-sm mx-auto bg-estuda-surface/80 backdrop-blur-2xl rounded-full shadow-2xl border border-white/5 p-1 flex items-center z-50 animate-fade-in shadow-black/20 px-1">
                {[
                    { id: 'estudo', icon: GraduationCap, label: 'Estudo' },
                    { id: 'provas', icon: FileQuestion, label: 'Provas' },
                    { id: 'grade', icon: Calendar, label: 'Grade' },
                    { id: 'perfil', icon: User, label: 'Perfil' },
                ].map((item) => (
                    <button
                        key={item.id}
                        onClick={() => { setActiveTab(item.id); setSelectedSubject(null); setQuizMode(false); }}
                        className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 rounded-full transition-all ${activeTab === item.id ? 'bg-estuda-primary text-white shadow-lg' : 'text-estuda-secondary hover:bg-estuda-primary/5'}`}
                    >
                        <item.icon size={16} />
                        <span className="text-[7px] font-black uppercase tracking-tighter text-center">{item.label}</span>
                    </button>
                ))}
            </nav>

            {/* MODAIS (Movidos para fora para evitar problemas de stacking context) */}

            {/* Modal Popover Adicionar Prova */}
            {showExamForm && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={() => setShowExamForm(false)}></div>
                    <div className="bg-estuda-surface border border-estuda-primary/20 p-6 sm:p-8 rounded-[2.5rem] shadow-2xl w-full max-w-md relative z-10 animate-fade-in flex flex-col overflow-y-auto" style={{ maxHeight: '90vh' }}>
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
                                <FileQuestion size={24} className="text-estuda-primary" /> Nova Prova
                            </h3>
                            <button type="button" onClick={() => setShowExamForm(false)} className="p-2 rounded-xl hover:bg-white/5 opacity-50 hover:opacity-100 transition-all font-bold text-sm text-white">✕</button>
                        </div>

                        <form onSubmit={handleAddExam} className="flex flex-col gap-4">
                            {/* Título */}
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-widest opacity-50 mb-1.5 pl-1">Título da Prova *</label>
                                <div className="relative group">
                                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 group-focus-within:text-estuda-primary transition-colors">
                                        <FileText size={18} />
                                    </div>
                                    <input
                                        required
                                        type="text"
                                        placeholder="Ex: P1 — Prova do 1º Bimestre"
                                        value={newExam.title}
                                        onChange={e => setNewExam({ ...newExam, title: e.target.value })}
                                        className="w-full bg-estuda-bg border border-estuda-primary/10 rounded-2xl pl-12 pr-4 py-3 text-sm font-bold focus:outline-none focus:border-estuda-primary/50 transition-colors placeholder:text-white/20 text-white"
                                    />
                                </div>
                            </div>

                            {/* Matéria */}
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-widest opacity-50 mb-1.5 pl-1">Nome da Matéria *</label>
                                <div className="relative group">
                                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 group-focus-within:text-estuda-primary transition-colors">
                                        <BookOpen size={18} />
                                    </div>
                                    <input
                                        required
                                        type="text"
                                        placeholder="Ex: Direito do Trabalho"
                                        value={newExam.subject}
                                        onChange={e => setNewExam({ ...newExam, subject: e.target.value })}
                                        className="w-full bg-estuda-bg border border-estuda-primary/10 rounded-2xl pl-12 pr-4 py-3 text-sm font-bold focus:outline-none focus:border-estuda-primary/50 transition-colors placeholder:text-white/20 text-white"
                                    />
                                </div>
                            </div>

                            {/* O que vai cair */}
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-widest opacity-50 mb-1.5 pl-1">O que vai cair na prova</label>
                                <div className="relative group">
                                    <div className="absolute left-4 top-4 text-white/30 group-focus-within:text-estuda-primary transition-colors">
                                        <MessageSquare size={18} />
                                    </div>
                                    <textarea
                                        placeholder="Ex: Contratos de Trabalho (arts. 2–11 CLT), Caps. 1 a 4..."
                                        value={newExam.subtitle}
                                        onChange={e => setNewExam({ ...newExam, subtitle: e.target.value })}
                                        className="w-full bg-estuda-bg border border-estuda-primary/10 rounded-2xl pl-12 pr-4 py-3 text-sm font-bold focus:outline-none focus:border-estuda-primary/50 transition-colors placeholder:text-white/20 text-white min-h-[100px] resize-y"
                                    />
                                </div>
                            </div>

                            {/* Data e Hora lado a lado */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest opacity-50 mb-1.5 pl-1">Data *</label>
                                    <div className="relative group">
                                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 group-focus-within:text-estuda-primary transition-colors pointer-events-none">
                                            <Calendar size={18} />
                                        </div>
                                        <input
                                            required
                                            type="date"
                                            value={newExam.date}
                                            onChange={e => setNewExam({ ...newExam, date: e.target.value })}
                                            className="w-full bg-estuda-bg border border-estuda-primary/10 rounded-2xl pl-12 pr-4 py-3 text-sm font-bold focus:outline-none focus:border-estuda-primary/50 transition-colors text-white [color-scheme:dark]"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest opacity-50 mb-1.5 pl-1">Hora *</label>
                                    <div className="relative group">
                                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 group-focus-within:text-estuda-primary transition-colors pointer-events-none">
                                            <Clock size={18} />
                                        </div>
                                        <input
                                            required
                                            type="time"
                                            value={newExam.time}
                                            onChange={e => setNewExam({ ...newExam, time: e.target.value })}
                                            className="w-full bg-estuda-bg border border-estuda-primary/10 rounded-2xl pl-12 pr-4 py-3 text-sm font-bold focus:outline-none focus:border-estuda-primary/50 transition-colors text-white [color-scheme:dark]"
                                        />
                                    </div>
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

            {/* Modal Adicionar Matéria */}
            {showSubjectForm && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={() => setShowSubjectForm(false)}></div>
                    <div className="bg-estuda-surface border border-estuda-primary/20 p-6 sm:p-8 rounded-[2.5rem] shadow-2xl w-full max-w-sm relative z-10 animate-fade-in flex flex-col overflow-y-auto" style={{ maxHeight: '90vh' }}>
                        <h3 className="text-xl sm:text-2xl font-black mb-6 text-white flex items-center gap-2">
                            <Plus size={24} className="text-estuda-primary" /> Nova Matéria
                        </h3>

                        <form onSubmit={handleAddSubjectSubmit} className="flex flex-col gap-6">
                            <div>
                                <label className="block text-xs font-black uppercase tracking-widest opacity-60 mb-2 pl-2">Nome da Disciplina</label>
                                <div className="relative group">
                                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 group-focus-within:text-estuda-primary transition-colors">
                                        <BookOpen size={18} />
                                    </div>
                                    <input
                                        required
                                        type="text"
                                        placeholder="Ex: Direito Penal Especial"
                                        value={newSubjectName}
                                        onChange={e => setNewSubjectName(e.target.value)}
                                        className="w-full bg-estuda-bg border border-estuda-primary/10 rounded-2xl pl-12 pr-4 py-4 text-sm font-bold focus:outline-none focus:border-estuda-primary/50 transition-colors placeholder:text-white/20 text-white"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-black uppercase tracking-widest opacity-60 mb-3 pl-2">Ícone Temático</label>
                                <div className="grid grid-cols-4 gap-3 bg-estuda-bg/50 p-4 rounded-3xl border border-estuda-primary/5">
                                    {SUBJECT_ICONS.map(icon => (
                                        <button
                                            key={icon}
                                            type="button"
                                            onClick={() => setNewSubjectIcon(icon)}
                                            className={`text-2xl sm:text-3xl p-2 rounded-2xl flex items-center justify-center transition-all ${newSubjectIcon === icon ? 'bg-estuda-primary/20 border-2 border-estuda-primary shadow-inner scale-110' : 'border-2 border-transparent hover:bg-estuda-primary/10 hover:scale-105 opacity-70 hover:opacity-100'}`}
                                        >
                                            {icon}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="flex gap-4 mt-2 pt-6 border-t border-estuda-primary/10">
                                <button
                                    type="button"
                                    onClick={() => setShowSubjectForm(false)}
                                    className="flex-1 py-3 sm:py-4 rounded-2xl font-black transition-colors hover:bg-white/5 border border-white/5 text-xs sm:text-sm"
                                >
                                    CANCELAR
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 py-3 sm:py-4 rounded-2xl font-black bg-estuda-primary text-white hover:scale-105 active:scale-95 transition-all shadow-xl text-xs sm:text-sm"
                                >
                                    CRIAR
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal de Perfil do Aluno */}
            {showPerfilForm && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(12px)' }}>
                    <div className="bg-estuda-surface w-full max-w-md rounded-[2rem] border border-white/10 shadow-2xl p-6 flex flex-col gap-5 overflow-y-auto" style={{ maxHeight: '90vh' }}>
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-black text-white flex items-center gap-2 uppercase tracking-tight">
                                <User size={20} className="text-estuda-primary" /> Meu Perfil
                            </h3>
                            <button onClick={() => setShowPerfilForm(false)} className="p-2 rounded-xl hover:bg-white/5 opacity-50 hover:opacity-100 transition-all text-sm font-bold">✕</button>
                        </div>

                        <div className="flex flex-col items-center gap-2">
                            <label className="cursor-pointer group relative">
                                {perfilDraft.avatar ? (
                                    <img src={perfilDraft.avatar} alt="avatar" className="w-24 h-24 rounded-3xl object-cover border-4 border-estuda-primary/30 shadow-lg" />
                                ) : (
                                    <div className="w-24 h-24 rounded-3xl bg-estuda-primary/15 border-2 border-dashed border-estuda-primary/30 flex flex-col items-center justify-center">
                                        <User size={32} className="text-estuda-primary/60" />
                                        <span className="text-[9px] font-bold opacity-50 mt-1">FOTO</span>
                                    </div>
                                )}
                                <div className="absolute -bottom-1 -right-1 bg-estuda-primary rounded-xl p-1.5 shadow-lg">
                                    <Upload size={12} className="text-white" />
                                </div>
                                <input type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
                            </label>
                            <p className="text-[10px] opacity-40 font-semibold">Toque para adicionar foto</p>
                        </div>

                        <div className="flex flex-col gap-3">
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-widest opacity-50 mb-1.5 pl-1">Nome Completo</label>
                                <div className="relative group">
                                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 group-focus-within:text-estuda-primary transition-colors">
                                        <User size={18} />
                                    </div>
                                    <input
                                        type="text" placeholder="Seu nome completo"
                                        value={perfilDraft.nome}
                                        onChange={e => setPerfilDraft(p => ({ ...p, nome: e.target.value }))}
                                        className="w-full bg-estuda-bg border border-estuda-primary/10 rounded-2xl pl-12 pr-4 py-3 text-sm font-bold focus:outline-none focus:border-estuda-primary/50 transition-colors text-white placeholder:text-white/20"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-widest opacity-50 mb-1.5 pl-1">Curso</label>
                                <div className="relative group">
                                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 group-focus-within:text-estuda-primary transition-colors">
                                        <GraduationCap size={18} />
                                    </div>
                                    <input
                                        type="text" placeholder="Ex: Direito"
                                        value={perfilDraft.curso}
                                        onChange={e => setPerfilDraft(p => ({ ...p, curso: e.target.value }))}
                                        className="w-full bg-estuda-bg border border-estuda-primary/10 rounded-2xl pl-12 pr-4 py-3 text-sm font-bold focus:outline-none focus:border-estuda-primary/50 transition-colors text-white placeholder:text-white/20"
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest opacity-50 mb-1.5 pl-1">Período</label>
                                    <select
                                        value={perfilDraft.periodo}
                                        onChange={e => setPerfilDraft(p => ({ ...p, periodo: e.target.value }))}
                                        className="w-full bg-estuda-bg border border-estuda-primary/10 rounded-2xl px-4 py-3 text-sm font-semibold focus:outline-none focus:border-estuda-primary/50 transition-colors"
                                    >
                                        <option value="">--</option>
                                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => <option key={n} value={n}>{n}º</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest opacity-50 mb-1.5 pl-1">Turno</label>
                                    <select
                                        value={perfilDraft.turno}
                                        onChange={e => setPerfilDraft(p => ({ ...p, turno: e.target.value }))}
                                        className="w-full bg-estuda-bg border border-estuda-primary/10 rounded-2xl px-4 py-3 text-sm font-semibold focus:outline-none focus:border-estuda-primary/50 transition-colors"
                                    >
                                        <option value="">--</option>
                                        <option value="Manhã">Manhã</option>
                                        <option value="Tarde">Tarde</option>
                                        <option value="Noite">Noite</option>
                                        <option value="Integral">Integral</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-widest opacity-50 mb-1.5 pl-1">Turma</label>
                                <div className="relative group">
                                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 group-focus-within:text-estuda-primary transition-colors">
                                        <Layers size={18} />
                                    </div>
                                    <input
                                        type="text" placeholder="Ex: DIR-001 ou Turmas Normais"
                                        value={perfilDraft.turma}
                                        onChange={e => setPerfilDraft(p => ({ ...p, turma: e.target.value }))}
                                        className="w-full bg-estuda-bg border border-estuda-primary/10 rounded-2xl pl-12 pr-4 py-3 text-sm font-bold focus:outline-none focus:border-estuda-primary/50 transition-colors text-white"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-3 pt-2 border-t border-white/5">
                            <button
                                type="button" onClick={() => setShowPerfilForm(false)}
                                className="flex-1 py-3.5 rounded-2xl font-black text-sm border border-white/10 hover:bg-white/5 transition-colors"
                            >CANCELAR</button>
                            <button
                                type="button" onClick={handleSavePerfil}
                                className="flex-1 py-3.5 rounded-2xl font-black text-sm bg-estuda-primary text-white hover:scale-105 active:scale-95 transition-all shadow-xl"
                            >SALVAR</button>
                        </div>
                    </div>
                </div>
            )}
            {/* Modal Adicionar Aula à Grade */}
            {showScheduleForm && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={() => setShowScheduleForm(false)}></div>
                    <div className="bg-estuda-surface border border-estuda-primary/20 p-6 sm:p-8 rounded-[2.5rem] shadow-2xl w-full max-w-md relative z-10 animate-fade-in flex flex-col overflow-y-auto" style={{ maxHeight: '90vh' }}>
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
                                <Calendar size={24} className="text-estuda-primary" /> Nova Aula
                            </h3>
                            <button onClick={() => setShowScheduleForm(false)} className="p-2 rounded-xl hover:bg-white/5 opacity-50 hover:opacity-100 transition-all text-white font-bold text-sm">✕</button>
                        </div>

                        <form onSubmit={handleAddScheduleItem} className="flex flex-col gap-4">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest opacity-50 mb-1.5 pl-1">Dia da Semana</label>
                                    <select
                                        value={newScheduleItem.day_of_week}
                                        onChange={e => setNewScheduleItem({ ...newScheduleItem, day_of_week: e.target.value })}
                                        className="w-full bg-estuda-bg border border-estuda-primary/10 rounded-2xl px-4 py-3 text-sm font-bold text-white focus:outline-none focus:border-estuda-primary/50"
                                    >
                                        <option value="SEG">Segunda</option>
                                        <option value="TER">Terça</option>
                                        <option value="QUA">Quarta</option>
                                        <option value="QUI">Quinta</option>
                                        <option value="SEX">Sexta</option>
                                        <option value="SÁB">Sábado</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest opacity-50 mb-1.5 pl-1">Cor</label>
                                    <div className="flex gap-2 bg-estuda-bg p-2 rounded-2xl border border-estuda-primary/10 justify-between">
                                        {['#EAB308', '#3B82F6', '#A855F7', '#22C55E', '#F97316'].map(c => (
                                            <button
                                                key={c} type="button"
                                                onClick={() => setNewScheduleItem({ ...newScheduleItem, color: c })}
                                                style={{ background: c }}
                                                className={`size-6 rounded-full transition-all ${newScheduleItem.color === c ? 'scale-125 border-2 border-white' : 'opacity-40 hover:opacity-100'}`}
                                            />
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-widest opacity-50 mb-1.5 pl-1">Matéria / Disciplina</label>
                                <input
                                    required type="text" placeholder="Ex: Direito Civil II"
                                    value={newScheduleItem.subject_name}
                                    onChange={e => setNewScheduleItem({ ...newScheduleItem, subject_name: e.target.value })}
                                    className="w-full bg-estuda-bg border border-estuda-primary/10 rounded-2xl px-4 py-3 text-sm font-bold text-white focus:outline-none focus:border-estuda-primary/50"
                                />
                            </div>

                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-widest opacity-50 mb-1.5 pl-1">Professor ou Sala</label>
                                <input
                                    type="text" placeholder="Ex: Prof. Wilian - Sala 202"
                                    value={newScheduleItem.prof}
                                    onChange={e => setNewScheduleItem({ ...newScheduleItem, prof: e.target.value })}
                                    className="w-full bg-estuda-bg border border-estuda-primary/10 rounded-2xl px-4 py-3 text-sm font-bold text-white focus:outline-none focus:border-estuda-primary/50"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest opacity-50 mb-1.5 pl-1">Início</label>
                                    <input
                                        type="time" value={newScheduleItem.start_time}
                                        onChange={e => setNewScheduleItem({ ...newScheduleItem, start_time: e.target.value })}
                                        className="w-full bg-estuda-bg border border-estuda-primary/10 rounded-2xl px-4 py-3 text-sm font-bold text-white focus:outline-none focus:border-estuda-primary/50"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest opacity-50 mb-1.5 pl-1">Fim</label>
                                    <input
                                        type="time" value={newScheduleItem.end_time}
                                        onChange={e => setNewScheduleItem({ ...newScheduleItem, end_time: e.target.value })}
                                        className="w-full bg-estuda-bg border border-estuda-primary/10 rounded-2xl px-4 py-3 text-sm font-bold text-white focus:outline-none focus:border-estuda-primary/50"
                                    />
                                </div>
                            </div>

                            <div className="flex gap-3 pt-4 border-t border-white/5">
                                <button type="button" onClick={() => setShowScheduleForm(false)} className="flex-1 py-3.5 rounded-2xl font-black text-xs border border-white/10 hover:bg-white/5">CANCELAR</button>
                                <button type="submit" disabled={loading} className="flex-1 py-3.5 rounded-2xl font-black text-xs bg-estuda-primary text-white hover:scale-105 active:scale-95 shadow-xl flex items-center justify-center gap-2">
                                    {loading ? <Loader2 className="animate-spin" size={16} /> : 'SALVAR AULA'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal de Seleção de Documento para o Quiz */}
            {showDocSelect && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={() => setShowDocSelect(false)}></div>
                    <div className="bg-estuda-surface border border-estuda-primary/20 p-6 sm:p-8 rounded-[2.5rem] shadow-2xl w-full max-w-md relative z-10 animate-fade-in flex flex-col">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
                                <FileQuestion size={24} className="text-estuda-primary" /> Qual Material?
                            </h3>
                            <button onClick={() => setShowDocSelect(false)} className="p-2 rounded-xl hover:bg-white/5 opacity-50 hover:opacity-100 transition-all text-white font-bold text-sm">✕</button>
                        </div>
                        <p className="text-sm text-white/70 mb-6 font-medium leading-relaxed">Esta matéria tem mais de uma fonte de estudo.<br/>Sobre qual delas você deseja testar seus conhecimentos agora?</p>
                        
                        <div className="flex flex-col gap-3 mb-8 max-h-[40vh] overflow-y-auto custom-scrollbar pr-2">
                            {files.map(file => (
                                <button
                                    key={file.id}
                                    onClick={() => setSelectedDocId(file.id)}
                                    className={`p-4 rounded-2xl border text-left flex items-center gap-4 transition-all ${selectedDocId === file.id ? 'bg-estuda-primary/20 border-estuda-primary text-white shadow-lg scale-[1.02]' : 'bg-estuda-bg border-white/5 text-white/70 hover:bg-white/5 hover:border-white/20'}`}
                                >
                                    <div className={`p-2 rounded-lg ${selectedDocId === file.id ? 'bg-estuda-primary text-white' : 'bg-white/10'}`}>
                                        <FileText size={20} />
                                    </div>
                                    <div className="flex-1 overflow-hidden">
                                        <p className="font-bold text-sm truncate">{file.name}</p>
                                    </div>
                                    <div className={`size-5 rounded-full border-2 flex items-center justify-center ${selectedDocId === file.id ? 'border-estuda-primary bg-estuda-primary' : 'border-white/20'}`}>
                                        {selectedDocId === file.id && <div className="size-2 bg-white rounded-full"></div>}
                                    </div>
                                </button>
                            ))}
                        </div>

                        <div className="flex gap-3 pt-4 border-t border-white/5">
                            <button onClick={() => setShowDocSelect(false)} className="flex-1 py-3.5 rounded-2xl font-black text-xs border border-white/10 hover:bg-white/5 transition-colors">CANCELAR</button>
                             <button 
                                onClick={() => executePendingAction(pendingAction, selectedDocId)} 
                                disabled={(!selectedDocId && files.length > 1) || loading} 
                                className={`flex-1 py-3.5 rounded-2xl font-black text-xs shadow-xl flex items-center justify-center gap-2 transition-all ${selectedDocId || files.length === 1 ? 'bg-estuda-primary text-white hover:scale-105 active:scale-95' : 'bg-estuda-primary/20 text-white/40 cursor-not-allowed border-none'}`}
                            >
                                {loading ? <Loader2 className="animate-spin" size={16} /> : 'INICIAR'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Sobre o Criador */}
            {showAbout && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-6 pointer-events-auto">
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setShowAbout(false)} />
                    <div className="bg-estuda-surface border border-estuda-primary/20 w-full max-w-sm rounded-[3rem] p-8 flex flex-col items-center relative z-20 animate-scale-up shadow-[0_0_50px_rgba(74,144,226,0.15)]">
                        <div className="relative mb-6">
                            <div className="absolute inset-0 bg-estuda-primary blur-2xl opacity-20 rounded-full" />
                            <img 
                                src="https://www.gravatar.com/avatar/240cf86f87d7b1a646c1097e3a9856ad?s=400&d=mp" 
                                alt="Arlei Silvério" 
                                className="size-32 rounded-[2.5rem] border-4 border-estuda-surface object-cover relative z-10 shadow-2xl shadow-black/50"
                            />
                        </div>
                        
                        <h3 className="text-2xl font-black text-white text-center">Arlei Silvério</h3>
                        <p className="text-estuda-primary font-black text-[10px] uppercase tracking-[0.3em] mt-1">Idealizador & Desenvolvedor</p>
                        
                        <div className="w-full h-px bg-white/5 my-6" />
                        
                        <div className="flex flex-col gap-4 w-full">
                            <a href="mailto:arlei85@hotmail.com" className="flex items-center gap-4 bg-white/5 p-4 rounded-2xl border border-white/5 hover:border-estuda-primary/30 hover:bg-white/10 transition-all group">
                                <div className="size-10 rounded-xl bg-estuda-primary/10 flex items-center justify-center text-estuda-primary group-hover:scale-110 transition-transform">
                                    <Mail size={20} />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-widest opacity-40">E-mail</p>
                                    <p className="text-sm font-bold text-white">arlei85@hotmail.com</p>
                                </div>
                            </a>
                        </div>
                        
                        <p className="text-center text-[11px] leading-relaxed text-white/40 font-medium mt-8">
                            "Focado em transformar a educação através da tecnologia e inteligência artificial."
                        </p>

                        <button 
                            onClick={() => setShowAbout(false)}
                            className="mt-10 w-full py-4 rounded-2xl bg-white/5 border border-white/10 font-black text-xs uppercase tracking-widest hover:bg-white/10 transition-colors"
                        >
                            Fechar
                        </button>
                    </div>
                </div>
            )}

            <style>{`
                @keyframes scale-up {
                    from { opacity: 0; transform: scale(0.95); }
                    to { opacity: 1; transform: scale(1); }
                }
                .animate-scale-up {
                    animation: scale-up 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
                }
            `}</style>
        </div>
    )
}

export default App
