import { MEDIOS, MEDIOS_MANUALES, PLAZOS } from '../catalogos.js';

export const INTERESADO_VACIO = {
    nombre: '', empresa: '', ruc: '', telefono: '', correo: '',
    sector: '', solucion: '', medio_contacto: 'whatsapp', plazo: '', necesidad: '',
    es_cliente_actual: false, consultora_id: '', proximo_contacto: '',
};

// Los campos vacíos van como null: así funcionan los checks de la base (RUC, teléfono o correo).
export function datosParaGuardar(f) {
    const limpio = (v) => v.trim() || null;
    return {
        nombre: f.nombre.trim(),
        empresa: limpio(f.empresa),
        ruc: limpio(f.ruc),
        telefono: limpio(f.telefono),
        correo: limpio(f.correo)?.toLowerCase() ?? null,
        sector: f.sector || null,
        solucion: f.solucion || null,
        medio_contacto: f.medio_contacto,
        plazo: f.plazo || null,
        necesidad: limpio(f.necesidad),
        es_cliente_actual: f.es_cliente_actual,
        consultora_id: f.consultora_id || null,
        proximo_contacto: f.proximo_contacto ? new Date(f.proximo_contacto).toISOString() : null,
    };
}

// Campos del interesado (RF09). La ficha (T27) los reutiliza para editar.
export default function CamposInteresado({ valores, cambiar, catalogos, alSalirContacto }) {
    const campo = (nombre) => ({
        value: valores[nombre],
        onChange: (e) => cambiar({ ...valores, [nombre]: e.target.value }),
    });
    const consultoras = catalogos.usuarios.filter((u) => u.activo || u.id === valores.consultora_id);

    return (
        <div className="rejilla">
            <label className="campo">
                <span>Nombre y apellido *</span>
                <input required maxLength={120} {...campo('nombre')} />
            </label>
            <label className="campo">
                <span>Empresa</span>
                <input maxLength={150} {...campo('empresa')} />
            </label>
            <label className="campo">
                <span>RUC</span>
                <input inputMode="numeric" pattern="\d{11}" maxLength={11} title="11 dígitos" {...campo('ruc')} />
            </label>
            <label className="campo">
                <span>Teléfono</span>
                <input type="tel" inputMode="tel" maxLength={30} {...campo('telefono')} onBlur={alSalirContacto} />
            </label>
            <label className="campo">
                <span>Correo</span>
                <input type="email" maxLength={150} {...campo('correo')} onBlur={alSalirContacto} />
            </label>
            <label className="campo">
                <span>Medio de contacto *</span>
                <select required {...campo('medio_contacto')}>
                    {MEDIOS_MANUALES.map((m) => <option key={m} value={m}>{MEDIOS[m]}</option>)}
                </select>
            </label>
            <label className="campo">
                <span>Sector</span>
                <select {...campo('sector')}>
                    <option value="">Sin indicar</option>
                    {catalogos.sectores.map((s) => <option key={s.codigo} value={s.codigo}>{s.nombre}</option>)}
                </select>
            </label>
            <label className="campo">
                <span>Solución de interés</span>
                <select {...campo('solucion')}>
                    <option value="">Sin indicar</option>
                    {catalogos.soluciones.map((s) => <option key={s.codigo} value={s.codigo}>{s.nombre}</option>)}
                </select>
            </label>
            <label className="campo">
                <span>Plazo</span>
                <select {...campo('plazo')}>
                    <option value="">Sin indicar</option>
                    {Object.entries(PLAZOS).map(([v, t]) => <option key={v} value={v}>{t}</option>)}
                </select>
            </label>
            <label className="campo">
                <span>Consultora responsable</span>
                <select {...campo('consultora_id')}>
                    <option value="">Sin asignar</option>
                    {consultoras.map((u) => <option key={u.id} value={u.id}>{u.nombre}</option>)}
                </select>
            </label>
            <label className="campo">
                <span>Próximo contacto</span>
                <input type="datetime-local" {...campo('proximo_contacto')} />
            </label>
            <label className="campo campo-casilla">
                <input type="checkbox" checked={valores.es_cliente_actual}
                    onChange={(e) => cambiar({ ...valores, es_cliente_actual: e.target.checked })} />
                <span>Ya es cliente de NAVASOFT</span>
            </label>
            <label className="campo ancho-completo">
                <span>Necesidad o comentario</span>
                <textarea maxLength={1000} {...campo('necesidad')} />
            </label>
        </div>
    );
}
