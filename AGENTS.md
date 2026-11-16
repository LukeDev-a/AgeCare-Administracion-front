# Frontend principal — guía para agentes

React + TypeScript + Vite. Lee [docs/CONTEXTO-TECNICO.md](docs/CONTEXTO-TECNICO.md). Es el único frontend del proyecto.

- Mantén páginas en `src/pages/<modulo>`, servicios en `src/api`, componentes compartidos en `src/components`, utilidades en `src/lib` y estructura visual en `src/layout`.
- Para peticiones protegidas utiliza `apiFetch` de `src/api/client.ts`; no implementes refresh independiente ni captures un token una sola vez para futuras llamadas.
- Para invitaciones y configuración pública de MFA sigue `src/api/accountAccess.ts`, que distingue peticiones públicas y autenticadas.
- No pongas claves del servidor ni secretos SMTP en variables `VITE_*`: esas variables son públicas en el bundle.
- La autorización efectiva está en el backend. Menú y rutas usan los permisos del perfil en `src/routes/permissions.ts`; esto no acredita que todos los botones de modificación se oculten para roles de lectura.
- Usa los estilos existentes y variables de tema en `src/index.css`. Preserva el comportamiento de tema claro/oscuro.
- Uso comercial adopta Tailwind mediante `@tailwindcss/vite` y `src/tailwind.css`. Las utilidades llevan prefijo `tw:` y usan colores ligados a variables de tema. Se importan theme y utilities, con prioridad importante para convivir con CSS existente. Conservar esta integración gradual al extender el diseño.
- Curación de contenido usa `src/components/Modal.tsx` para creación, edición/aprobación y revisión de noticias. Cierre explícito, confirmación de cambios sin guardar y bloqueo durante envíos. El usuario quiere extenderlo gradualmente; no migrar otros módulos sin petición.
- Revisar y preparar noticia usa `CandidateReview.tsx`: un paso visible (Procedencia/Adaptación/Borrador), selección de procedencia seguida de guardado explícito, propuesta IA copiada solo por elección del usuario y confirmación antes de reemplazar edición local. Conservar textos al navegar/actualizar y ante fallo. Las reglas de aprobación/publicación permanecen en backend; avanzar de paso no aprueba derechos.
- La creación de tickets también usa Modal con protección de cambios y envío. Conservar confirmación explícita ante USER_NOT_FOUND: el backend busca datos en tickets anteriores por correo, no en cuentas administrativas. El correo es del solicitante y el canal solo describe el origen; no prometer envío de notificaciones al crear.
- Juegos también usa `Modal.tsx` para creación/edición, ficha y confirmación de eliminación. Estilos propios en `src/pages/juegos/gameStyles.ts` con Tailwind `tw:`; mantener permisos de lectura, dirección protegida y sandbox original del iframe. No sustituir errores/confirmaciones por alert/confirm del navegador.
- Marketplace usa Modal para crear/gestionar productos y revisar cuidadoras, con `marketStyles.ts`. Conserva el detalle durante refrescos, confirma archivo/suspensión y respeta `canManageMarketplace` (admin/editor). El guardado de producto consume la respuesta canónica para limpiar dirty. La suspensión recoge motivo de 10–1000 caracteres, según el contrato existente; no agregar avisos por correo.
- CaregiverDetail permite una nota interna editable de hasta2000 caracteres, con guardado separado de estado/motivo y respuesta canónica. Notas solo para admin/editor; no mostrarlas a moderator. Guardar nota no aprueba, suspende ni verifica certificaciones; conservar dirty/error y permitir vaciar con texto vacío.
- Configuración usa tarjetas y SettingEditor dentro del Modal con settingsStyles.ts. Mantener valor completo/version/change_note, cero/falso, JSON para estructuras complejas y evento de actualización del aviso. VERSION_CONFLICT no se reintenta ni mezcla automáticamente: consulta versión vigente y confirma descarte explícito. No reintroducir confirm del navegador ni confundir explicación de auditoría con mensaje del aviso.
- Moderación usa Modal y `moderationStyles.ts`: aprobar/rechazar requieren confirmación local antes del POST. Conservar nota/motivo ante error y bloquear cierre durante envío. Fotos/mensajes sin acceso temporal no muestran contenido ni decisiones, aunque traigan content en la respuesta. No habilitar notificaciones ni efectos móviles externos.
- Auditoría usa Modal y `auditStyles.ts`: comparación legible antes/después, datos técnicos desplegables y filtros avanzados por UUID. Exportar solo utiliza filtros aplicados y se bloquea mientras haya cambios sin aplicar. Conservar cero/falso/null y privacidad del backend; no mostrar metadata HTTP ni capturar clics o navegación como eventos.
- No reconstruyas el rastreo de clics como auditoría. La vista consume cambios de negocio registrados por el backend.
- Desde fase 17 también muestra logins correctos/fallidos y consultas de conversaciones, autorizados expresamente; conserva esa distinción sin capturar navegación general. Contrato en Requerimientos/fase-17 y docs/auditoria-administrativa.md del backend.
- /usuarios-app (fase18) es directorio de demostración solo admin, distinto de /usuarios (analítica) y /cuentas (personal). Por instrucción del usuario del 11 de noviembre, sus textos visibles son los de la versión final, sin avisos de prueba/demo. Mantén la validación interna data_origin/deactivation_effect y documenta que la integración móvil real sigue pendiente; no afirmar revocación de sesiones en la interfaz.
- No registres tokens, secretos QR, códigos de recuperación o contraseñas. Respeta el carácter de una sola visualización de los códigos.

Verificaciones desde esta carpeta:

```powershell
npm.cmd test
npm.cmd run build
# Para revisar los archivos cambiados, o toda la base si la tarea lo justifica:
npm.cmd run lint
```

El build genera `dist`; no editarlo como fuente. No asumir que el lint completo ya carece de incidencias previas. Los tests existentes cubren principalmente servicios y lógica de sesiones; una compilación correcta no acredita todos los flujos visuales.
