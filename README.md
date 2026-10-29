# Remedios en Colombia Travel Expo 2026

Aplicación de captura pública para la delegación de Remedios. Conserva los tres cuestionarios del HTML original: A (stands), B (compradores y aliados) y C (percepción del destino). Los resultados y contactos requieren acceso administrativo.

- Web: https://julian8811.github.io/remedios-travel-expo/
- Vercel: https://remedios-travel-expo.vercel.app/
- Coordinación y destinatario del resumen: jose.gomez.lopez@colmayor.edu.co
- Proyecto Supabase: `wfwxdvkcdqnvdmkjxaoj`, organización Julián, región us-east-1.

## Desarrollo y publicación

Requiere Node.js 24 o superior.

```sh
npm ci --ignore-scripts
npm test
npm run build
npm start
```

Abrir http://127.0.0.1:4173. GitHub Actions verifica y publica `dist/` en Pages tras cada push a `main`. `public/config.js` contiene únicamente URL y clave publicable; esta clave no autoriza leer respuestas. Nunca poner claves privilegiadas ni secretos de correo en el frontend o GitHub.

La compilación agrupa JavaScript con esbuild y publica JavaScript y CSS con nombres derivados de su contenido para evitar mezclar versiones antiguas del navegador con el HTML actualizado.

Vercel está conectado al mismo repositorio GitHub, con despliegue de producción desde `main`. `vercel.json` define la instalación reproducible, ejecución de pruebas y salida `dist/`. Supabase acepta envíos únicamente desde los orígenes publicados autorizados y el desarrollo local. Los dominios temporales de previews no se autorizan automáticamente para recoger información real.

## Captura y datos

Antes de las preguntas se recoge nombre del registrador, fecha y tipo de formulario, con autorización. Los demás campos se conservan en sus formularios. Se agrega autorización al contacto opcional de A. B requiere autorización para guardar nombre, cargo, teléfono o correo; C no solicita identificación personal.

Cada registro se valida con el mismo contrato en navegador y servidor. La función `submit` limita el cuerpo a 40 KB y aplica 60 intentos por IP cada diez minutos, usando un hash con sal diaria. La base recibe UUID estables para confirmar reintentos sin duplicar. Los límites no sustituyen una solución antibots si el formulario recibe abuso sostenido.

Los pendientes se guardan en este navegador antes de enviar. La confirmación solo ocurre cuando responde el servidor. No borrar datos del navegador ni compartir el dispositivo mientras haya pendientes con contactos. La página debe haberse abierto con conexión; esta versión no instala una PWA para su primer acceso sin red. El botón de copia es una recuperación manual para compartir únicamente con el equipo autorizado.

`registros` conserva metadatos y todas las respuestas en JSONB, con versión del cuestionario. RLS impide acceso público a las tablas; la función utiliza credenciales privilegiadas exclusivamente en servidor. Los datos no se guardan en GitHub. Las fechas del resumen se calculan en America/Bogota.

## Acceso administrativo: configuración necesaria

El único administrador inicial es el propietario confirmado del correo `jose.gomez.lopez@colmayor.edu.co`. Un trigger en el esquema privado asigna o retira acceso según el correo confirmado por Supabase Auth, nunca según metadatos editables por el usuario. Registrarse con otro correo no permite consultar datos.

En Supabase → Authentication → URL Configuration, establecer:

- Site URL: `https://julian8811.github.io/remedios-travel-expo/`
- Redirect URLs: la misma URL, `https://remedios-travel-expo.vercel.app/` y, para desarrollo, `http://127.0.0.1:4173/`.

El acceso solicita un enlace de correo. Configurar en Supabase Auth SMTP con `smtp.gmail.com`, puerto `465`, usuario y remitente `montoya8811@gmail.com` y una contraseña de aplicación de Google introducida por su titular. El servicio de prueba de Supabase puede restringir destinatarios. No se crea ni envía ninguna invitación desde las migraciones.

## Activar la recopilación diaria con Gmail

La función y el cron quedan preparados; sin `GMAIL_APP_PASSWORD` el envío permanece desactivado. El titular debe introducir una contraseña de aplicación como secreto en Supabase → Edge Functions → Secrets. El destinatario es fijo; Gmail es el remitente. No guardar la contraseña en Git ni compartirla por chat.

El cron llama a la función a las 07:00 de Colombia, con dos reintentos a las 07:15 y 07:30. Recopila registros **recibidos** durante el día anterior, por lo que una captura antigua sincronizada después también se incluye. Envía totales, indicadores y CSV completo; no envía en días vacíos. `summary_runs` registra intentos, estado y referencia del mensaje. Gmail no garantiza idempotencia SMTP: un fallo de conexión después de aceptar el mensaje podría causar un duplicado al reintentar. Revisar fallos en Supabase → Cron y Edge Functions → Logs.

La credencial del cron se genera en Vault por la migración. La función `daily-summary` comprueba esa credencial antes de acceder a registros; no acepta llamadas públicas sin autorización. Los secretos no forman parte del repositorio.

Antes de dar el correo por operativo: configurar el remitente, ejecutar una prueba controlada y comprobar recepción en el correo institucional. Una aceptación SMTP no confirma entrega en la bandeja de entrada.

## Backend y recuperación

Las migraciones están en `supabase/migrations/`; las funciones en `supabase/functions/`. Para un despliegue nuevo, usar Supabase CLI autenticado y revisar primero la configuración y migraciones. La migración inicial contiene la URL del proyecto actual en el cron; actualizarla para otro proyecto.

Las funciones se despliegan sin verificación JWT de la pasarela: `submit` admite captura pública y valida/restringe cada solicitud; `daily-summary` autentica la credencial de Vault dentro del handler. Las consultas del navegador utilizan Auth y RLS.

Para eliminar o corregir datos por solicitud del titular, el coordinador puede hacerlo desde el dashboard de Supabase; la aplicación pública no expone esas operaciones. La retención de respuestas se deja a la política del responsable del plan: no se ejecuta borrado automático de información de campo. Los contadores técnicos de frecuencia se purgan diariamente.

## Verificación y reversión

`npm test` verifica conservación de campos, validación A/B/C, consentimiento, valores inválidos, fechas de Colombia y exportación CSV segura. El flujo real de captura, reintento, acceso público denegado y despliegue se documenta en `VERIFICATION.md`.

Para revertir la web, volver al commit anterior y ejecutar el workflow de Pages. La reversión no elimina respuestas. Para detener notificaciones, desactivar el job `remedios-daily-summary` desde Supabase Cron o retirar `GMAIL_APP_PASSWORD`. Las funciones y tablas constituyen la unidad de backend y deben mantenerse compatibles con el frontend publicado; nunca borrar tablas como parte de una reversión rutinaria.
