# Mapa del frontend principal

Preparación Vercel (29 de octubre): vercel.json define Vite, npm run build, dist y fallback de rutas a index.html; .env.example publica solo VITE_API_BASE_URL. En Vercel establecer URL HTTPS de Render con /api/v1/admin antes de compilar, nunca secretos. Decisión: API/juegos en Render y PostgreSQL Neon. Sin publicación ni conexión externa todavía; estrategia de datos pendiente de usuario. [Seguimiento](../../docs/DESPLIEGUE-VERCEL-RENDER-NEON.md).

Vista previa de juegos corregida en backend/script estático: conservar sandbox="allow-scripts allow-forms allow-popups" de GamesPreviewPanel. GameStaticFiles permite HEAD público sin credenciales desde origen opaco y guard usa credentials:omit; no hay que abrir otra pestaña ni ampliar permisos del iframe para jugar. Actualizar backend y recargar el iframe; no requiere rebuild de React. Verificación real en API temporal SQLite: carta de Memorama revelada, partida continúa y se detiene al desactivar. Seis pruebas Node seleccionadas aprobadas. [Integración](../../agecare%20back%20rolo/agecare_administracion/docs/diagnostico-vista-previa-juegos.md).

Fase18 demo autorizada: /usuarios-app → EndUsersPage en Operación, permiso end_users solo admin y guard interno; mantiene /usuarios analítica y /cuentas personal. api/endUsers.ts usa apiFetch, páginas25 y cinco rutas administrativas nuevas; valida procedencia demo_only y mobile_sessions_revoked=false, no presenta origen desconocido como real. Dos pestañas, filtros con total/páginas, clave de consulta+AbortController descarta respuestas tardías, selección cruzada de cuenta/paciente. DirectoryDetail muestra miembros/perfil por paciente, no rol global ni información clínica. DeactivateDialog exige motivo5–500+casilla y conserva error/texto, sin cierre por clic exterior. Banner/confirmación/éxito explican simulación sin bloqueo móvil real. Datos inactivos persisten tras reconstrucción segura del backend. Tema/estilos existentes, sin rediseño general. 110 pruebas frontend completas, build/lint correctos; revisión visual pendiente. [Guía](../../agecare%20back%20rolo/agecare_administracion/docs/usuarios-pacientes-demo.md).

**Cierre funcional de fase 17 — 27 de octubre de 2026:** usuario confirmó registro de login y aprobó la revisión restante. Auditoría cerrada en el alcance acordado, con pruebas automatizadas y PostgreSQL temporal documentados. Los estados Por validar de la entrega inicial son históricos; no se afirma inspección directa de permisos de la base habitual ni nuevos respaldos.

Fase 16: el usuario confirmó la revisión de la consola y sus pruebas el 27 de octubre de 2026. Administración cerrada en ese alcance; reaceptación/integración móvil pendientes por separado. La descripción Por validar de la entrega inicial siguiente es histórica.

Fase 17: auditoría incluye logins correctos/fallidos y consultas de conversación autorizados por el usuario; mantener fuera clics/navegación. api/audit.ts conserva rutas/listado/exportación y añade filtros entity_type/entity_id. AuditoriaPage muestra período implícito (30 días) y máximo90, convierte horas locales a UTC y admite UUID de actor eliminado con sugerencias actuales. AuditDetail muestra identidad histórica/IP/navegador/resultado y motivo legible; no rutas HTTP ni HTML ejecutable. Filtros por todas las acciones registradas; no botones de edición/borrado. 103 pruebas frontend, build y lint aprobados; revisión visual pendiente. Backend requiere 0011 y nuevo arranque limitado de Compose; no se aplicó a base habitual. [Contrato](../../Requerimientos/fase-17/requisitos.md).

Fase 16: /legales ahora LegalPage con ProtectedRoute adminOnly y guard interno. api/legal.ts usa GET documentos y POST creación/publicación existentes; lectura detallada distinta del resumen devuelto por mutaciones. Listas por tipo, filtro, selección de texto/histórico, estados separados de publicación/vigencia suministrados por API. LegalDraftForm no pierde campos ante error ni publica al guardar; fecha sugerida viene de API y aviso se revalida al publicar. legalMeta formatea Santiago en 24 h y fecha civil sin desplazarla; Markdown se muestra como texto escapado, no HTML. Reaceptación móvil pendiente, aviso visible. 100 pruebas frontend y build/lint aprobados; fase Por validar. [Reglas](../../Requerimientos/fase-16/requisitos.md).

Fase 14: ModerationPage pagina/filtra con claves de consulta, descarta respuestas anteriores y remonta detalle por ID. ModerationDetail permite nota y motivos reales, preserva texto ante error, muestra prioridad e histórico legible con decisión/nota/motivo/fecha/responsable. Admin/moderator gestionan; no notas automáticas. Fotos/mensajes no se muestran ni admiten decisiones hasta integrar acceso temporal (también restringido en backend); no confiar en una URL del content heredado. La decisión local no publica/oculta aún el contenido fuente; aviso visible. Notificaciones y escalamiento excluidos. Sin nuevas rutas ni rediseño general; [pendientes](../../Requerimientos/fase-14/requisitos.md), fase Por validar.

**Cierre administrativo de fase 13 — 27 de octubre de 2026:** usuario aprobó gestión de artículos y restauración a borrador y pidió confirmar cierre. Administración cerrada en el alcance acordado. T13.06 (vitrina pública, RF13.12 y parte pública de RF13.01/09) sigue pendiente por separado, sin certificación de integración. Los estados Por validar de los relatos siguientes son históricos. Consulta sobre sesión al reconstruir Docker no produjo cambios de autenticación ni causa confirmada; en la última comprobación del usuario la sesión se conservó.

**Restauración de artículos (27 de octubre de 2026):** autorizada e implementada transición archived → draft mediante PATCH existente y botón «Restaurar a borrador» para admin/editor. Conserva registro/datos, actualiza fecha y audita; no publicar desde archived directamente. RF13.03/RF13.11 actualizados; este ajuste sustituye la regla previa de archivo terminal. Sin migración ni rutas nuevas. Validación visual pendiente.

Fase 13: ProductsPanel incorpora categoría/páginas y descarta resultados anteriores por clave de consulta. ProductDetail se remonta por ID/updated_at, muestra metadatos/imagen/enlace/precio referencial, envía diferencias y null para quitar precio/imagen; 0 se conserva. Estado via PATCH existente: publicar, volver a borrador, archivar y restaurar a borrador. Guardar edición antes de cambiar estado; moderator solo consulta. Sin compra/pagos/varias imágenes ni ampliación de cuidadoras. 90 pruebas frontend y build/lint aprobados; revisión visual pendiente. No hay vitrina pública integrada; [alcance y pendientes](../../Requerimientos/fase-13/requisitos.md).

**Cierre de fase 11 — 27 de octubre de 2026:** el usuario confirmó «cumplimos con lo rf de la fase 11». Consola/juegos servidos por API cerrados funcionalmente en el alcance acordado, con excepción informada para externos y formulario sin cierre por clic exterior. Validación móvil pendiente por separado (T11.08), no certificada. Los estados Por validar de las entregas siguientes son históricos.

GameFormModal no se cierra al pulsar el fondo exterior, por petición del usuario (27 de octubre de 2026). Conservar este comportamiento al tocar el modal: cierre explícito mediante Cancelar o guardado correcto, para evitar perder cambios accidentalmente.

**Ajuste posterior de fase 11 (27 de octubre):** el usuario autorizó también juegos externos. Sustituye las restricciones exclusivas a juegos propios descritas más abajo. Campo URL bloqueado inicialmente, casilla para modificar/restaurar; admin/editor gestionan. Externos solo HTTPS válido sin credenciales ni espacios, sin sondeos de red; backend devuelve resource_kind local/external y conserva URL externa. Desactivar un externo solo lo retira del catálogo, sin bloquear otra web ni detener partidas: aviso visible antes de guardar, en información y vista previa. Los propios conservan bloqueo estático y control de partidas. Cambio de ficha propia a externa también bloquea sus antiguos archivos locales. Sin migración adicional. 55 pruebas backend y 6 frontend seleccionadas aprobadas, build correcto. Fase Por validar visualmente.

Fase 11: JuegosPage busca por nombre y filtra estado mediante is_active existente, con resultados asociados a su consulta. GamesTable muestra información/fechas/creador. GameFormModal valida límites, genera ruta local según slug, crea inactivo y envía solo diferencias al editar, sin slug/estado. Servidor solo acepta juegos alojados en AgeCare; archivos deben desplegarse antes, no hay upload. Tipo fetchActiveGamesApps corregido a array real. Backend 0010 y GameStaticFiles/control compartido obligatorios para creador/bloqueo de partidas: reconstruir API conservando datos. 85 pruebas frontend aprobadas y build/lint; fase Por validar visualmente, móvil pendiente. Rediseño general diferido. [Alcance](../../Requerimientos/fase-11/requisitos.md).

Fase 09 cerrada funcionalmente en el alcance acordado el 27 de octubre de 2026, tras revisión y aprobación del usuario. Directorio móvil real pendiente por separado. Mejora de diseño diferida por el usuario: texto demasiado junto; revisar espaciado/interlineado/legibilidad más adelante, sin cambios visuales ahora. Las referencias siguientes a validación pendiente son históricas.

Fase 09 (27 de octubre): TicketsPage incorpora filtros existentes, orden y consulta asociada a su clave para descartar resultados anteriores; TicketsTable muestra solicitante/responsable. NewTicketForm intenta confirm_unlinked=false y solo repite con true tras confirmación explícita del usuario sobre el mismo payload. TicketDetail envía PATCH solo de campos cambiados (omisión conserva responsable, null desasigna), ofrece transiciones válidas, edita prioridad/categoría y muestra contexto anidado con TicketContext/CSAT existente. fetchTicketReplies devuelve página completa de 25 y propaga errores; historial paginado identifica público/interno. Solo admin/support gestionan y consultan /support/agents; analyst conserva lectura y filtro de agentes presentes en la página, sin ampliar permisos del catálogo. Decisión posterior: no notificar ni enviar encuestas; RF09.09 eliminado del alcance. La UI ya no anuncia notificaciones pendientes; conserva consulta de CSAT histórico. 82 pruebas frontend y build/lint aprobados; fase Por validar visualmente. [Alcance](../../Requerimientos/fase-09/requisitos.md).

Fase 08 cerrada funcionalmente por aceptación del usuario el 27 de octubre de 2026. Las referencias siguientes a validación pendiente son históricas.

Ampliación de fase 08 autorizada: API devuelve calculation_details por celda, con estado/causa. HeatmapTable distingue No aplica/No calculable/cero y muestra motivo; featureCalculationMeta centraliza textos y porcentajes positivos pequeños (<0,1 %). Ranking/alertas solo se presentan como validados con calculable_only=true; API antigua sin campo recibe aviso. Null sin causa no se etiqueta No aplica. Reconstruir API para recibir estos campos, sin migración. La limitación de API descrita en la primera entrega siguiente fue corregida; fase Por validar visualmente.

Fase 08: FuncionalPage consulta adoption/top/alerts independientemente, muestra computed_at existente, configura límite 1–5 y umbral 1–50 % (se envía /100). FeatureAlertList separa expected_low y muestra todos los avisos con perfiles/contexto. HeatmapTable distingue null/cero y rechaza desalineación. No se corrige en frontend la ausencia de causa de cálculo del backend: RF08.04–06 pendientes y documentados en Requerimientos/fase-08. La API devuelve cero si falta denominador y puede rankearlo/alertarlo; no eliminar todos los ceros ni inventar estados. Sin cambio de backend; revisión visual pendiente.

Fase 07 cerrada funcionalmente el 27 de octubre tras aprobación visual del usuario de los rangos semanales. Aplican los límites de API acordados y documentados en requisitos/seguimiento; las referencias a aceptación pendiente de las entregas anteriores siguientes quedan superadas. Sin cambios de código al registrar el cierre.

Ampliación puntual de fase 07 autorizada: RolesWeekly acepta week_details con start_date/end_date/is_current_week. UsuariosPage muestra período y rangos semanales, RoleWeeklyChart etiquetas cortas con mes/año y tooltip completo; semana en curso marcada como parcial. Fecha civil formateada en UTC para evitar desfase del navegador, mientras el indicador de semana actual lo calcula el backend con calendario Santiago. Compatibilidad con API anterior: aviso de fechas ausentes y etiquetas previas sin inventar mes. Sin cambios de base; reconstruir API para recibir el campo nuevo. 63 tests frontend aprobados, revisión visual pendiente.

Fase 07 (27 de octubre): UsuariosPage consulta independientemente actividad por perfil, serie semanal, resumen de soporte, categorías y tickets recientes. Selectores 7/30/90 días, 2–26 semanas y 1–365 días de categorías; protección ante respuestas tardías. api/usersSupport.ts conserva metadatos ya existentes; RoleWeeklyChart valida longitudes y no agrega ceros. Se separan conteos actuales de resultados de 30 días, CSAT null, períodos aplicados y ventanas fijas de crecimiento/retención. No se muestra open_wow aproximado ni fecha de categorías inexistente. API de producción sin cambios por acuerdo del usuario; ampliaciones en Requerimientos/fase-07/requisitos.md. 59 tests frontend y 33 de API/permisos aprobados; aceptación visual pendiente.

Fase 06: IncidentsPanel sustituye la lista breve al final de OperativoPage con filtros, páginas y detalle. IncidentForm permite crear/editar solo a admin/support (canManageIncidents), conserva consulta para analyst y envía PATCH parcial. Cierre exige nota; mantenimientos e incidentes ofrecen transiciones distintas. El backend añade notification_status en 0009; se muestra correo no configurado sin bloquear el registro. Cliente api/incidents.ts y etiquetas lib/incidentsMeta.ts. Pruebas locales y aceptación del usuario aprobadas; fase 06 cerrada funcionalmente el 27 de octubre de 2026. No se añadieron rutas ni menú; ver seguimiento de fase 06.

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

## Claridad de revisión de noticias — 2 de noviembre de 2026

Por petición del usuario, NewsCandidates separa tres pasos: procedencia, adaptación Gemini y revisión/guardado del borrador. La procedencia persistida usa rights_status del servidor, con estado visible y botones aria-pressed; descartar/mantener se distingue de procedencia. Texto original plegado y con alto limitado, propuesta destacada y confirmación al copiar al formulario sin guardar/publicar. Trabajos done de adaptación muestran resultado terminado en vez de «Sin resultado todavía»; contadores solo para recopilación. No cambios de API, permisos, cuotas ni publicación. Una firma «Redacción» no acredita derechos: conservar revisión humana y explicar que origen del medio no concede reutilización. Build aprobado; revisión visual del usuario pendiente.

Curación de contenido separada en dos secciones (2 de noviembre de 2026): Gestionar contenido contiene catálogo, filtros, alta manual y detalle; Preparar noticias contiene candidatos/revisión/Gemini y trabajos plegados. Secciones permanecen montadas con hidden para conservar formularios y selección al cambiar. createCandidateDraft tipa la respuesta ContentItem; tras alta se ofrece Ir al borrador, que cambia a catálogo, limpia filtros de tipo/estado, busca el título devuelto y selecciona su ID. No modifica publicación ni rutas backend. Usuario reportó publicación real local antes de esta reorganización; revisión visual de pestañas pendiente. Build y 110 pruebas existentes aprobados (no equivalen a navegador del nuevo recorrido).
