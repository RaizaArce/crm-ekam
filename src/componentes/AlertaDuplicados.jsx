import { ETAPAS, fecha } from '../catalogos.js';

// RF13: aviso de interesados que ya tienen ese teléfono o correo.
// El enlace a su ficha se agrega con T27.
export default function AlertaDuplicados({ duplicados, usuarios }) {
    if (!duplicados.length) return null;
    const nombreUsuario = (id) => usuarios.find((u) => u.id === id)?.nombre;
    return (
        <div className="alerta alerta-aviso" role="alert">
            <strong>
                {duplicados.length === 1 ? 'Ya existe un interesado' : `Ya existen ${duplicados.length} interesados`} con este teléfono o correo:
            </strong>
            <ul className="lista-duplicados">
                {duplicados.map((d) => (
                    <li key={d.id}>
                        <strong>{d.nombre}</strong>
                        {d.empresa && ` · ${d.empresa}`} · {ETAPAS[d.etapa]}
                        {nombreUsuario(d.consultora_id) && ` · atiende ${nombreUsuario(d.consultora_id)}`}
                        {` · registrado el ${fecha(d.creado_en)}`}
                    </li>
                ))}
            </ul>
            Revisa con tu equipo antes de registrarlo otra vez.
        </div>
    );
}
