// Métricas del dashboard comercial (prototipo 07, RF19 a RF22).
// Funciones puras: reciben filas de Supabase y devuelven números. Se prueban en logica.test.js.

// Orden del embudo. "perdido" queda fuera: se cuenta aparte.
export const ORDEN_EMBUDO = ['nuevo', 'contactado', 'demo_agendada', 'cotizado', 'cerrado'];

const DIA = 86400000;

export function inicioMes(fecha) {
    const d = new Date(fecha);
    return new Date(d.getFullYear(), d.getMonth(), 1);
}

export function sumarMeses(fecha, meses) {
    const d = new Date(fecha);
    return new Date(d.getFullYear(), d.getMonth() + meses, 1);
}

const claveMes = (fecha) => {
    const d = new Date(fecha);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

// Primer día del periodo: "últimos 6 meses" incluye el mes en curso y los 5 anteriores.
export function inicioPeriodo(meses, hoy = new Date()) {
    return sumarMeses(inicioMes(hoy), -(meses - 1));
}

// Interesados creados por mes, con todos los meses del periodo aunque estén en cero.
export function interesadosPorMes(interesados, meses, hoy = new Date()) {
    const inicio = inicioPeriodo(meses, hoy);
    const lista = Array.from({ length: meses }, (_, i) => {
        const mes = sumarMeses(inicio, i);
        return { clave: claveMes(mes), mes, total: 0 };
    });
    const porClave = Object.fromEntries(lista.map((m) => [m.clave, m]));
    for (const i of interesados) {
        const m = porClave[claveMes(i.creado_en)];
        if (m) m.total += 1;
    }
    return lista;
}

// Interesados de este mes y diferencia con el mes anterior.
export function interesadosDelMes(interesados, hoy = new Date()) {
    const este = claveMes(hoy);
    const anterior = claveMes(sumarMeses(inicioMes(hoy), -1));
    const actual = interesados.filter((i) => claveMes(i.creado_en) === este).length;
    const previo = interesados.filter((i) => claveMes(i.creado_en) === anterior).length;
    return { actual, diferencia: actual - previo };
}

// Fecha en que cada interesado pasó a cerrado (la última vez, según el historial).
function fechasDeCierre(historial) {
    const fechas = {};
    for (const h of historial) {
        if (h.etapa_nueva !== 'cerrado') continue;
        if (!fechas[h.interesado_id] || new Date(h.cambiado_en) > new Date(fechas[h.interesado_id])) {
            fechas[h.interesado_id] = h.cambiado_en;
        }
    }
    return fechas;
}

// Días desde el registro hasta el cierre de cada interesado cerrado.
export function diasHastaCierre(interesados, historial) {
    const fechas = fechasDeCierre(historial);
    return interesados
        .filter((i) => i.etapa === 'cerrado')
        .map((i) => {
            const cierre = fechas[i.id] ?? i.etapa_desde;
            return { interesado: i, dias: Math.max(0, Math.round((new Date(cierre) - new Date(i.creado_en)) / DIA)) };
        });
}

const promedio = (numeros) => (numeros.length ? Math.round(numeros.reduce((a, b) => a + b, 0) / numeros.length) : null);

// Tasa de conversión: cerrados (ventas) sobre todos los interesados del periodo.
export function conversion(interesados) {
    const cerrados = interesados.filter((i) => i.etapa === 'cerrado').length;
    return { cerrados, total: interesados.length, tasa: interesados.length ? cerrados / interesados.length : null };
}

export function tiempoPromedioCierre(interesados, historial) {
    const dias = diasHastaCierre(interesados, historial).map((d) => d.dias);
    return { dias: promedio(dias), cierres: dias.length };
}

// Etapa más avanzada a la que llegó cada interesado (aunque luego se haya perdido).
export function etapaMaxima(interesado, historial) {
    let max = ORDEN_EMBUDO.indexOf(interesado.etapa);
    for (const h of historial) {
        if (h.interesado_id !== interesado.id) continue;
        max = Math.max(max, ORDEN_EMBUDO.indexOf(h.etapa_nueva), ORDEN_EMBUDO.indexOf(h.etapa_anterior ?? ''));
    }
    // Una venta deshecha (cerrado y luego otra etapa) no cuenta como cierre: llega hasta Cotizado.
    const cerrado = ORDEN_EMBUDO.indexOf('cerrado');
    if (max === cerrado && interesado.etapa !== 'cerrado') max = cerrado - 1;
    return Math.max(max, 0); // todos empezaron en "nuevo"
}

// RF20: porcentaje de interesados que llegó a cada etapa o más allá.
export function conversionPorEtapa(interesados, historial) {
    const maximos = interesados.map((i) => etapaMaxima(i, historial));
    return ORDEN_EMBUDO.map((etapa, indice) => {
        const llegaron = maximos.filter((m) => m >= indice).length;
        return { etapa, llegaron, porcentaje: interesados.length ? llegaron / interesados.length : 0 };
    });
}

// Perdidos y el motivo más repetido (sin distinguir mayúsculas ni el punto final).
export function perdidos(interesados) {
    const lista = interesados.filter((i) => i.etapa === 'perdido');
    const cuenta = {};
    for (const i of lista) {
        const motivo = (i.motivo_perdida ?? '').trim().replace(/[.\s]+$/, '');
        if (!motivo) continue;
        const clave = motivo.toLowerCase();
        cuenta[clave] = cuenta[clave] ?? { texto: motivo, veces: 0 };
        cuenta[clave].veces += 1;
    }
    const masFrecuente = Object.values(cuenta).sort((a, b) => b.veces - a.veces)[0] ?? null;
    return { total: lista.length, motivo: masFrecuente };
}

// Cuenta por un campo (sector, solución, medio) con nombres legibles, de mayor a menor.
export function contarPor(interesados, campo, nombres = {}) {
    const cuenta = {};
    for (const i of interesados) {
        const clave = i[campo] ?? '';
        cuenta[clave] = (cuenta[clave] ?? 0) + 1;
    }
    return Object.entries(cuenta)
        .map(([clave, total]) => ({ clave, nombre: clave ? (nombres[clave] ?? clave) : 'Sin dato', total }))
        // "Sin dato" siempre al final; el resto, de mayor a menor.
        .sort((a, b) => (a.clave === '') - (b.clave === '') || b.total - a.total || a.nombre.localeCompare(b.nombre));
}

// RF21: cierres y días promedio por consultora.
export function cierrePorConsultora(interesados, historial) {
    const grupos = {};
    for (const { interesado, dias } of diasHastaCierre(interesados, historial)) {
        const id = interesado.consultora_id ?? '';
        grupos[id] = grupos[id] ?? [];
        grupos[id].push(dias);
    }
    return Object.entries(grupos)
        .map(([consultora_id, dias]) => ({ consultora_id: consultora_id || null, cerrados: dias.length, dias: promedio(dias) }))
        .sort((a, b) => b.cerrados - a.cerrados);
}

// Demostraciones realizadas en el mes en curso.
export function demosRealizadasDelMes(demos, hoy = new Date()) {
    const este = claveMes(hoy);
    return demos.filter((d) => d.estado === 'realizada' && claveMes(d.inicio) === este).length;
}

// RF22: CSV con ";" y BOM para que Excel en español lo abra con tildes y columnas.
export function aCsv(filas, columnas) {
    const celda = (v) => {
        const texto = v === null || v === undefined ? '' : String(v);
        return /[;"\n\r]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto;
    };
    const lineas = [columnas.map((c) => celda(c.titulo)).join(';')]
        .concat(filas.map((f) => columnas.map((c) => celda(c.valor(f))).join(';')));
    return '﻿' + lineas.join('\r\n');
}
