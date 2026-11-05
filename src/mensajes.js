// Mensajes ya escritos para el botón Correo y el botón WhatsApp de la ficha (HU09).
// Se arman con lo que el interesado llenó o la consultora registró; nada se envía solo.

function primerNombre(nombre) {
    return (nombre ?? '').trim().split(/\s+/)[0] || '';
}

function sinPuntoFinal(texto) {
    return texto.trim().replace(/[.\s]+$/, '');
}

// "el viernes 6 de noviembre a las 10:00 a. m."
export function cuandoDemo(inicio) {
    const d = new Date(inicio);
    const dia = d.toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long' }).toLowerCase().replace(',', '');
    const hora = d.toLocaleTimeString('es-PE', { hour: 'numeric', minute: '2-digit' });
    // Los navegadores usan espacios especiales en "a. m.": en un mensaje van espacios normales.
    return `el ${dia} a las ${hora}`.replace(/\s/g, ' ');
}

// Texto central según la etapa del embudo.
function cuerpoPorEtapa(etapa, solucion, necesidad, demo) {
    const producto = solucion || 'nuestras soluciones';
    switch (etapa) {
        case 'demo_agendada':
            if (demo) {
                return [`Le escribo para confirmar la demostración de ${producto}, ${cuandoDemo(demo.inicio)} (${demo.modalidad}).`,
                    '¿Sigue en pie? Si necesita moverla, avíseme y buscamos otro espacio.'];
            }
            return [`Le escribo para confirmar la demostración de ${producto} que tenemos programada.`,
                '¿Sigue en pie la fecha y hora acordadas? Si necesita moverla, avíseme y buscamos otro espacio.'];
        case 'cotizado':
            return [`Le escribo para saber si pudo revisar la cotización de ${producto} que le enviamos.`,
                'Con gusto resolvemos cualquier duda o ajustamos la propuesta a lo que necesita.'];
        case 'cerrado':
            return [`Gracias por confiar en EKAM PERÚ para implementar ${producto}.`,
                'Quedo a su disposición para coordinar los siguientes pasos.'];
        default: // nuevo, contactado o perdido
            return [
                `Gracias por su interés en ${producto}.`,
                necesidad
                    ? `Nos comentó que necesita: "${sinPuntoFinal(necesidad)}". Nos gustaría mostrarle cómo lo resuelve NAVASOFT en una demostración breve, presencial o virtual.`
                    : 'Nos gustaría mostrarle cómo funciona en una demostración breve, presencial o virtual.',
                '¿Qué día y hora le acomodan?',
            ];
    }
}

// demo: la próxima demostración programada ({ inicio, modalidad }), si hay.
export function mensajesInteresado(interesado, { solucion = '', consultora = '', demo = null } = {}) {
    const nombre = primerNombre(interesado.nombre);
    const saludo = nombre ? `Hola, ${nombre}:` : 'Hola:';
    const presentacion = consultora ? `Le saluda ${consultora}, de EKAM PERÚ.` : 'Le saludamos de EKAM PERÚ.';
    const parrafos = cuerpoPorEtapa(interesado.etapa, solucion, interesado.necesidad?.trim(), demo);

    const asunto = [solucion || 'NAVASOFT', interesado.empresa ? `para ${interesado.empresa}` : '']
        .filter(Boolean).join(' ') + ' – EKAM PERÚ';
    const firma = [consultora, 'EKAM PERÚ · ekamperu.com'].filter(Boolean).join('\n');
    const correo = [saludo, `${presentacion} ${parrafos[0]}`, ...parrafos.slice(1), `Saludos,\n${firma}`].join('\n\n');

    // WhatsApp: más corto, sin firma (el número ya identifica a quien escribe).
    const whatsapp = [`${saludo.replace(/:$/, '')}, ${presentacion.charAt(0).toLowerCase()}${presentacion.slice(1)}`,
        parrafos.join(' ')].join(' ');

    return { asunto, correo, whatsapp };
}

export function enlaceCorreo(correo, { asunto, correo: cuerpo }) {
    return `mailto:${correo}?subject=${encodeURIComponent(asunto)}&body=${encodeURIComponent(cuerpo)}`;
}
