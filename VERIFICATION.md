# Verificación · 29 de octubre de 2026

## Captura y privacidad

- `npm test`: 8 pruebas aprobadas; conservación de todos los campos A/B/C, consentimiento de contactos, tipos, fechas y CSV.
- `npm run build`: aprobado; dependencias auditadas sin vulnerabilidades durante la instalación.
- `node --check public/app.js` y `public/render.js`: aprobados.
- `node scripts/smoke.mjs`: tres registros sintéticos enviados dos veces cada uno a la función publicada; seis respuestas de confirmación con UUID estable.
- Lecturas públicas de registros, administradores, resúmenes y límites: denegadas.
- Inserción pública directa en la tabla: denegada.
- Llamada sin credencial al resumen diario: denegada con HTTP 401.
- Envío de registro inválido: rechazado con HTTP 400.

Las comprobaciones de base de datos confirman el total antes de eliminar los tres registros sintéticos, sin tocar respuestas reales. La función del resumen se comprueba mediante la credencial interna de Vault sin exponerla.

- GitHub Actions: compilación, ocho pruebas y despliegue aprobados; la URL pública devuelve HTTP 200.
- Navegador de la web publicada: información general visible antes de A/B/C; cambio A → C → A conserva el borrador; envío confirmado y comprobado en Supabase. Registro sintético retirado después.
- Autorización RLS: una transacción temporal comprobó acceso del coordinador con correo confirmado y denegación al cambiar a otro correo. Todos los cambios temporales en Auth se revirtieron con `ROLLBACK`.
- Cron autenticado: HTTP 200 con estado `disabled`, esperado hasta configurar Resend. Llamadas sin credencial: HTTP 401.
- Servidor local: página HTTP 200 y recurso inexistente HTTP 404, sin caída del proceso.

## Unidades de trabajo y reversión

1. Captura, frontend, contratos compartidos, validación, pruebas, documentación y publicación Pages: revertir el frontend al commit anterior preserva los datos de Supabase.
2. Persistencia, autorización administrativa y resumen programado: funciones y migración versionadas. Para detener envíos se desactiva el cron; no se eliminan tablas durante una reversión.

## Límites de verificación

El envío real de Resend y el acceso administrativo mediante correo requieren clave y dominio verificado, SMTP de Auth y URLs de redirección configuradas. No se declara que el correo esté operativo sin una prueba de recepción. La configuración de Auth se entrega en `supabase/config.toml` y README; el conector Supabase disponible no expone modificación de esa configuración y la CLI local no tiene sesión autenticada.

El dashboard abierto solicita iniciar sesión; no se modificó su configuración sin acceso. La revisión visual se realizó en escritorio. El navegador no aplicó la dimensión móvil solicitada, por lo que no se declara una revisión visual móvil completada.

El asesor de seguridad informó únicamente que `rate_limits` tiene RLS sin políticas públicas: es un cierre deliberado, con permisos exclusivos del servicio. No habilitar una política pública para quitar ese aviso informativo.
