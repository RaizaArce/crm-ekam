// CRM EKAM - Administración de usuarios (RF08).
// Crear usuarios, desactivarlos y restablecer contraseñas necesita la clave de
// servicio, que solo existe aquí, en el servidor de Supabase (RNF03).
// Quien llama debe ser un administrador activo: se comprueba con su propia sesión.
import { createClient } from 'npm:@supabase/supabase-js@2';

const CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function responder(cuerpo: unknown, estado = 200) {
    return new Response(JSON.stringify(cuerpo), {
        status: estado,
        headers: { ...CORS, 'Content-Type': 'application/json' },
    });
}

const ROLES = ['administrador', 'consultora'];
// Un usuario desactivado queda bloqueado en Auth por 100 años.
const BLOQUEO = '876000h';

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
    if (req.method !== 'POST') return responder({ error: 'Método no permitido' }, 405);

    const url = Deno.env.get('SUPABASE_URL')!;
    const comoUsuario = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, {
        global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
    });

    const { data: usuario } = await comoUsuario.auth.getUser();
    const { data: esAdmin } = await comoUsuario.rpc('es_admin');
    if (!usuario?.user || esAdmin !== true) {
        return responder({ error: 'Solo el administrador puede gestionar usuarios' }, 403);
    }

    const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

    let datos: Record<string, unknown>;
    try {
        datos = await req.json();
    } catch {
        return responder({ error: 'Solicitud no válida' }, 400);
    }

    const id = typeof datos.id === 'string' ? datos.id : '';
    const clave = typeof datos.clave === 'string' ? datos.clave : '';

    switch (datos.accion) {
        case 'crear': {
            const correo = String(datos.correo ?? '').trim().toLowerCase();
            const nombre = String(datos.nombre ?? '').trim();
            const rol = String(datos.rol ?? 'consultora');
            if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(correo) || !nombre || nombre.length > 120 || !ROLES.includes(rol)) {
                return responder({ error: 'Revisa el nombre, el correo y el rol' }, 400);
            }
            if (clave.length < 8) return responder({ error: 'La contraseña debe tener al menos 8 caracteres' }, 400);

            const { data, error } = await admin.auth.admin.createUser({
                email: correo,
                password: clave,
                email_confirm: true,
                user_metadata: { nombre },
            });
            if (error) {
                const existe = error.message.toLowerCase().includes('already');
                return responder({ error: existe ? 'Ya existe un usuario con ese correo' : 'No se pudo crear el usuario' }, 400);
            }

            // El trigger crear_perfil (003_usuarios.sql) crea el perfil desactivado;
            // aquí se activa con el rol elegido. Si falla, no se deja el usuario a medias.
            const { error: errorPerfil } = await admin.from('perfiles')
                .update({ nombre, rol, activo: true })
                .eq('id', data.user.id);
            if (errorPerfil) {
                await admin.auth.admin.deleteUser(data.user.id);
                return responder({ error: 'No se pudo crear el usuario' }, 400);
            }
            return responder({ id: data.user.id });
        }

        case 'estado': {
            const activo = datos.activo === true;
            if (!id) return responder({ error: 'Falta el usuario' }, 400);
            if (id === usuario.user.id && !activo) {
                return responder({ error: 'No puedes desactivar tu propio usuario' }, 400);
            }
            const { error: errorPerfil } = await admin.from('perfiles').update({ activo }).eq('id', id);
            if (errorPerfil) return responder({ error: 'No se pudo actualizar el usuario' }, 400);
            // Además de quitarle el acceso a los datos, se le impide volver a iniciar sesión.
            const { error } = await admin.auth.admin.updateUserById(id, { ban_duration: activo ? 'none' : BLOQUEO });
            if (error) return responder({ error: 'No se pudo actualizar el acceso del usuario' }, 400);
            return responder({ ok: true });
        }

        case 'clave': {
            if (!id) return responder({ error: 'Falta el usuario' }, 400);
            if (clave.length < 8) return responder({ error: 'La contraseña debe tener al menos 8 caracteres' }, 400);
            const { error } = await admin.auth.admin.updateUserById(id, { password: clave });
            if (error) return responder({ error: 'No se pudo cambiar la contraseña' }, 400);
            return responder({ ok: true });
        }

        default:
            return responder({ error: 'Acción no válida' }, 400);
    }
});
