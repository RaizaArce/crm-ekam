import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, MapPin, Video } from 'lucide-react';
import { supabase } from '../supabase.js';
import { useAuth } from '../auth.jsx';
import { useCatalogos } from '../catalogos.js';
import { ESTADOS_DEMO, MODALIDADES, claveDia, diasDeLaSemana, inicioSemana, sumarDias, tituloSemana } from '../demos.js';
import Cabecera from '../componentes/Cabecera.jsx';
import Iniciales from '../componentes/Iniciales.jsx';

const LETRAS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

// "Martes 3" (o "martes 3" después de "Hoy · ").
function nombreDia(fecha, mayuscula) {
    const texto = fecha.toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric' }).toLowerCase();
    return mayuscula ? texto.charAt(0).toUpperCase() + texto.slice(1) : texto;
}

function Hora({ valor }) {
    const [hora, ampm] = new Date(valor).toLocaleTimeString('es-PE', { hour: 'numeric', minute: '2-digit' }).split(/\s(.+)/);
    return <div className="demo-hora"><strong>{hora}</strong><span>{ampm}</span></div>;
}

// Prototipo 06 (RF16): agenda semanal de demostraciones, de lunes a domingo.
export default function Agenda() {
    const { perfil } = useAuth();
    const catalogos = useCatalogos();
    const [lunes, setLunes] = useState(() => inicioSemana(new Date()));
    const [consultora, setConsultora] = useState('');
    const [demos, setDemos] = useState(null);
    const [error, setError] = useState('');
    const secciones = useRef({});

    useEffect(() => {
        let cancelado = false;
        setDemos(null);
        let consulta = supabase
            .from('demostraciones')
            .select('id, inicio, modalidad, estado, notas, consultora_id, interesados(id, nombre, empresa)')
            .gte('inicio', lunes.toISOString())
            .lt('inicio', sumarDias(lunes, 7).toISOString())
            .order('inicio');
        if (consultora) consulta = consulta.eq('consultora_id', consultora);
        consulta.then(({ data, error: fallo }) => {
            if (cancelado) return;
            if (fallo) return setError('No se pudo cargar la agenda. Revisa tu conexión e inténtalo de nuevo.');
            setError('');
            setDemos(data);
        });
        return () => { cancelado = true; };
    }, [lunes, consultora]);

    const usuario = (id) => catalogos.usuarios.find((u) => u.id === id)?.nombre ?? '';
    const hoy = claveDia(new Date());
    const dias = diasDeLaSemana(lunes, demos ?? []);
    const programadas = (demos ?? []).filter((d) => d.estado === 'programada').length;
    const esEstaSemana = claveDia(lunes) === claveDia(inicioSemana(new Date()));

    function irADia(clave) {
        secciones.current[clave]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    return (
        <section className="pagina">
            <Cabecera titulo="Agenda de demos" subtitulo={tituloSemana(lunes)}>
                {!esEstaSemana && (
                    <button type="button" className="boton boton-chico" onClick={() => setLunes(inicioSemana(new Date()))}>Hoy</button>
                )}
                <button type="button" className="boton-icono" aria-label="Semana anterior" onClick={() => setLunes(sumarDias(lunes, -7))}>
                    <ChevronLeft size={22} aria-hidden="true" />
                </button>
                <button type="button" className="boton-icono" aria-label="Semana siguiente" onClick={() => setLunes(sumarDias(lunes, 7))}>
                    <ChevronRight size={22} aria-hidden="true" />
                </button>
            </Cabecera>

            <div className="barra-embudo">
                <label className={`filtro${consultora ? ' filtro-activo' : ''}`}>
                    <span>Consultora:</span>
                    <select value={consultora} onChange={(e) => setConsultora(e.target.value)} aria-label="Consultora">
                        <option value="">Todas</option>
                        <option value={perfil.id}>Mis demos</option>
                        {catalogos.usuarios.filter((u) => u.id !== perfil.id).map((u) => (
                            <option key={u.id} value={u.id}>{u.nombre}{u.activo ? '' : ' (inactivo)'}</option>
                        ))}
                    </select>
                </label>
            </div>

            <nav className="semana" aria-label="Días de la semana">
                {dias.map((d, i) => (
                    <button
                        key={d.clave} type="button"
                        className={`dia${d.clave === hoy ? ' dia-hoy' : ''}`}
                        onClick={() => irADia(d.clave)}
                        aria-label={`${d.fecha.toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric' })}: ${d.demos.length} demostraciones`}
                    >
                        <span className="dia-letra">{LETRAS[i]}</span>
                        <span className="dia-numero">{d.fecha.getDate()}</span>
                        <span className="dia-puntos" aria-hidden="true">
                            {d.demos.filter((x) => x.estado !== 'cancelada').slice(0, 3).map((x) => <i key={x.id} />)}
                        </span>
                    </button>
                ))}
            </nav>

            <div className="cuerpo">
                {error && <p className="alerta alerta-error" role="alert">{error}</p>}
                {demos === null && !error && <p className="texto-suave">Cargando…</p>}
                {demos && demos.length === 0 && (
                    <div className="tarjeta aviso-pantalla">
                        <p className="texto-suave">No hay demostraciones esta semana.</p>
                        <p className="texto-suave texto-pequeno">Para agendar una, abre la ficha del interesado y pulsa «Agendar».</p>
                        <Link className="boton" to="/interesados">Ir a Interesados</Link>
                    </div>
                )}
                {demos && demos.length > 0 && (
                    <>
                        <p className="texto-suave texto-pequeno">
                            {programadas} {programadas === 1 ? 'programada' : 'programadas'} · {demos.length} en total
                        </p>
                        {dias.filter((d) => d.demos.length).map((d) => (
                            <section key={d.clave} ref={(el) => { secciones.current[d.clave] = el; }} className="dia-agenda">
                                <h2>
                                    {d.clave === hoy ? 'Hoy · ' : ''}
                                    {nombreDia(d.fecha, d.clave !== hoy)}
                                    <span className="contador-demos">{d.demos.length} {d.demos.length === 1 ? 'demo' : 'demos'}</span>
                                </h2>
                                <ul className="demos-dia">
                                    {d.demos.map((demo) => (
                                        <li key={demo.id} className={`demo-agenda demo-${demo.estado}`}>
                                            <Hora valor={demo.inicio} />
                                            <div className="demo-datos">
                                                <Link to={`/interesados/${demo.interesados?.id}`}><strong>{demo.interesados?.nombre ?? 'Interesado eliminado'}</strong></Link>
                                                {demo.interesados?.empresa && <span className="texto-suave texto-pequeno">{demo.interesados.empresa}</span>}
                                                <span className="demo-chips">
                                                    <span className="chip-modalidad">
                                                        {demo.modalidad === 'presencial' ? <MapPin size={12} aria-hidden="true" /> : <Video size={12} aria-hidden="true" />}
                                                        {MODALIDADES[demo.modalidad]}
                                                    </span>
                                                    <span className={`estado-demo estado-demo-${demo.estado}`}>{ESTADOS_DEMO[demo.estado]}</span>
                                                </span>
                                                {demo.notas && <span className="texto-pequeno texto-largo">{demo.notas}</span>}
                                                <span className="dato-icono texto-pequeno"><Iniciales nombre={usuario(demo.consultora_id)} />{usuario(demo.consultora_id)}</span>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            </section>
                        ))}
                    </>
                )}
            </div>
        </section>
    );
}
