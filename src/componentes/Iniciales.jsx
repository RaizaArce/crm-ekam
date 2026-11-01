// Círculo con las iniciales de una persona: "Lucía Paredes" -> "LP".
export function iniciales(nombre = '') {
    const partes = nombre.trim().split(/\s+/).filter(Boolean);
    const letras = partes.length > 1 ? partes[0][0] + partes[1][0] : (partes[0] ?? '?').slice(0, 2);
    return letras.toUpperCase();
}

export default function Iniciales({ nombre, oscuro = false }) {
    return (
        <span className={`iniciales${oscuro ? ' iniciales-oscuro' : ''}`} aria-hidden="true">
            {iniciales(nombre)}
        </span>
    );
}
