import { useState } from 'react';
import { supabase } from '../supabase.js';
import { useAuth } from '../auth.jsx';
import { MEDIOS, VERSION_POLITICA, mensajeError, useCatalogos } from '../catalogos.js';
import CamposInteresado, { INTERESADO_VACIO, datosParaGuardar } from '../componentes/CamposInteresado.jsx';
import AlertaDuplicados from '../componentes/AlertaDuplicados.jsx';

// RF09: registro manual de quien llega por llamada, WhatsApp o recomendación.
export default function NuevoInteresado() {
    const { perfil } = useAuth();
    const catalogos = useCatalogos();
    // La consultora que registra queda como responsable; el administrador elige (RF10).
    const inicial = { ...INTERESADO_VACIO, consultora_id: perfil.rol === 'consultora' ? perfil.id : '' };
    const [valores, setValores] = useState(inicial);
    const [consentimiento, setConsentimiento] = useState(false);
    const [duplicados, setDuplicados] = useState([]);
    const [revisado, setRevisado] = useState({ telefono: '', correo: '' });
    const [guardando, setGuardando] = useState(false);
    const [mensaje, setMensaje] = useState({ tipo: '', texto: '' });

    // Se consulta al salir del teléfono o del correo, y otra vez al guardar.
    async function buscarDuplicados() {
        const telefono = valores.telefono.trim();
        const correo = valores.correo.trim();
        if (telefono === revisado.telefono && correo === revisado.correo) return duplicados;
        setRevisado({ telefono, correo });
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
            return setMensaje({ tipo: 'error', texto: 'Ingresa al menos un teléfono o un correo.' });
        }
        if (!consentimiento) {
            return setMensaje({ tipo: 'error', texto: 'Confirma que el interesado aceptó el tratamiento de sus datos.' });
        }

        // Si al guardar aparece un duplicado que no se había mostrado, primero se muestra.
        const yaVistos = duplicados.length;
        const encontrados = await buscarDuplicados();
        if (encontrados.length > yaVistos) return;

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

        setValores(inicial);
        setConsentimiento(false);
        setDuplicados([]);
        setRevisado({ telefono: '', correo: '' });
        setMensaje(errorConsentimiento
            ? { tipo: 'error', texto: `Se registró a ${data.nombre}, pero no se guardó su consentimiento. Avísale al administrador.` }
            : { tipo: 'ok', texto: `${data.nombre} quedó registrado.` });
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    return (
        <section className="pagina">
            <h1>Nuevo interesado</h1>
            {mensaje.texto && <p className={`alerta alerta-${mensaje.tipo}`} role="status">{mensaje.texto}</p>}

            <form className="tarjeta" onSubmit={guardar}>
                {!catalogos.listo ? <p className="texto-suave">Cargando…</p> : (
                    <CamposInteresado valores={valores} cambiar={setValores} catalogos={catalogos}
                        alSalirContacto={buscarDuplicados} />
                )}

                <AlertaDuplicados duplicados={duplicados} usuarios={catalogos.usuarios} />

                <label className="campo campo-casilla consentimiento">
                    <input type="checkbox" checked={consentimiento} onChange={(e) => setConsentimiento(e.target.checked)} />
                    <span>
                        El interesado aceptó por {MEDIOS[valores.medio_contacto].toLowerCase()} que EKAM guarde sus datos
                        para contactarlo, según la{' '}
                        <a href="https://www.ekamperu.com/privacidad.html" target="_blank" rel="noreferrer">política de privacidad</a>. *
                    </span>
                </label>

                <button className="boton boton-principal" disabled={guardando || !catalogos.listo}>
                    {guardando ? 'Guardando…' : duplicados.length ? 'Registrar de todos modos' : 'Registrar interesado'}
                </button>
            </form>
        </section>
    );
}
