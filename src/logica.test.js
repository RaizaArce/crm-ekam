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
