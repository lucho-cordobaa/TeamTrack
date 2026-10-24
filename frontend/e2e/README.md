# Pruebas de navegador

Desde `frontend`, ejecutar `npm run test:e2e`. Playwright inicia el backend y Vite, abre Microsoft Edge y ejecuta pruebas del catálogo y un recorrido de punta a punta por los flujos principales de entrenador y atleta.

Requisitos: Microsoft Edge instalado, backend configurado en `backend/.env`, base de datos de desarrollo disponible y dataset de ejercicios cargado. El catálogo usa la cuenta semilla `luciano@teamtrack.com` (`password123`) en modo de solo lectura. El flujo integral registra cuentas con prefijo `teamtrack-e2e-`, crea datos de prueba asociados y los elimina al finalizar. La limpieza selecciona exclusivamente esos correos; se puede ejecutar manualmente desde `backend` con `npm run prisma:e2e-cleanup` si una ejecución se interrumpe.
