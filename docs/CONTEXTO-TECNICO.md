# Mapa del frontend principal

Fase 05: OperativoPage ahora consulta secciones independientes, selecciona 1h/24h/7d y componentes, muestra p50/p95/muestras/fechas y distingue entrega push/generación IA. Tarjetas no convierten p50 null en cero; procesos muestran fecha y origen/tipo de ejecución. Actualización al entrar/filtros/botón, sin polling. Backend requiere 0008 para procedencia persistente; no hay recolector real integrado. Tests operativos de filtro, respuesta tardía, vacíos y errores aislados aprobados. Aceptación visual aprobada por el usuario el 26 de octubre de 2026 con tres capturas; fase 05 cerrada funcionalmente en consulta, fuentes reales pendientes. Ver seguimiento de fase 05 y docs/monitoreo-operativo.md del backend.

Fase 04 (26 de octubre de 2026): ComercialPage consulta cada sección de forma independiente, conserva fechas/cortes/origen/frescura y permite seleccionar una cohorte mensual sin cambiar el período del resumen. Presenta ambas tasas, seguimiento provisional, fuentes antiguas y descargas separadas. No transforma null en cero; RegistrationsChart rechaza series desalineadas. Unidad facturable pendiente: tabla de planes dice «Cantidad registrada». Contrato y límites en el backend: `docs/analitica-comercial.md`. Hay pruebas en `tests/commercial.test.cjs`; falta aceptación visual del usuario y fuentes reales posteriores. No declarar fase cerrada.

## Entrada y estructura

`src/main.tsx` inicia la aplicación. `src/App.tsx` declara las rutas con React Router. `src/auth/AuthContext.tsx` mantiene usuario, restauración de sesión, login y logout. `src/layout` contiene layout, barra superior, menú y `ProtectedRoute`. `src/routes/routeMeta.ts` aporta metadatos de navegación.

`src/api` contiene servicios tipados por módulo. `src/lib/sessionClient.ts` implementa renovación coordinada y solicitudes protegidas, y `src/api/client.ts` adapta esa lógica al navegador y configura la URL de la API. `src/lib` contiene además formatos y etiquetas de entidades/estados. `src/pages` reúne pantallas y sus componentes específicos. Se usa Recharts para visualizaciones.

## Rutas

RF03.04 actualizado el 26 de octubre según Matriz-Permisos.md: `canManageTickets` y `canManageMarketplace` en `routes/permissions.ts` controlan las acciones de tickets (admin/support) y marketplace (admin/editor). Analyst conserva detalle e historial/notas de tickets sin formas de modificación; moderator conserva valores de producto y datos de cuidadoras sin inputs ni acciones. Nuevos formularios verifican rol si se montan directamente y los handlers bloquean escritura sin permiso. TicketDetail solicita agentes solo con permiso de gestión; `api/tickets.ts` usa `/support/agents` (array id/full_name), no `/users`; `assigned_to.name` coincide con schema backend. 37 pruebas frontend aprobadas y build aprobado. Revisión visual pendiente. No modificar matriz para conceder staff a support.

El 25 de octubre de 2026 se ajustó RF03.04/RF03.05 en juegos: `canManageGames` en `lib/gamesMeta.ts` permite escritura visual solo a admin/editor. `JuegosPage` oculta creación/formulario; `GamesTable` oculta edición/eliminación y cambia el estado a etiqueta para lectura; `GamesPreviewPanel` oculta el menú de activación/desactivación. Analyst/support/moderator conservan filtros y vista previa. También se adaptan textos y se bloquean handlers de estado/eliminación sin permiso. No se modificó backend: su matriz WRITE sigue siendo la autorización efectiva. Pruebas renderizadas de cinco roles, rol desconocido y sesión ausente: suite completa de 31 pruebas y build aprobados. Validación manual del usuario pendiente; no implica cierre de fase 3.

Contenido de fase 10 incorpora candidatos persistentes (`NewsCandidates.tsx`), comparación original/propuesta, revisión de procedencia con motivo, adaptación manual o Gemini y creación de borrador. El editor permite programación, aprobación de versión, audio autenticado con blob y errores legibles; eliminar solo visible a admin. Página real y controles de navegación. Runtime informa worker/Gemini no habilitados; actualizar consulta estados, sin polling periódico. Backend exige permisos y versión, no confiar solo en botones. Integración externa y revisión visual siguen pendientes; contrato en docs/contenido-editorial.md del backend.

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
| `/config` | Consulta y edición de parámetros existentes, admin |
| `/legales` | Pantalla placeholder |

`ProtectedRoute` exige sesión y consulta el mapa de módulos de `src/routes/permissions.ts`; el menú utiliza el mismo mapa. Login obtiene `/auth/me` para disponer de permisos antes de habilitar rutas. La opción `adminOnly` conserva la restricción adicional de cuentas/auditoría. Una ruta rechazada redirige al primer módulo permitido, con seguridad propia como alternativa. No equiparar acceso de consulta con permiso de modificar datos: los botones de escritura tienen un alcance independiente.

`pages/perfil/ProfilePage.tsx` consulta `/auth/me` mediante `api/profile.ts`; `ProfileDetails.tsx` muestra ID, nombre, correo, rol, permisos de consulta, último login y estado MFA. La fecha se presenta en America/Santiago. Incluye carga, error y reintento, y enlace a seguridad. No permite editar datos ni consultar otras cuentas. `/perfil` y `/seguridad` son accesibles a cualquier cuenta autenticada sin exigir un permiso de módulo.

## Flujos sensibles

El menú principal oculta grupos vacíos tras filtrar permisos. “Sistema” agrupa cuentas, auditoría, configuración y legales. “Mi cuenta” está al pie junto al nombre/avatar y ofrece perfil, seguridad y cierre de sesión para todos los roles autenticados. Las migas de perfil y seguridad usan “Mi cuenta”. No es un cambio del contrato de API ni de permisos.

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
