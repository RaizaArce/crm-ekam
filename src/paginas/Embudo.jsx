import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRightLeft, Briefcase, Clock } from 'lucide-react';
import { supabase } from '../supabase.js';
import { useAuth } from '../auth.jsx';
import { ETAPAS, datosCambioEtapa, diasDesde, mensajeError, useCatalogos } from '../catalogos.js';
import Cabecera from '../componentes/Cabecera.jsx';
import CambiarEtapa from '../componentes/CambiarEtapa.jsx';
import Iniciales from '../componentes/Iniciales.jsx';

// Cerrados y perdidos solo de los últimos 30 días: el tablero es para el trabajo en curso.
export const DIAS_CERRADOS = 30;

// Reparte los interesados en una lista por etapa, en el orden del embudo.
export function agruparPorEtapa(filas) {
    const grupos = Object.fromEntries(Object.keys(ETAPAS).map((e) => [e, []]));
    for (const f of filas) grupos[f.etapa]?.push(f);
    return grupos;
}

function textoDiasCorto(desde) {
    const dias = diasDesde(desde);
    return dias === 0 ? 'hoy' : `${dias} d`;
}

// Prototipos 05 y D2 (RF14, RF15): una columna por etapa; se arrastra en la computadora
// y se mueve con el botón en el celular.
export default function Embudo() {
    const { perfil } = useAuth();
    const catalogos = useCatalogos();
    const [filas, setFilas] = useState(null);
    const [consultora, setConsultora] = useState('');
    const [mover, setMover] = useState(null); // { interesado, etapa }
    const [arrastrando, setArrastrando] = useState(null);
    const [sobre, setSobre] = useState('');
    const [mensaje, setMensaje] = useState({ tipo: '', texto: '' });
    const columnas = useRef({});

    const cargar = useCallback(async () => {
        const desde = new Date(Date.now() - DIAS_CERRADOS * 86400000).toISOString();
        let consulta = supabase
            .from('interesados')
            .select('id, nombre, empresa, solucion, etapa, etapa_desde, motivo_perdida, consultora_id')
            .or(`etapa.not.in.(cerrado,perdido),etapa_desde.gte.${desde}`)
            .order('etapa_desde', { ascending: true });
        if (consultora === 'sin-asignar') consulta = consulta.is('consultora_id', null);
        else if (consultora) consulta = consulta.eq('consultora_id', consultora);
        const { data, error } = await consulta;
        if (error) return setMensaje({ tipo: 'error', texto: 'No se pudo cargar el embudo. Revisa tu conexión e inténtalo de nuevo.' });
        setFilas(data);
    }, [consultora]);

    useEffect(() => { cargar(); }, [cargar]);

    const nombreDe = (lista, codigo) => lista.find((x) => x.codigo === codigo)?.nombre ?? '';
    const usuario = (id) => catalogos.usuarios.find((u) => u.id === id)?.nombre ?? '';

    async function soltar(etapa) {
        const interesado = arrastrando;
        setArrastrando(null);
        setSobre('');
        if (!interesado || interesado.etapa === etapa) return;
        // Perdido necesita motivo: se pide en la hoja.
        if (etapa === 'perdido') return setMover({ interesado, etapa });
        const { datos } = datosCambioEtapa(etapa);
        const antes = filas;
        setFilas(filas.map((f) => (f.id === interesado.id ? { ...f, ...datos, etapa_desde: new Date().toISOString() } : f)));
        const { error } = await supabase.from('interesados').update(datos).eq('id', interesado.id);
        if (error) {
            setFilas(antes);
            return setMensaje({ tipo: 'error', texto: mensajeError(error) });
        }
        setMensaje({ tipo: 'ok', texto: `${interesado.nombre} pasó a ${ETAPAS[etapa]}.` });
    }

    function irAColumna(etapa) {
        columnas.current[etapa]?.scrollIntoView({ behavior: 'smooth', inline: 'start', block: 'nearest' });
    }

    const grupos = agruparPorEtapa(filas ?? []);

    return (
        <section className="pagina pagina-embudo">
            <Cabecera titulo="Embudo de ventas" subtitulo="Arrastra una tarjeta o toca ⇄ para cambiar de etapa" />

            <div className="barra-embudo">
                <label className="filtro">
                    <span>Consultora:</span>
                    <select value={consultora} onChange={(e) => setConsultora(e.target.value)} aria-label="Consultora">
                        <option value="">Todas</option>
                        <option value={perfil.id}>Mis interesados</option>
                        <option value="sin-asignar">Sin asignar</option>
                        {catalogos.usuarios.filter((u) => u.id !== perfil.id).map((u) => (
                            <option key={u.id} value={u.id}>{u.nombre}{u.activo ? '' : ' (inactivo)'}</option>
                        ))}
                    </select>
                </label>
            </div>

            <nav className="chips-etapas" aria-label="Ir a una etapa">
                {Object.entries(ETAPAS).map(([codigo, texto]) => (
                    <button key={codigo} type="button" className={`etapa etapa-${codigo}`} onClick={() => irAColumna(codigo)}>
                        {texto} {grupos[codigo].length}
                    </button>
                ))}
            </nav>

            {mensaje.texto && (
                <p className={`alerta alerta-${mensaje.tipo} alerta-embudo`} role="status">{mensaje.texto}</p>
            )}

            {filas === null ? (
                <div className="cuerpo"><p className="texto-suave">Cargando…</p></div>
            ) : (
                <div className="tablero">
                    {Object.entries(ETAPAS).map(([codigo, texto]) => (
                        <section
                            key={codigo}
                            ref={(el) => { columnas.current[codigo] = el; }}
                            className={`columna${sobre === codigo ? ' columna-sobre' : ''}`}
                            aria-label={`${texto}: ${grupos[codigo].length}`}
                            onDragOver={(e) => { if (arrastrando) { e.preventDefault(); setSobre(codigo); } }}
                            onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setSobre(''); }}
                            onDrop={(e) => { e.preventDefault(); soltar(codigo); }}
                        >
                            <header className="columna-cabecera">
                                <span className={`etapa etapa-${codigo}`}>{texto}</span>
                                <span className="texto-tenue texto-pequeno">{grupos[codigo].length}</span>
                            </header>
                            {(codigo === 'cerrado' || codigo === 'perdido') && (
                                <p className="texto-tenue texto-pequeno columna-nota">Últimos {DIAS_CERRADOS} días</p>
                            )}
                            <ul>
                                {grupos[codigo].map((i) => (
                                    <li
                                        key={i.id}
                                        className={`tarjeta-embudo${arrastrando?.id === i.id ? ' arrastrada' : ''}`}
                                        draggable
                                        onDragStart={(e) => { e.dataTransfer.effectAllowed = 'move'; setArrastrando(i); }}
                                        onDragEnd={() => { setArrastrando(null); setSobre(''); }}
                                    >
                                        <Link to={`/interesados/${i.id}`} className="tarjeta-embudo-enlace">
                                            <strong>{i.nombre}</strong>
                                            {i.empresa && <span className="texto-suave texto-pequeno">{i.empresa}</span>}
                                            {i.solucion && (
                                                <span className="texto-suave texto-pequeno dato-icono">
                                                    <Briefcase size={14} aria-hidden="true" />{nombreDe(catalogos.soluciones, i.solucion)}
                                                </span>
                                            )}
                                            {codigo === 'perdido' && i.motivo_perdida && (
                                                <span className="texto-pequeno motivo-embudo">{i.motivo_perdida}</span>
                                            )}
                                        </Link>
                                        <div className="tarjeta-embudo-pie">
                                            {i.consultora_id
                                                ? <span className="dato-icono texto-pequeno"><Iniciales nombre={usuario(i.consultora_id)} />{usuario(i.consultora_id)}</span>
                                                : <span className="texto-tenue texto-pequeno">Sin asignar</span>}
                                            <span className="dato-icono texto-tenue texto-pequeno" title="Tiempo en esta etapa">
                                                <Clock size={13} aria-hidden="true" />{textoDiasCorto(i.etapa_desde)}
                                            </span>
                                            <button
                                                type="button" className="boton-icono boton-mover"
                                                aria-label={`Mover a ${i.nombre} a otra etapa`}
                                                onClick={() => setMover({ interesado: i, etapa: i.etapa })}
                                            >
                                                <ArrowRightLeft size={16} aria-hidden="true" />
                                            </button>
                                        </div>
                                    </li>
                                ))}
                                {grupos[codigo].length === 0 && <li className="columna-vacia texto-tenue texto-pequeno">Sin interesados</li>}
                            </ul>
                        </section>
                    ))}
                </div>
            )}

            {mover && (
                <CambiarEtapa
                    interesado={mover.interesado}
                    etapaInicial={mover.etapa}
                    alCerrar={() => setMover(null)}
                    alGuardar={(datos) => {
                        setMensaje({ tipo: 'ok', texto: `${mover.interesado.nombre} pasó a ${ETAPAS[datos.etapa]}.` });
                        setMover(null);
                        cargar();
                    }}
                />
            )}
        </section>
    );
}
