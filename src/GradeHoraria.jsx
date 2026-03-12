// GradeHoraria.jsx — Versão diagnóstica com try/catch inline

export default function GradeHoraria() {
    try {
        return (
            <div style={{ color: 'white', padding: 20, background: '#0a1628', minHeight: 200 }}>
                <h2 style={{ color: '#EAB308', fontSize: 22, fontWeight: 900, marginBottom: 16 }}>
                    Grade de Aulas — Turmas Normais · Manhã DIR
                </h2>

                {/* Bloco 1ª Aula */}
                <AulaBloco titulo="1ª AULA" horario="08:20" aulas={[
                    { dia: 'SEG', disc: 'Direito Societário', prof: 'Wilian Roque Borges', cor: '#EAB308' },
                    { dia: 'TER', disc: 'Dir. Indiv. e Coletivo do Trabalho', prof: 'Rafael Carmezim Nassif', cor: '#3B82F6' },
                    { dia: 'QUA', disc: 'Prática Jurídica em Dir. e Proc. Civil', prof: 'Wilian Roque Borges', cor: '#A855F7' },
                    { dia: 'QUI', disc: 'Agentes Públicos e Resp. Administrativa', prof: 'Paola Nery Ferrari', cor: '#22C55E' },
                    { dia: 'SEX', disc: 'Dir. Indiv. e Coletivo do Trabalho', prof: 'Rafael Carmezim Nassif', cor: '#3B82F6' },
                    { dia: 'SÁB', disc: 'Prática Jurídica em Dir. e Proc. Civil', prof: 'Wilian Roque Borges', cor: '#A855F7' },
                ]} />

                {/* Bloco 2ª Aula */}
                <AulaBloco titulo="2ª AULA" horario="09:10" aulas={[
                    { dia: 'SEG', disc: 'Direito Societário', prof: 'Wilian Roque Borges', cor: '#EAB308' },
                    { dia: 'TER', disc: 'Dir. Indiv. e Coletivo do Trabalho', prof: 'Rafael Carmezim Nassif', cor: '#3B82F6' },
                    { dia: 'QUA', disc: 'Prática Jurídica em Dir. e Proc. Civil', prof: 'Wilian Roque Borges', cor: '#A855F7' },
                    { dia: 'QUI', disc: 'Agentes Públicos e Resp. Administrativa', prof: 'Paola Nery Ferrari', cor: '#22C55E' },
                    { dia: 'SEX', disc: 'Dir. Indiv. e Coletivo do Trabalho', prof: 'Rafael Carmezim Nassif', cor: '#3B82F6' },
                    { dia: 'SÁB', disc: 'Prática Jurídica em Dir. e Proc. Civil', prof: 'Wilian Roque Borges', cor: '#A855F7' },
                ]} />

                {/* Bloco 3ª Aula */}
                <AulaBloco titulo="3ª AULA" horario="10:20" aulas={[
                    { dia: 'SEG', disc: 'Procedimentos nos Tribunais', prof: 'Carolina Belomo de Souza', cor: '#F97316' },
                    { dia: 'TER', disc: 'Teoria Geral Dir. Tributário e Dir. FI', prof: 'Ana Cristina Zadra Valadares', cor: '#EC4899' },
                    { dia: 'QUA', disc: 'Teoria Geral Dir. Tributário e Dir. FI', prof: 'Ana Cristina Zadra Valadares', cor: '#EC4899' },
                    { dia: 'QUI', disc: 'Procedimentos nos Tribunais', prof: 'Carolina Belomo de Souza', cor: '#F97316' },
                    { dia: 'SEX', disc: 'Desenv. Socioemocional e de Carreira', prof: 'Eugenio Pereira de Paula Junior', cor: '#14B8A6' },
                ]} />

                {/* Bloco 4ª Aula */}
                <AulaBloco titulo="4ª AULA" horario="11:10" aulas={[
                    { dia: 'SEG', disc: 'Procedimentos nos Tribunais', prof: 'Carolina Belomo de Souza', cor: '#F97316' },
                    { dia: 'TER', disc: 'Teoria Geral Dir. Tributário e Dir. FI', prof: 'Ana Cristina Zadra Valadares', cor: '#EC4899' },
                    { dia: 'QUA', disc: 'Teoria Geral Dir. Tributário e Dir. FI', prof: 'Ana Cristina Zadra Valadares', cor: '#EC4899' },
                    { dia: 'QUI', disc: 'Procedimentos nos Tribunais', prof: 'Carolina Belomo de Souza', cor: '#F97316' },
                    { dia: 'SEX', disc: 'Desenv. Socioemocional e de Carreira', prof: 'Eugenio Pereira de Paula Junior', cor: '#14B8A6' },
                ]} />
            </div>
        )
    } catch (err) {
        return (
            <div style={{ color: 'red', padding: 20, background: '#1a0a0a' }}>
                <h2>Erro no GradeHoraria:</h2>
                <pre style={{ fontSize: 12, whiteSpace: 'pre-wrap' }}>{String(err)}</pre>
                <pre style={{ fontSize: 10, whiteSpace: 'pre-wrap', opacity: 0.6 }}>{err && err.stack}</pre>
            </div>
        )
    }
}

function AulaBloco({ titulo, horario, aulas }) {
    return (
        <div style={{
            marginBottom: 16,
            borderRadius: 20,
            overflow: 'hidden',
            border: '1px solid rgba(255,255,255,0.07)',
            background: 'rgba(255,255,255,0.04)',
        }}>
            {/* Header */}
            <div style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 16px',
                background: 'rgba(234,179,8,0.08)',
                borderBottom: '1px solid rgba(255,255,255,0.05)',
            }}>
                <span style={{ color: '#EAB308', fontWeight: 900, fontSize: 11, letterSpacing: '0.05em' }}>{titulo}</span>
                <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: 10 }}>·</span>
                <span style={{ color: 'rgba(255,255,255,0.35)', fontWeight: 700, fontSize: 10 }}>{horario}</span>
            </div>

            {/* Grade de cards */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: 8,
                padding: 10,
            }}>
                {aulas.map(function (aula) {
                    return (
                        <div key={aula.dia} style={{
                            borderRadius: 14,
                            padding: '10px 12px',
                            background: aula.cor + '22',
                            border: '1px solid ' + aula.cor + '44',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 4,
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                                <span style={{
                                    width: 6, height: 6, borderRadius: '50%',
                                    background: aula.cor, display: 'inline-block', flexShrink: 0,
                                }}></span>
                                <span style={{ color: 'rgba(255,255,255,0.5)', fontWeight: 900, fontSize: 8, letterSpacing: '0.08em', textTransform: 'uppercase' }}>{aula.dia}</span>
                            </div>
                            <p style={{ fontWeight: 900, fontSize: 10, lineHeight: 1.3, color: '#fff', margin: 0 }}>{aula.disc}</p>
                            <p style={{ fontWeight: 600, fontSize: 8, color: 'rgba(255,255,255,0.4)', lineHeight: 1.3, margin: 0 }}>{aula.prof}</p>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}
