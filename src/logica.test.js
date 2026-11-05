// Pruebas unitarias de la lógica del CRM (Sprint 02). No usan la red ni la base de datos.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ETAPAS, MEDIOS, MEDIOS_MANUALES, datosCambioEtapa, diasDesde, fechaRelativa, mensajeError } from './catalogos.js';
import { INTERESADO_VACIO, aFechaLocal, datosParaGuardar } from './componentes/CamposInteresado.jsx';
import { iniciales } from './componentes/Iniciales.jsx';
import { enlaceWhatsapp, textoDias } from './paginas/Ficha.jsx';
import { limpiarBusqueda } from './paginas/Interesados.jsx';
import { ultimosDigitos } from './paginas/NuevoInteresado.jsx';
import { enlaceCorreo, mensajesInteresado } from './mensajes.js';
import { agruparPorEtapa } from './paginas/Embudo.jsx';
import { claveDia, cruces, datosDemo, diasDeLaSemana, inicioSemana, pasaADemoAgendada, tituloSemana } from './demos.js';
import { aCsv, cierrePorConsultora, contarPor, conversion, conversionPorEtapa, demosRealizadasDelMes, interesadosDelMes, interesadosPorMes, perdidos, tiempoPromedioCierre } from './metricas.js';

vi.mock('./supabase.js', () => ({ supabase: {} }));

describe('UT01 datosParaGuardar (HU08)', () => {
    const formulario = (cambios) => ({ ...INTERESADO_VACIO, nombre: 'Ana', telefono: '943163301', ...cambios });

    it('quita los espacios de los extremos', () => {
        const datos = datosParaGuardar(formulario({ nombre: '  Ana Pérez ', empresa: ' Agro SAC ' }));
        expect(datos.nombre).toBe('Ana Pérez');
        expect(datos.empresa).toBe('Agro SAC');
    });

    it('envía null en los campos vacíos, para que apliquen los checks de la base', () => {
        const datos = datosParaGuardar(formulario({ ruc: '   ', correo: '' }));
        for (const campo of ['empresa', 'ruc', 'correo', 'sector', 'solucion', 'plazo', 'necesidad', 'consultora_id', 'proximo_contacto']) {
            expect(datos[campo], campo).toBeNull();
        }
    });

    it('guarda el correo en minúsculas', () => {
        expect(datosParaGuardar(formulario({ correo: ' Ana@Empresa.PE ' })).correo).toBe('ana@empresa.pe');
    });

    it('convierte el próximo contacto a fecha con zona horaria', () => {
        const local = '2026-11-20T15:30';
        expect(datosParaGuardar(formulario({ proximo_contacto: local })).proximo_contacto).toBe(new Date(local).toISOString());
    });

    it('conserva el medio de contacto y la marca de cliente actual', () => {
        const datos = datosParaGuardar(formulario({ medio_contacto: 'llamada', es_cliente_actual: true }));
        expect(datos.medio_contacto).toBe('llamada');
        expect(datos.es_cliente_actual).toBe(true);
    });
});

describe('UT02 aFechaLocal (HU08)', () => {
    it('devuelve texto vacío si no hay fecha', () => {
        expect(aFechaLocal(null)).toBe('');
        expect(aFechaLocal('')).toBe('');
    });

    it('da el formato del campo de fecha y vuelve a la misma hora al guardar', () => {
        const guardada = '2026-11-20T15:30:00.000Z';
        const local = aFechaLocal(guardada);
        expect(local).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
        expect(new Date(local).toISOString()).toBe(guardada);
    });
});

describe('UT03 mensajeError (HU08, HU10)', () => {
    it.each([
        ['new row violates check constraint "interesados_con_contacto"', 'Ingresa al menos un teléfono o un correo.'],
        ['new row violates check constraint "interesados_ruc_check"', 'El RUC debe tener 11 dígitos.'],
        ['new row violates row-level security policy for table "interesados"', 'No tienes permiso para hacer esto.'],
        ['TypeError: Failed to fetch', 'Sin conexión. Revisa tu internet e inténtalo de nuevo.'],
        ['otro error cualquiera', 'No se pudo guardar. Inténtalo de nuevo.'],
    ])('%s', (message, esperado) => {
        expect(mensajeError({ message })).toBe(esperado);
    });

    it('reconoce el permiso denegado por su código', () => {
        expect(mensajeError({ message: 'denied', code: '42501' })).toBe('No tienes permiso para hacer esto.');
    });

    it('no confunde con el RUC un error que solo contiene esas letras', () => {
        expect(mensajeError({ message: 'malformed array structure' })).toBe('No se pudo guardar. Inténtalo de nuevo.');
    });

    it('no falla si no hay error', () => {
        expect(mensajeError(undefined)).toBe('No se pudo guardar. Inténtalo de nuevo.');
    });
});

describe('UT04 ultimosDigitos (HU12)', () => {
    it('reconoce el mismo número escrito de varias formas', () => {
        expect(ultimosDigitos('+51 943 163 301')).toBe('943163301');
        expect(ultimosDigitos('943-163-301')).toBe('943163301');
        expect(ultimosDigitos('(51) 943163301')).toBe('943163301');
    });

    it('deja los números cortos sin completar', () => {
        expect(ultimosDigitos('074 123')).toBe('074123');
    });
});

describe('UT05 limpiarBusqueda (HU11)', () => {
    it('quita los caracteres que romperían el filtro de la consulta', () => {
        expect(limpiarBusqueda('Agro, (Norte) 100%*\\"')).toBe('Agro   Norte  100');
    });

    it('conserva tildes, puntos y arrobas', () => {
        expect(limpiarBusqueda('  José.Núñez@agro.pe ')).toBe('José.Núñez@agro.pe');
    });

    it('queda vacío si solo hay caracteres especiales', () => {
        expect(limpiarBusqueda('(,*)')).toBe('');
    });
});

describe('UT06 enlaceWhatsapp (HU09)', () => {
    it('agrega el código de Perú a un celular de 9 dígitos', () => {
        expect(enlaceWhatsapp('943 163 301')).toBe('https://wa.me/51943163301');
    });

    it('no repite el código si ya lo tiene', () => {
        expect(enlaceWhatsapp('+51 943 163 301')).toBe('https://wa.me/51943163301');
    });
});

describe('UT07 iniciales (HU09)', () => {
    it.each([
        ['Ana Pérez', 'AP'],
        ['  ana   maría torres ', 'AM'],
        ['Raiza', 'RA'],
        ['', '?'],
        [undefined, '?'],
    ])('%s', (nombre, esperado) => {
        expect(iniciales(nombre)).toBe(esperado);
    });
});

describe('Fechas relativas a hoy (HU09, HU11)', () => {
    const local = (dias, hora = 12) => new Date(2026, 10, 15 + dias, hora, 0);

    beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(local(0));
    });
    afterEach(() => vi.useRealTimers());

    it('UT08 diasDesde cuenta por fecha y no por horas', () => {
        expect(diasDesde(local(0, 0))).toBe(0);
        expect(diasDesde(local(-1, 23))).toBe(1);
        expect(diasDesde(local(-30))).toBe(30);
        expect(diasDesde(local(1))).toBe(-1);
    });

    it('UT09 fechaRelativa usa Hoy, Mañana y Ayer', () => {
        expect(fechaRelativa(local(0))).toMatch(/^Hoy, /);
        expect(fechaRelativa(local(1))).toMatch(/^Mañana, /);
        expect(fechaRelativa(local(-1))).toMatch(/^Ayer, /);
    });

    it('UT09 fechaRelativa muestra la fecha en los demás días', () => {
        const texto = fechaRelativa(local(5));
        expect(texto).not.toMatch(/Hoy|Mañana|Ayer/);
        expect(texto).toMatch(/20/);
        expect(texto).toMatch(/nov/i);
    });

    it('UT10 textoDias usa singular y plural', () => {
        expect(textoDias(local(0))).toBe('En esta etapa desde hoy');
        expect(textoDias(local(-1))).toBe('En esta etapa desde hace 1 día');
        expect(textoDias(local(-3))).toBe('En esta etapa desde hace 3 días');
    });
});

describe('UT11 Catálogos (HU08)', () => {
    it('la consultora solo elige medios que no vienen de la web', () => {
        expect(MEDIOS_MANUALES).not.toContain('web_formulario');
        expect(MEDIOS_MANUALES).not.toContain('web_asistente');
        for (const medio of MEDIOS_MANUALES) expect(MEDIOS, medio).toHaveProperty(medio);
    });

    it('todo interesado nuevo parte de una etapa conocida', () => {
        expect(ETAPAS).toHaveProperty('nuevo');
    });
});

describe('UT12 datosCambioEtapa (HU16)', () => {
    it('cambia a una etapa normal y borra el motivo de pérdida', () => {
        expect(datosCambioEtapa('cotizado', 'precio')).toEqual({ datos: { etapa: 'cotizado', motivo_perdida: null } });
    });
    it('exige motivo para marcar como perdido', () => {
        expect(datosCambioEtapa('perdido', '   ').error).toMatch(/motivo/);
    });
    it('guarda el motivo sin espacios sobrantes', () => {
        expect(datosCambioEtapa('perdido', '  Eligió otro proveedor ')).toEqual({ datos: { etapa: 'perdido', motivo_perdida: 'Eligió otro proveedor' } });
    });
    it('rechaza una etapa que no existe', () => {
        expect(datosCambioEtapa('ganado', '').error).toBeTruthy();
    });
});

describe('UT13 mensajesInteresado (HU09)', () => {
    const base = { nombre: 'María Fernández', empresa: 'Agroexport S.A.C.', etapa: 'nuevo', necesidad: 'Integrar ventas e inventario.' };
    it('arma el correo con nombre, solución, necesidad y firma', () => {
        const m = mensajesInteresado(base, { solucion: 'NAVASOFT ERP', consultora: 'Lucía Paredes' });
        expect(m.asunto).toBe('NAVASOFT ERP para Agroexport S.A.C. – EKAM PERÚ');
        expect(m.correo).toMatch(/^Hola, María:/);
        expect(m.correo).toContain('"Integrar ventas e inventario"');
        expect(m.correo).toMatch(/Lucía Paredes\nEKAM PERÚ/);
    });
    it('omite la necesidad y la empresa cuando faltan', () => {
        const m = mensajesInteresado({ nombre: 'Luis', etapa: 'nuevo' });
        expect(m.asunto).toBe('NAVASOFT – EKAM PERÚ');
        expect(m.correo).not.toContain('Nos comentó');
        expect(m.whatsapp).toMatch(/^Hola, Luis, le saludamos de EKAM PERÚ\./);
    });
    it('cambia el texto según la etapa', () => {
        expect(mensajesInteresado({ ...base, etapa: 'cotizado' }).correo).toContain('cotización');
        expect(mensajesInteresado({ ...base, etapa: 'demo_agendada' }).whatsapp).toContain('confirmar la demostración');
    });
    it('codifica los enlaces de correo y WhatsApp', () => {
        const m = mensajesInteresado(base);
        expect(enlaceCorreo('a@b.pe', m)).toMatch(/^mailto:a@b\.pe\?subject=.+&body=Hola%2C%20Mar%C3%ADa/);
        expect(enlaceWhatsapp('943 163 301', 'Hola, ¿qué tal?')).toBe('https://wa.me/51943163301?text=Hola%2C%20%C2%BFqu%C3%A9%20tal%3F');
    });
});

describe('UT14 agruparPorEtapa (HU17)', () => {
    it('crea una columna por etapa en el orden del embudo, aunque esté vacía', () => {
        const g = agruparPorEtapa([]);
        expect(Object.keys(g)).toEqual(Object.keys(ETAPAS));
        expect(g.nuevo).toEqual([]);
    });
    it('reparte cada interesado en su etapa y respeta el orden recibido', () => {
        const g = agruparPorEtapa([
            { id: 1, etapa: 'nuevo' }, { id: 2, etapa: 'cotizado' }, { id: 3, etapa: 'nuevo' },
        ]);
        expect(g.nuevo.map((x) => x.id)).toEqual([1, 3]);
        expect(g.cotizado.map((x) => x.id)).toEqual([2]);
    });
    it('ignora una etapa desconocida sin romper el tablero', () => {
        expect(() => agruparPorEtapa([{ id: 9, etapa: 'otra' }])).not.toThrow();
    });
});

describe('UT15 datosDemo y cruces (HU18)', () => {
    const ahora = new Date('2026-11-05T12:00:00');
    const form = { inicio: '2026-11-06T10:00', modalidad: 'virtual', consultora_id: 'u1', notas: '  Meet ' };
    it('arma la fila con la fecha en ISO y las notas sin espacios', () => {
        const { datos } = datosDemo(form, 'i1', ahora);
        expect(datos).toMatchObject({ interesado_id: 'i1', consultora_id: 'u1', modalidad: 'virtual', notas: 'Meet' });
        expect(new Date(datos.inicio).getTime()).toBe(new Date('2026-11-06T10:00').getTime());
    });
    it('rechaza fechas pasadas, sin consultora o con modalidad desconocida', () => {
        expect(datosDemo({ ...form, inicio: '2026-11-04T10:00' }, 'i1', ahora).error).toMatch(/futura/);
        expect(datosDemo({ ...form, consultora_id: '' }, 'i1', ahora).error).toMatch(/consultora/);
        expect(datosDemo({ ...form, modalidad: 'otra' }, 'i1', ahora).error).toBeTruthy();
        expect(datosDemo({ ...form, inicio: '' }, 'i1', ahora).error).toBeTruthy();
    });
    it('detecta cruces de la misma consultora a menos de una hora, solo si están programadas', () => {
        const demos = [
            { id: 1, consultora_id: 'u1', estado: 'programada', inicio: '2026-11-06T10:30' },
            { id: 2, consultora_id: 'u2', estado: 'programada', inicio: '2026-11-06T10:00' },
            { id: 3, consultora_id: 'u1', estado: 'cancelada', inicio: '2026-11-06T10:00' },
            { id: 4, consultora_id: 'u1', estado: 'programada', inicio: '2026-11-06T11:00' },
        ];
        expect(cruces(demos, { consultora_id: 'u1', inicio: '2026-11-06T10:00' }).map((d) => d.id)).toEqual([1]);
    });
    it('pasa a Demostración agendada solo desde Nuevo o Contactado', () => {
        expect(pasaADemoAgendada('nuevo')).toBe(true);
        expect(pasaADemoAgendada('contactado')).toBe(true);
        expect(pasaADemoAgendada('cotizado')).toBe(false);
    });
});

describe('UT16 semana de la agenda (HU18)', () => {
    it('la semana empieza el lunes, también si la fecha es domingo', () => {
        expect(claveDia(inicioSemana(new Date('2026-11-05T15:00')))).toBe('2026-11-02');
        expect(claveDia(inicioSemana(new Date('2026-11-08T23:00')))).toBe('2026-11-02');
        expect(claveDia(inicioSemana(new Date('2026-11-09T00:30')))).toBe('2026-11-09');
    });
    it('agrupa las demostraciones por día y las ordena por hora', () => {
        const dias = diasDeLaSemana(new Date('2026-11-02T00:00'), [
            { id: 'b', inicio: '2026-11-05T16:00' }, { id: 'a', inicio: '2026-11-05T09:00' }, { id: 'c', inicio: '2026-11-08T10:00' },
        ]);
        expect(dias).toHaveLength(7);
        expect(dias[3].demos.map((d) => d.id)).toEqual(['a', 'b']);
        expect(dias[6].demos.map((d) => d.id)).toEqual(['c']);
        expect(dias[0].demos).toEqual([]);
    });
    it('escribe el título de la semana con uno o dos meses', () => {
        expect(tituloSemana(new Date('2026-11-02T00:00'))).toBe('Semana del 2 al 8 de noviembre');
        expect(tituloSemana(new Date('2026-10-26T00:00'))).toBe('Semana del 26 de octubre al 1 de noviembre');
    });
});

describe('UT17 fecha de la demostración en el mensaje (HU09, HU18)', () => {
    const base = { nombre: 'Carlos Mendoza', etapa: 'demo_agendada' };
    it('cita el día, la hora y la modalidad de la próxima demostración', () => {
        const m = mensajesInteresado(base, { solucion: 'NAVASOFT ERP', demo: { inicio: '2026-11-06T10:00', modalidad: 'virtual' } });
        expect(m.correo).toContain('NAVASOFT ERP, el viernes 6 de noviembre a las 10:00 a. m. (virtual).');
        expect(m.whatsapp).toContain('el viernes 6 de noviembre');
    });
    it('sin demostración programada usa el texto general', () => {
        expect(mensajesInteresado(base).correo).toContain('que tenemos programada');
    });
});

describe('UT18 métricas del dashboard (HU19, HU22, HU23)', () => {
    const hoy = new Date('2026-11-15T12:00');
    const I = [
        { id: 'a', creado_en: '2026-11-02T10:00', etapa: 'cerrado', etapa_desde: '2026-11-12T10:00', sector: 'agro', solucion: 'erp', medio_contacto: 'whatsapp', consultora_id: 'u1' },
        { id: 'b', creado_en: '2026-11-05T10:00', etapa: 'perdido', motivo_perdida: 'Precio.', sector: 'agro', medio_contacto: 'web_formulario', consultora_id: 'u2' },
        { id: 'c', creado_en: '2026-10-20T10:00', etapa: 'cotizado', sector: 'comercio', medio_contacto: 'whatsapp', consultora_id: 'u2' },
        { id: 'd', creado_en: '2026-10-01T10:00', etapa: 'cerrado', etapa_desde: '2026-10-31T10:00', medio_contacto: 'llamada', consultora_id: 'u1' },
        { id: 'e', creado_en: '2026-09-15T10:00', etapa: 'perdido', motivo_perdida: 'precio', medio_contacto: 'llamada', consultora_id: null },
    ];
    const H = [
        { interesado_id: 'a', etapa_anterior: 'cotizado', etapa_nueva: 'cerrado', cambiado_en: '2026-11-12T10:00' },
        { interesado_id: 'b', etapa_anterior: 'nuevo', etapa_nueva: 'demo_agendada', cambiado_en: '2026-11-06T10:00' },
        { interesado_id: 'b', etapa_anterior: 'demo_agendada', etapa_nueva: 'perdido', cambiado_en: '2026-11-08T10:00' },
        { interesado_id: 'd', etapa_anterior: 'cotizado', etapa_nueva: 'cerrado', cambiado_en: '2026-10-21T10:00' },
    ];
    it('cuenta por mes incluyendo los meses en cero', () => {
        expect(interesadosPorMes(I, 3, hoy).map((m) => m.total)).toEqual([1, 2, 2]);
        expect(interesadosPorMes([], 6, hoy)).toHaveLength(6);
    });
    it('interesados del mes y diferencia con el anterior', () => {
        expect(interesadosDelMes(I, hoy)).toEqual({ actual: 2, diferencia: 0 });
    });
    it('conversión y tiempo de cierre usan la fecha del historial', () => {
        expect(conversion(I)).toEqual({ cerrados: 2, total: 5, tasa: 0.4 });
        // a: 2/11 -> 12/11 = 10 días; d: 1/10 -> 21/10 = 20 días
        expect(tiempoPromedioCierre(I, H)).toEqual({ dias: 15, cierres: 2 });
    });
    it('conversión por etapa cuenta la etapa más avanzada, aunque luego se pierda', () => {
        const c = conversionPorEtapa(I, H).map((x) => x.llegaron);
        // nuevo 5, contactado 4 (a,b,c,d), demo 4 (a,b,c,d), cotizado 3 (a,c,d), cerrado 2
        expect(c).toEqual([5, 4, 4, 3, 2]);
    });
    it('una venta deshecha no cuenta como cerrada en el embudo', () => {
        const deshecha = [{ id: 'z', etapa: 'contactado' }];
        const h = [
            { interesado_id: 'z', etapa_anterior: 'cotizado', etapa_nueva: 'cerrado' },
            { interesado_id: 'z', etapa_anterior: 'cerrado', etapa_nueva: 'contactado' },
        ];
        expect(conversionPorEtapa(deshecha, h).map((x) => x.llegaron)).toEqual([1, 1, 1, 1, 0]);
    });
    it('perdidos agrupa el motivo sin importar mayúsculas ni el punto final', () => {
        expect(perdidos(I)).toEqual({ total: 2, motivo: { texto: 'Precio', veces: 2 } });
    });
    it('cuenta por campo con nombres y deja "Sin dato" al final', () => {
        expect(contarPor(I, 'sector', { agro: 'Agroindustria' })).toEqual([
            { clave: 'agro', nombre: 'Agroindustria', total: 2 }, { clave: 'comercio', nombre: 'comercio', total: 1 },
            { clave: '', nombre: 'Sin dato', total: 2 },
        ]);
    });
    it('cierre por consultora y demos realizadas del mes', () => {
        expect(cierrePorConsultora(I, H)).toEqual([{ consultora_id: 'u1', cerrados: 2, dias: 15 }]);
        expect(demosRealizadasDelMes([
            { estado: 'realizada', inicio: '2026-11-03T10:00' }, { estado: 'cancelada', inicio: '2026-11-03T10:00' },
            { estado: 'realizada', inicio: '2026-10-03T10:00' },
        ], hoy)).toBe(1);
    });
    it('el CSV usa ";", BOM y comillas cuando hace falta', () => {
        const csv = aCsv([{ n: 'Pérez; Ana', e: 'Dijo "sí"' }], [{ titulo: 'Nombre', valor: (f) => f.n }, { titulo: 'Nota', valor: (f) => f.e }]);
        expect(csv).toBe('﻿Nombre;Nota\r\n"Pérez; Ana";"Dijo ""sí"""');
    });
});
