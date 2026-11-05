import { useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import { supabase } from '../supabase.js';
import { limpiarBusqueda } from '../paginas/Interesados.jsx';
import Etapa from './Etapa.jsx';
import Hoja from './Hoja.jsx';
import Iniciales from './Iniciales.jsx';

const CAMPOS = 'id, nombre, empresa, etapa, consultora_id, motivo_perdida';

// Hoja para buscar a un interesado en curso y elegirlo (agenda: «Agendar demo»).
export default function ElegirInteresado({ titulo, alCerrar, alElegir }) {
    const [texto, setTexto] = useState('');
    const [filas, setFilas] = useState(null);

    useEffect(() => {
        let cancelado = false;
        const espera = setTimeout(() => {
            let consulta = supabase.from('interesados').select(CAMPOS)
                .not('etapa', 'in', '("cerrado","perdido")')
                .order('actualizado_en', { ascending: false })
                .limit(20);
            const busqueda = limpiarBusqueda(texto);
            if (busqueda) consulta = consulta.or(`nombre.ilike.%${busqueda}%,empresa.ilike.%${busqueda}%`);
            consulta.then(({ data }) => { if (!cancelado) setFilas(data ?? []); });
        }, 250);
        return () => { cancelado = true; clearTimeout(espera); };
    }, [texto]);

    return (
        <Hoja titulo={titulo} alCerrar={alCerrar}>
            <label className="buscador-lista buscador-hoja">
                <Search size={18} aria-hidden="true" />
                <input type="search" autoFocus placeholder="Buscar por nombre o empresa" aria-label="Buscar interesado"
                    value={texto} onChange={(e) => setTexto(e.target.value)} />
            </label>
            {filas === null && <p className="texto-suave texto-pequeno">Buscando…</p>}
            {filas?.length === 0 && <p className="texto-suave texto-pequeno">Ningún interesado en curso coincide.</p>}
            {filas?.length > 0 && (
                <ul className="lista-elegir">
                    {filas.map((i) => (
                        <li key={i.id}>
                            <button type="button" onClick={() => alElegir(i)}>
                                <Iniciales nombre={i.nombre} />
                                <span>
                                    <strong>{i.nombre}</strong>
                                    {i.empresa && <span className="texto-suave texto-pequeno">{i.empresa}</span>}
                                </span>
                                <Etapa etapa={i.etapa} />
                            </button>
                        </li>
                    ))}
                </ul>
            )}
            <p className="texto-tenue texto-pequeno">Solo aparecen interesados en curso (sin cerrados ni perdidos).</p>
        </Hoja>
    );
}
