// Reglas de las demostraciones (RF16). Sin red ni base de datos: se prueban en logica.test.js.

export const MODALIDADES = { virtual: 'Virtual', presencial: 'Presencial' };
export const ESTADOS_DEMO = { programada: 'Programada', realizada: 'Realizada', cancelada: 'Cancelada' };

// Una demostración ocupa una hora: dos de la misma consultora a menos de 60 minutos se cruzan.
export const DURACION_MIN = 60;

// Valida el formulario y devuelve la fila para la tabla demostraciones.
export function datosDemo(form, interesadoId, ahora = new Date()) {
    if (!form.inicio) return { error: 'Elige la fecha y la hora.' };
    const inicio = new Date(form.inicio);
    if (Number.isNaN(inicio.getTime())) return { error: 'La fecha no es válida.' };
    if (inicio < ahora) return { error: 'La demostración debe ser en una fecha futura.' };
    if (!form.consultora_id) return { error: 'Elige la consultora que hará la demostración.' };
    if (!MODALIDADES[form.modalidad]) return { error: 'Elige si es virtual o presencial.' };
    return {
        datos: {
            interesado_id: interesadoId,
            consultora_id: form.consultora_id,
            inicio: inicio.toISOString(),
            modalidad: form.modalidad,
            notas: form.notas?.trim() || null,
        },
    };
}

// Demostraciones programadas de la misma consultora que se cruzan con la nueva.
export function cruces(demos, { consultora_id, inicio }) {
    const nueva = new Date(inicio).getTime();
    return demos.filter((d) => d.estado === 'programada'
        && d.consultora_id === consultora_id
        && Math.abs(new Date(d.inicio).getTime() - nueva) < DURACION_MIN * 60000);
}

// Al agendar, el interesado pasa a "Demostración agendada" si aún estaba en Nuevo o Contactado.
export const pasaADemoAgendada = (etapa) => etapa === 'nuevo' || etapa === 'contactado';
