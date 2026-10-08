# Mapa del frontend principal

## Entrada y estructura

`src/main.tsx` inicia la aplicación. `src/App.tsx` declara las rutas con React Router. `src/auth/AuthContext.tsx` mantiene usuario, restauración de sesión, login y logout. `src/layout` contiene layout, barra superior, menú y `ProtectedRoute`. `src/routes/routeMeta.ts` aporta metadatos de navegación.

`src/api` contiene servicios tipados por módulo. `src/lib/sessionClient.ts` implementa renovación coordinada y solicitudes protegidas, y `src/api/client.ts` adapta esa lógica al navegador y configura la URL de la API. `src/lib` contiene además formatos y etiquetas de entidades/estados. `src/pages` reúne pantallas y sus componentes específicos. Se usa Recharts para visualizaciones.

## Rutas

| Ruta | Módulo |
|---|---|
| `/login` | Inicio de sesión con contraseña y segundo factor cuando corresponde |
| `/aceptar-invitacion` | Flujo público para contraseña y MFA de cuenta invitada |
| `/configurar-mfa` | Configuración con token restringido |
| `/comercial`, `/operativo`, `/usuarios`, `/funcional` | Indicadores y consultas |
| `/juegos` | Catálogo, gestión y vista previa |
| `/tickets` | Soporte |
| `/contenido` | Contenido |
| `/catalogos` | Marketplace |
| `/moderacion` | Moderación |
| `/auditoria` | Consulta y detalle de auditoría, admin |
| `/cuentas` | Gestión de cuentas internas e invitaciones, admin |
| `/seguridad` | Configuración de seguridad de la cuenta propia |
| `/perfil` | Perfil propio de solo lectura, disponible para todos los roles autenticados |
| `/config`, `/legales` | Pantallas placeholder |

`ProtectedRoute` exige sesión y consulta el mapa de módulos de `src/routes/permissions.ts`; el menú utiliza el mismo mapa. Login obtiene `/auth/me` para disponer de permisos antes de habilitar rutas. La opción `adminOnly` conserva la restricción adicional de cuentas/auditoría. Una ruta rechazada redirige al primer módulo permitido, con seguridad propia como alternativa. No equiparar acceso de consulta con permiso de modificar datos: los botones de escritura tienen un alcance independiente.

`pages/perfil/ProfilePage.tsx` consulta `/auth/me` mediante `api/profile.ts`; `ProfileDetails.tsx` muestra ID, nombre, correo, rol, permisos de consulta, último login y estado MFA. La fecha se presenta en America/Santiago. Incluye carga, error y reintento, y enlace a seguridad. No permite editar datos ni consultar otras cuentas. `/perfil` y `/seguridad` son accesibles a cualquier cuenta autenticada sin exigir un permiso de módulo.

## Flujos sensibles

`apiFetch` usa el access vigente, coordina refresh simultáneo, reintenta una sola vez el 401 y notifica expiración. El contexto escucha `agecare-session-expired`. Tokens en `sessionStorage`: `agecare_access_token`, `agecare_refresh_token`. El token restringido de MFA se guarda separadamente como `agecare-mfa-enrollment`; no equivale a una sesión autenticada.

`InvitationPage` consume el token del fragmento del enlace. `MfaProvision` muestra QR local y secreto; `RecoveryCodes` muestra códigos y permite descargarlos, exigiendo confirmación de guardado. `SecurityPage` permite configurar MFA, renovar recuperación y desactivar MFA opcional. Renovar no debe cerrar sesión. Desactivar sí requiere invalidar el acceso. El reemplazo del autenticador perdido mediante autorización administrativa no está implementado.

La administración de cuentas utiliza `api/staff.ts`, `api/accountAccess.ts` y `pages/cuentas`. La auditoría usa `api/audit.ts`, `pages/auditoria` y etiquetas `lib/auditMeta.ts`. Los juegos usan `api/gamesApps.ts` y `pages/juegos`; `mockGamesData.ts` existe, por lo que debe revisarse el consumidor antes de afirmar que toda vista previa utiliza exclusivamente datos reales.

## Entorno y ejecución

`VITE_API_BASE_URL` tiene como fallback `http://localhost:8000/api/v1/admin`. Se necesita una API accesible y CORS compatible. Vite suele servir desarrollo en 5173; comprueba el puerto efectivo. Las variables Vite se incorporan al iniciar/compilar y no son secretos del servidor.

```powershell
npm.cmd ci
npm.cmd run dev
npm.cmd test
npm.cmd run build
```

`ci` instala dependencias desde el lockfile cuando sea necesario; no ejecutarlo para una revisión documental. `preview` permite servir el build localmente y no constituye despliegue de producción. El hosting debe resolver rutas de React Router hacia `index.html`.

## Presentación y limitaciones

Tema por `data-theme`, persistencia de preferencia `agecare-theme` y selección inicial según preferencia/sistema. Usa variables CSS en vez de fijar colores que rompan el tema.

La pantalla operativa consulta al montar, sin refresco periódico. Métricas/monitoreo consumen datos agregados del backend y no acreditan integraciones reales. No todas las capacidades de la API tienen formulario en esta consola. Verifica la pantalla y el router de cada módulo antes de describir una función como disponible de extremo a extremo.
