import { useCallback, useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Calendar, EllipsisVertical, Mail, MessageCircle, Pencil, Phone } from 'lucide-react';
import { supabase } from '../supabase.js';
import { useAuth } from '../auth.jsx';
import {
    MEDIOS, PLAZOS, VERSION_POLITICA, diasDesde, fecha, fechaHora, mensajeError, useCatalogos,
} from '../catalogos.js';
import Cabecera from '../componentes/Cabecera.jsx';
import CamposInteresado, { aFechaLocal, datosParaGuardar } from '../componentes/CamposInteresado.jsx';
import Etapa from '../componentes/Etapa.jsx';
import Historial from '../componentes/Historial.jsx';
import Hoja from '../componentes/Hoja.jsx';
import Iniciales from '../componentes/Iniciales.jsx';

function aFormulario(i) {
    return {
        nombre: i.nombre ?? '', empresa: i.empresa ?? '', ruc: i.ruc ?? '', telefono: i.telefono ?? '',
        correo: i.correo ?? '', sector: i.sector ?? '', solucion: i.solucion ?? '',
        medio_contacto: i.medio_contacto, plazo: i.plazo ?? '', necesidad: i.necesidad ?? '',
        es_cliente_actual: i.es_cliente_actual, consultora_id: i.consultora_id ?? '',
        proximo_contacto: aFechaLocal(i.proximo_contacto),
    };
}

// WhatsApp necesita el código de país: los números peruanos se guardan a veces solo con 9 dígitos.
export function enlaceWhatsapp(telefono) {
    const digitos = telefono.replace(/\D/g, '');
    return `https://wa.me/${digitos.length === 9 ? `51${digitos}` : digitos}`;
}

export function textoDias(desde) {
    const dias = diasDesde(desde);
    if (dias === 0) return 'En esta etapa desde hoy';
    return `En esta etapa desde hace ${dias} ${dias === 1 ? 'día' : 'días'}`;
}

function Dato({ etiqueta, children }) {
    return <div><dt>{etiqueta}</dt><dd>{children || '—'}</dd></div>;
}

// Prototipo 03 (RF10, RF11): ficha con los datos del interesado y su historial.
export default function Ficha() {
    const { id } = useParams();
    const { esAdmin } = useAuth();
    const catalogos = useCatalogos();
    const navigate = useNavigate();
    const location = useLocation();

    const [interesado, setInteresado] = useState(undefined); // undefined = cargando, null = no existe
    const [etapas, setEtapas] = useState([]);
    const [consentimientos, setConsentimientos] = useState([]);
    const [editando, setEditando] = useState(null);
    const [errorHoja, setErrorHoja] = useState('');
    const [guardando, setGuardando] = useState(false);
    const [mensaje, setMensaje] = useState({ tipo: location.state?.tipo ?? '', texto: location.state?.aviso ?? '' });

    const cargar = useCallback(async () => {
        const [i, e, c] = await Promise.all([
            supabase.from('interesados').select('*').eq('id', id).maybeSingle(),
            supabase.from('historial_etapas').select('*').eq('interesado_id', id).order('cambiado_en', { ascending: false }),
            supabase.from('consentimientos').select('*').eq('interesado_id', id).order('aceptado_en', { ascending: false }),
        ]);
        setInteresado(i.data ?? null);
        setEtapas(e.data ?? []);
        setConsentimientos(c.data ?? []);
    }, [id]);

    useEffect(() => { cargar(); }, [cargar]);

    const usuario = (uid) => catalogos.usuarios.find((u) => u.id === uid)?.nombre ?? '';
    const nombreDe = (lista, codigo) => lista.find((x) => x.codigo === codigo)?.nombre ?? '';

    function abrirEdicion() {
        setErrorHoja('');
        setEditando(aFormulario(interesado));
    }

    async function guardar(e) {
        e.preventDefault();
        if (!editando.telefono.trim() && !editando.correo.trim()) {
            return setErrorHoja('Registra al menos un teléfono o un correo.');
        }
        setGuardando(true);
        setErrorHoja('');
        const { error } = await supabase.from('interesados').update(datosParaGuardar(editando)).eq('id', id);
        setGuardando(false);
        if (error) return setErrorHoja(mensajeError(error));
        setEditando(null);
        setMensaje({ tipo: 'ok', texto: 'Cambios guardados.' });
        cargar();
    }

    async function registrarConsentimiento() {
        if (!window.confirm('¿El interesado aceptó el tratamiento de sus datos personales?')) return;
        const { error } = await supabase.from('consentimientos').insert({
            interesado_id: id, canal: interesado.medio_contacto, version_politica: VERSION_POLITICA,
        });
        if (error) return setMensaje({ tipo: 'error', texto: mensajeError(error) });
        setMensaje({ tipo: 'ok', texto: 'Consentimiento registrado.' });
        cargar();
    }

    // Derecho de eliminación (Ley N° 29733, RNF04): solo el administrador.
    async function eliminar() {
        if (!window.confirm(`¿Eliminar a ${interesado.nombre} y todo su historial? Esta acción no se puede deshacer.`)) return;
        const { error } = await supabase.from('interesados').delete().eq('id', id);
        if (error) return setMensaje({ tipo: 'error', texto: mensajeError(error) });
        navigate('/interesados', { replace: true });
    }

    const volver = (
        <Link className="boton-icono" to="/interesados" aria-label="Volver a Interesados">
            <ArrowLeft size={22} aria-hidden="true" />
        </Link>
    );

    if (interesado === undefined || !catalogos.listo) {
        return <section className="pagina"><Cabecera titulo="Ficha del interesado" inicio={volver} /><div className="cuerpo"><p className="texto-suave">Cargando…</p></div></section>;
    }
    if (interesado === null) {
        return (
            <section className="pagina">
                <Cabecera titulo="Ficha del interesado" inicio={volver} />
                <div className="cuerpo">
                    <div className="tarjeta aviso-pantalla"><p className="texto-suave">No encontramos a este interesado. Puede que lo hayan eliminado.</p></div>
                </div>
            </section>
        );
    }

    const i = interesado;

    return (
        <section className="pagina">
            <Cabecera titulo="Ficha del interesado" inicio={volver}>
                <button type="button" className="boton-icono" onClick={abrirEdicion} aria-label="Editar datos">
                    <Pencil size={20} aria-hidden="true" />
                </button>
                {esAdmin && (
                    <details className="menu-acciones">
                        <summary className="boton-icono" aria-label="Más acciones"><EllipsisVertical size={20} aria-hidden="true" /></summary>
                        <div><button type="button" onClick={eliminar}>Eliminar interesado</button></div>
                    </details>
                )}
            </Cabecera>

            <div className="cuerpo">
                {mensaje.texto && <p className={`alerta alerta-${mensaje.tipo}`} role="status">{mensaje.texto}</p>}

                <div className="ficha">
                    <div>
                        <div className="tarjeta">
                            <div className="persona">
                                <Iniciales nombre={i.nombre} grande />
                                <div>
                                    <h2 className="ficha-nombre">{i.nombre}</h2>
                                    {i.empresa && <p className="texto-suave">{i.empresa}</p>}
                                </div>
                            </div>
                            <p className="ficha-etapa">
                                <Etapa etapa={i.etapa} />
                                <span className="texto-suave texto-pequeno">{textoDias(i.etapa_desde)}</span>
                            </p>
                            <div className="acciones-rapidas">
                                {i.telefono
                                    ? <a href={`tel:${i.telefono.replace(/[^\d+]/g, '')}`}><Phone size={20} aria-hidden="true" />Llamar</a>
                                    : <span className="inactiva"><Phone size={20} aria-hidden="true" />Llamar</span>}
                                {i.telefono
                                    ? <a href={enlaceWhatsapp(i.telefono)} target="_blank" rel="noreferrer"><MessageCircle size={20} aria-hidden="true" />WhatsApp</a>
                                    : <span className="inactiva"><MessageCircle size={20} aria-hidden="true" />WhatsApp</span>}
                                {i.correo
                                    ? <a href={`mailto:${i.correo}`}><Mail size={20} aria-hidden="true" />Correo</a>
                                    : <span className="inactiva"><Mail size={20} aria-hidden="true" />Correo</span>}
                                <span className="inactiva" title="Disponible en el Sprint 03"><Calendar size={20} aria-hidden="true" />Agendar</span>
                            </div>
                        </div>

                        <div className="tarjeta">
                            <h2>Contacto y empresa</h2>
                            <dl className="datos">
                                <Dato etiqueta="Teléfono">{i.telefono}</Dato>
                                <Dato etiqueta="Correo">{i.correo}</Dato>
                                <Dato etiqueta="Empresa">{i.empresa}</Dato>
                                <Dato etiqueta="RUC">{i.ruc}</Dato>
                                <Dato etiqueta="Sector">{nombreDe(catalogos.sectores, i.sector)}</Dato>
                                <Dato etiqueta="Cliente NAVASOFT">{i.es_cliente_actual ? 'Sí, ya usa NAVASOFT' : 'No, empresa nueva'}</Dato>
                            </dl>
                        </div>

                        <div className="tarjeta">
                            <h2>Oportunidad</h2>
                            <dl className="datos">
                                <Dato etiqueta="Solución de interés">{nombreDe(catalogos.soluciones, i.solucion)}</Dato>
                                <Dato etiqueta="Medio de contacto">{MEDIOS[i.medio_contacto]}</Dato>
                                <Dato etiqueta="Plazo">{PLAZOS[i.plazo] ?? i.plazo}</Dato>
                                <Dato etiqueta="Necesidad">{i.necesidad && <span className="texto-largo">{i.necesidad}</span>}</Dato>
                                <Dato etiqueta="Consultora asignada">{usuario(i.consultora_id) || 'Sin asignar'}</Dato>
                                <Dato etiqueta="Próximo contacto">{i.proximo_contacto && fechaHora(i.proximo_contacto)}</Dato>
                                <Dato etiqueta="Registrado">{fecha(i.creado_en)}{i.creado_por ? ` por ${usuario(i.creado_por)}` : ' desde la web'}</Dato>
                                {i.etapa === 'perdido' && <Dato etiqueta="Motivo de pérdida">{i.motivo_perdida}</Dato>}
                            </dl>
                        </div>

                        <div className="tarjeta">
                            <h2>Consentimiento de datos</h2>
                            {consentimientos.length ? (
                                consentimientos.map((c) => (
                                    <p key={c.id} className="texto-suave texto-pequeno">
                                        Aceptó por {MEDIOS[c.canal]} el {fechaHora(c.aceptado_en)} · Política versión {c.version_politica}
                                    </p>
                                ))
                            ) : (
                                <>
                                    <p className="alerta alerta-aviso">No hay un consentimiento registrado para este interesado.</p>
                                    <button type="button" className="boton boton-chico" onClick={registrarConsentimiento}>Registrar consentimiento</button>
                                </>
                            )}
                        </div>
                    </div>

                    <div>
                        <Historial interesadoId={id} etapas={etapas} usuario={usuario} />
                    </div>
                </div>
            </div>

            {editando && (
                <Hoja titulo="Editar datos" alCerrar={() => setEditando(null)}>
                    <form onSubmit={guardar}>
                        {errorHoja && <p className="alerta alerta-error" role="alert">{errorHoja}</p>}
                        <CamposInteresado valores={editando} cambiar={setEditando} catalogos={catalogos} />
                        <button className="boton boton-principal boton-ancho" disabled={guardando}>
                            {guardando ? 'Guardando…' : 'Guardar cambios'}
                        </button>
                    </form>
                </Hoja>
            )}
        </section>
    );
}
