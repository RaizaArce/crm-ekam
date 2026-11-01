import { Link } from 'react-router-dom';
import { TriangleAlert } from 'lucide-react';
import Etapa from './Etapa.jsx';
import Iniciales from './Iniciales.jsx';

// RF13: aviso de interesados que ya tienen ese teléfono o correo (prototipo 04).
export default function AlertaDuplicados({ duplicados, dato, usuarios, aceptado, alRegistrarIgual }) {
    const nombreUsuario = (id) => usuarios.find((u) => u.id === id)?.nombre;

    return (
        <div className="alerta-duplicado ancho-completo" role="alert">
            <p className="alerta-duplicado-titulo">
                <TriangleAlert size={20} aria-hidden="true" />
                <span>
                    <strong>Posible duplicado</strong>
                    {duplicados.length === 1 ? 'Ya existe un interesado' : `Ya existen ${duplicados.length} interesados`} con {dato}.
                </span>
            </p>

            {duplicados.map((d) => (
                <div key={d.id} className="duplicado">
                    <Iniciales nombre={d.nombre} />
                    <div>
                        <strong>{d.nombre}</strong>
                        {d.empresa && <span className="duplicado-empresa">{d.empresa}</span>}
                        <span className="duplicado-marcas">
                            <Etapa etapa={d.etapa} />
                            {nombreUsuario(d.consultora_id) && <span>{nombreUsuario(d.consultora_id)}</span>}
                        </span>
                    </div>
                </div>
            ))}

            {aceptado ? (
                <p className="alerta-duplicado-nota">Revisado: se registrará como un interesado nuevo.</p>
            ) : (
                <div className="duplicado-acciones">
                    <Link className="boton" to={`/interesados/${duplicados[0].id}`}>Ver ficha</Link>
                    <button type="button" className="boton" onClick={alRegistrarIgual}>Registrar igual</button>
                </div>
            )}
        </div>
    );
}
