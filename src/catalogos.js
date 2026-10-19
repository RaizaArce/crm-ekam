import { useEffect, useState } from 'react';
import { supabase } from './supabase.js';

// Textos de los tipos enumerados de 001_esquema.sql
export const ETAPAS = {
    nuevo: 'Nuevo',
    contactado: 'Contactado',
    demo_agendada: 'Demostración agendada',
    cotizado: 'Cotizado',
    cerrado: 'Cerrado (venta)',
    perdido: 'Perdido',
};

export const MEDIOS = {
    web_formulario: 'Formulario web',
    web_asistente: 'Asistente web',
    whatsapp: 'WhatsApp',
    llamada: 'Llamada',
    recomendacion: 'Recomendación',
    soporte: 'Soporte',
    otro: 'Otro',
};

// La consultora registra a mano a quien llega por estos medios (RF09).
// Los de la web los registra el formulario o el asistente.
export const MEDIOS_MANUALES = ['whatsapp', 'llamada', 'recomendacion', 'soporte', 'otro'];

// Mismos códigos que el <select id="formTiming"> del formulario de la web.
export const PLAZOS = {
    'este-mes': 'Este mes',
    '1-3-meses': 'En 1 a 3 meses',
    evaluacion: 'Evaluando opciones',
    soporte: 'Soporte o mejora de una implementación actual',
};

// Misma versión que PRIVACY_POLICY_VERSION en js/main.js de la web.
export const VERSION_POLITICA = '2026-10-16';

// Sectores, soluciones y usuarios para los selectores.
export function useCatalogos() {
    const [catalogos, setCatalogos] = useState({ sectores: [], soluciones: [], usuarios: [], listo: false });

    useEffect(() => {
        let cancelado = false;
        Promise.all([
            supabase.from('sectores').select('codigo, nombre').eq('activo', true).order('nombre'),
            supabase.from('soluciones').select('codigo, nombre').eq('activo', true).order('nombre'),
            supabase.from('perfiles').select('id, nombre, rol, activo').order('nombre'),
        ]).then(([sectores, soluciones, usuarios]) => {
            if (cancelado) return;
            setCatalogos({
                sectores: sectores.data ?? [],
                soluciones: soluciones.data ?? [],
                usuarios: usuarios.data ?? [],
                listo: true,
            });
        });
        return () => { cancelado = true; };
    }, []);

    return catalogos;
}

export function fecha(valor) {
    return valor ? new Date(valor).toLocaleDateString('es-PE', { dateStyle: 'medium' }) : '';
}

// Errores de la base de datos en palabras de la consultora.
export function mensajeError(error) {
    const m = error?.message ?? '';
    if (m.includes('interesados_con_contacto')) return 'Ingresa al menos un teléfono o un correo.';
    if (m.includes('ruc')) return 'El RUC debe tener 11 dígitos.';
    if (m.includes('row-level security') || error?.code === '42501') return 'No tienes permiso para hacer esto.';
    if (m.includes('Failed to fetch')) return 'Sin conexión. Revisa tu internet e inténtalo de nuevo.';
    return 'No se pudo guardar. Inténtalo de nuevo.';
}
