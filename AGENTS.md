# Frontend principal — guía para agentes

React + TypeScript + Vite. Lee [docs/CONTEXTO-TECNICO.md](docs/CONTEXTO-TECNICO.md). Es el único frontend del proyecto.

- Mantén páginas en `src/pages/<modulo>`, servicios en `src/api`, componentes compartidos en `src/components`, utilidades en `src/lib` y estructura visual en `src/layout`.
- Para peticiones protegidas utiliza `apiFetch` de `src/api/client.ts`; no implementes refresh independiente ni captures un token una sola vez para futuras llamadas.
- Para invitaciones y configuración pública de MFA sigue `src/api/accountAccess.ts`, que distingue peticiones públicas y autenticadas.
- No pongas claves del servidor ni secretos SMTP en variables `VITE_*`: esas variables son públicas en el bundle.
- La autorización efectiva está en el backend. Menú y rutas usan los permisos del perfil en `src/routes/permissions.ts`; esto no acredita que todos los botones de modificación se oculten para roles de lectura.
- Usa los estilos existentes y variables de tema en `src/index.css`. Preserva el comportamiento de tema claro/oscuro.
- No reconstruyas el rastreo de clics como auditoría. La vista consume cambios de negocio registrados por el backend.
- No registres tokens, secretos QR, códigos de recuperación o contraseñas. Respeta el carácter de una sola visualización de los códigos.

Verificaciones desde esta carpeta:

```powershell
npm.cmd test
npm.cmd run build
# Para revisar los archivos cambiados, o toda la base si la tarea lo justifica:
npm.cmd run lint
```

El build genera `dist`; no editarlo como fuente. No asumir que el lint completo ya carece de incidencias previas. Los tests existentes cubren principalmente servicios y lógica de sesiones; una compilación correcta no acredita todos los flujos visuales.
