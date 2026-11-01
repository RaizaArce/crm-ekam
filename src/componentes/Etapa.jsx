import { ETAPAS } from '../catalogos.js';

// Pastilla de etapa con punto de color (prototipos 02, 03 y 04).
export default function Etapa({ etapa }) {
    return <span className={`etapa etapa-${etapa}`}>{ETAPAS[etapa]}</span>;
}
