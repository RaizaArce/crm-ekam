import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { X } from 'lucide-react';
import { supabase } from '../supabase.js';
import { useAuth } from '../auth.jsx';
import { VERSION_POLITICA, mensajeError, useCatalogos } from '../catalogos.js';
import Cabecera from '../componentes/Cabecera.jsx';
import CamposInteresado, { INTERESADO_VACIO, datosParaGuardar } from '../componentes/CamposInteresado.jsx';
import AlertaDuplicados from '../componentes/AlertaDuplicados.jsx';

export const ultimosDigitos = (telefono) => telefono.replace(/\D/g, '').slice(-9);

// Prototipo 04 (RF09, RF13): registro manual de quien llega por llamada, WhatsApp o recomendación.
export default function NuevoInteresado() {
    const { perfil } = useAuth();
    const catalogos = useCatalogos();
    const navigate = useNavigate();
    // La consultora que registra queda como responsable; el administrador elige (RF10).
    const inicial = { ...INTERESADO_VACIO, consultora_id: perfil.rol === 'consultora' ? perfil.id : '' };
    const [valores, setValores] = useState(inicial);
    const [consentimiento, setConsentimiento] = useState(false);
    const [duplicados, setDuplicados] = useState([]);
    const [revisado, setRevisado] = useState({ telefono: '', correo: '' });
    const [registrarIgual, setRegistrarIgual] = useState(false);
    const [guardando, setGuardando] = useState(false);
    const [mensaje, setMensaje] = useState({ tipo: '', texto: '' });

    // Se consulta al salir del teléfono o del correo, y otra vez al guardar.
    async function buscarDuplicados() {
        const telefono = valores.telefono.trim();
        const correo = valores.correo.trim();
        if (telefono === revisado.telefono && correo === revisado.correo) return duplicados;
        setRevisado({ telefono, correo });
        setRegistrarIgual(false);
        if (!telefono && !correo) {
            setDuplicados([]);
            return [];
        }
        const { data } = await supabase.rpc('buscar_duplicados', { p_telefono: telefono, p_correo: correo });
        setDuplicados(data ?? []);
        return data ?? [];
    }

    async function guardar(e) {
        e.preventDefault();
        setMensaje({ tipo: '', texto: '' });
        if (!valores.telefono.trim() && !valores.correo.trim()) {
            return setMensaje({ tipo: 'error', texto: 'Registra al menos un teléfono o un correo.' });
        }
        if (!consentimiento) {
            return setMensaje({ tipo: 'error', texto: 'Confirma que el interesado aceptó el tratamiento de sus datos.' });
        }

        // Un duplicado se decide en su aviso, con "Registrar igual".
        const encontrados = await buscarDuplicados();
        if (encontrados.length > 0 && !registrarIgual) {
            return setMensaje({ tipo: 'error', texto: 'Revisa el posible duplicado antes de guardar.' });
        }

        setGuardando(true);
        const { data, error } = await supabase
            .from('interesados')
            .insert({ ...datosParaGuardar(valores), creado_por: perfil.id })
            .select('id, nombre')
            .single();
        if (error) {
            setGuardando(false);
            return setMensaje({ tipo: 'error', texto: mensajeError(error) });
        }

        // Consentimiento verbal o por mensaje que confirma la consultora (RNF04, Ley N° 29733).
        const { error: errorConsentimiento } = await supabase.from('consentimientos').insert({
            interesado_id: data.id,
            canal: valores.medio_contacto,
            version_politica: VERSION_POLITICA,
        });
        setGuardando(false);

        navigate(`/interesados/${data.id}`, {
            state: errorConsentimiento
                ? { tipo: 'error', aviso: 'Se registró el interesado, pero no se guardó su consentimiento. Regístralo en esta ficha.' }
                : { tipo: 'ok', aviso: `${data.nombre} quedó registrado.` },
        });
    }

    function aceptarDuplicado() {
        setRegistrarIgual(true);
        setMensaje({ tipo: '', texto: '' });
    }

    const digitos = ultimosDigitos(valores.telefono);
    const coincideTelefono = digitos.length >= 7 && duplicados.some((d) => d.telefono_normalizado === digitos);
    const duplicadoPor = duplicados.length === 0 ? null : coincideTelefono ? 'telefono' : 'correo';

    return (
        <section className="pagina">
            <Cabecera titulo="Nuevo interesado" subtitulo="Registro manual"
                inicio={(
                    <Link className="boton-icono" to="/interesados" aria-label="Cerrar sin guardar">
                        <X size={22} aria-hidden="true" />
                    </Link>
                )} />

            <div className="cuerpo cuerpo-medio">
                {mensaje.texto && <p className={`alerta alerta-${mensaje.tipo}`} role="status">{mensaje.texto}</p>}

                <form onSubmit={guardar}>
                    {!catalogos.listo ? <p className="texto-suave">Cargando…</p> : (
                        <CamposInteresado valores={valores} cambiar={setValores} catalogos={catalogos}
                            alSalirContacto={buscarDuplicados} duplicadoPor={duplicadoPor}
                            alerta={(
                                <AlertaDuplicados duplicados={duplicados} usuarios={catalogos.usuarios} aceptado={registrarIgual}
                                    dato={duplicadoPor === 'telefono' ? `el teléfono ${valores.telefono.trim()}` : `el correo ${valores.correo.trim()}`}
                                    alRegistrarIgual={aceptarDuplicado} />
                            )} />
                    )}

                    <label className="campo-casilla consentimiento">
                        <input type="checkbox" checked={consentimiento} onChange={(e) => setConsentimiento(e.target.checked)} />
                        <span>
                            El interesado aceptó el tratamiento de sus datos personales (Ley N.° 29733), según la{' '}
                            <a href="https://www.ekamperu.com/privacidad.html" target="_blank" rel="noreferrer">política de privacidad</a>. *
                        </span>
                    </label>

                    <p className="texto-suave texto-pequeno nota-obligatorios">* Obligatorio. Registra al menos un teléfono o un correo.</p>

                    <div className="botones-formulario">
                        <Link className="boton" to="/interesados">Cancelar</Link>
                        <button className="boton boton-principal" disabled={guardando || !catalogos.listo}>
                            {guardando ? 'Guardando…' : 'Guardar'}
                        </button>
                    </div>
                </form>
            </div>
        </section>
    );
}
