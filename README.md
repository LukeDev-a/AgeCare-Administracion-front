# AgeCare-Administracion-front
Front de la app de consola de administracion de agecare

## Cuentas de la consola

Sistema → Cuentas de la consola permite al rol administrador listar, buscar y filtrar cuentas; crearlas por invitación; editar nombre, rol y estado; reenviar o cancelar invitaciones; y eliminar cuentas con confirmación. Los roles son administrador, analista, soporte, editor y moderador. Los correos deben pertenecer a los dominios autorizados del backend.

El correo contiene un enlace a `/aceptar-invitacion#token=...`: el titular elige su contraseña y configura un autenticador con QR o clave manual. Por defecto MFA es obligatorio para administradores y opcional para los demás; se puede exigir al crear la invitación. La confirmación muestra diez códigos de recuperación una sola vez. Cada código es de un solo uso. Los códigos TOTP ya utilizados también se rechazan; espera el siguiente intervalo.

Las cuentas existentes que necesiten MFA se redirigen a `/configurar-mfa` tras verificar su contraseña, sin obtener acceso a la consola hasta terminar. Sistema → Seguridad de mi cuenta permite activar MFA opcional, renovar códigos de recuperación y desactivar MFA cuando no sea obligatorio. Los cambios de seguridad invalidan las sesiones anteriores.

Los estados distinguen cuentas activas/inactivas e invitaciones pendientes/vencidas/canceladas. El estado de correo distingue en cola/enviado/fallido. Reenviar invalida el enlace anterior; cancelar impide activar la cuenta. Cambiar el correo de una cuenta pendiente requiere eliminarla e invitar al correo correcto. No se permite eliminar/desactivar la propia cuenta ni cambiar su propio rol. La auditoría se conserva y no guarda secretos.

Este cambio requiere actualizar el backend, instalar sus dependencias, configurar SMTP y una clave de cifrado estable, aplicar `alembic upgrade head` y reiniciar ambos servicios. Consulta [la guía de invitaciones y MFA](../agecare%20back%20rolo/agecare_administracion/docs/invitaciones-mfa.md). El hosting del frontend debe servir `index.html` en rutas de React Router, incluyendo `/aceptar-invitacion` y `/configurar-mfa`.

Validación: `npm test`, `npm run build`.
