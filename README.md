# CRM EKAM

Sistema interno de EKAM PERU S.A.C. para registrar a los interesados, darles seguimiento y medir el embudo de ventas. Forma parte de la plataforma comercial junto con la web [ekamperu.com](https://www.ekamperu.com).

- **Aplicación:** React + Vite, instalable como PWA en el celular.
- **Datos e inicio de sesión:** Supabase (PostgreSQL, Auth y permisos por fila). El esquema está en el repositorio de la web, en `crm/supabase/`.
- **Publicación:** subdominio `crm.ekamperu.com` en el cPanel de la empresa.

## Desarrollo

```bash
npm install
cp .env.example .env   # y completar la URL y la clave publicable del proyecto
npm run dev            # http://localhost:5173
```

## Publicar

```bash
npm run build
```

Sube el contenido de `dist/` (incluido `.htaccess`) a la carpeta del subdominio en cPanel.

La clave publicable puede ir en el navegador: lo que cada usuario puede ver o cambiar lo deciden las políticas de la base de datos. La clave de servicio nunca va en este repositorio.
