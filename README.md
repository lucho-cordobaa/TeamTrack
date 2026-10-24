# ðŸ‹ï¸â€â™‚ï¸ TeamTrack â€” Plataforma de GestiÃ³n de Equipos, Rutinas y Asistencia

AplicaciÃ³n web integral para gimnasios y equipos deportivos de alto rendimiento, orientada a entrenadores y atletas. Permite la administraciÃ³n centralizada de planteles, diseÃ±o de rutinas, control de asistencia diaria y registro en tiempo real de entrenamientos mediante **Firebase Firestore** con persistencia histÃ³rica y analÃ­tica en **MySQL** a travÃ©s de **Prisma ORM**.

---

## ðŸ› ï¸ Stack TecnolÃ³gico

| Capa | TecnologÃ­as |
|---|---|
| **Frontend** | React 18, TypeScript, Vite, Tailwind CSS, Lucide Icons, Chart.js / React-Chartjs-2 |
| **Backend** | NestJS 10, TypeScript, Prisma ORM, Passport JWT, bcryptjs, Class Validator |
| **Base de Datos Principal** | MySQL 8.0 (`teamtrack_db`) |
| **Tiempo Real** | Firebase Firestore (Admin SDK en Backend / Web SDK en Frontend) |
| **Arquitectura** | Modular en NestJS (Modules, Controllers, Services, DTOs, Guards, Decorators) |

---

## ðŸ“‹ Roles y Funcionalidades

### ðŸ‘” Rol Entrenador
- **GestiÃ³n de Equipos**: Alta, ediciÃ³n, eliminaciÃ³n y asociaciÃ³n de atletas (RB-02, RB-03).
- **CatÃ¡logo de Ejercicios**: BÃºsqueda por nombre y filtrado por grupo muscular (RF-07), visualizaciÃ³n de tÃ©cnicas y alta de nuevos ejercicios.
- **Constructor de Rutinas**: CreaciÃ³n de rutinas individuales y grupales, configuraciÃ³n de series, repeticiones y orden de ejercicios (RF-05, RF-06).
- **AsignaciÃ³n de Rutinas**: AsignaciÃ³n a uno o varios atletas o a todo un equipo con generaciÃ³n automÃ¡tica en `AsignacionRutina` (RF-09, RB-04, RB-05).
- **Monitoreo en Tiempo Real**: Panel en vivo para supervisar quÃ© atletas estÃ¡n entrenando ahora mismo, el porcentaje de avance, pesos y repeticiones (RF-15).
- **Control de Asistencia**: Registro de presencia/ausencia sin permitir duplicados por fecha (RB-07).
- **Progreso y EstadÃ­sticas**: GrÃ¡ficos de evoluciÃ³n de peso por ejercicio y mÃ©tricas grupales de asistencia y series levantadas.

### ðŸƒâ€â™‚ï¸ Rol Atleta
- **Mi Panel**: Asistencias acumuladas y acceso rÃ¡pido a rutinas asignadas y sesiÃ³n activa.
- **Mis Rutinas**: Consulta de rutinas asignadas y detalle de prescripciÃ³n de series/reps.
- **Entrenamiento Activo en Tiempo Real**: Inicio de sesiÃ³n (RF-12, con restricciÃ³n de sesiÃ³n Ãºnica activa RB-06), cronÃ³metro en vivo, ajuste tÃ¡ctil de peso (kg) y repeticiones serie a serie (RF-13), y finalizaciÃ³n con persistencia en `SerieRealizada` de MySQL y pase a estado finalizada en Firestore (RF-14, RB-09).
- **Mi Asistencia**: Marcado de presencia diaria y calendario de dÃ­as entrenados.
- **Mi Progreso**: Curva interactiva de evoluciÃ³n de carga mÃ¡xima por ejercicio (PR) y total de series histÃ³ricas.

---

## ðŸ”‘ Credenciales de Prueba (Seed Preconfigurado)

La base de datos incluye datos realistas listos para probar:

| Rol | Nombre | Email | ContraseÃ±a | Equipo |
|---|---|---|---|---|
| **Entrenador** | Luciano CÃ³rdoba | `luciano@teamtrack.com` | `password123` | Halcones Rugby, Panteras Hockey |
| **Entrenador** | Marcos DÃ­az | `marcos@teamtrack.com` | `password123` | Titanes Crossfit |
| **Atleta** | JoaquÃ­n Carballo | `joaquin@teamtrack.com` | `password123` | Halcones Rugby |
| **Atleta** | SofÃ­a BenÃ­tez | `sofia@teamtrack.com` | `password123` | Halcones Rugby |
| **Atleta** | Mateo Rossi | `mateo@teamtrack.com` | `password123` | Halcones Rugby |
| **Atleta** | Valentina LÃ³pez | `valentina@teamtrack.com` | `password123` | Panteras Hockey |
| **Atleta** | Lucas FernÃ¡ndez | `lucas@teamtrack.com` | `password123` | Panteras Hockey |
| **Atleta** | Camila Ruiz | `camila@teamtrack.com` | `password123` | *(Sin equipo inicial)* |

> ðŸ’¡ **Tip**: En la pantalla de login dispones de botones de acceso rÃ¡pido de 1 click con estas credenciales.

---

## ðŸš€ GuÃ­a de InstalaciÃ³n y Puesta en Marcha

### 1. Requisitos Previos
- **Node.js**: v18 o superior (v24 recomendado) y **npm**.
- **MySQL Server 8.0** en ejecuciÃ³n (puerto 3306).

### 2. ConfiguraciÃ³n del Backend

1. Entra a la carpeta del backend:
   ```bash
   cd backend
   ```
2. Instala dependencias:
   ```bash
   npm install
   ```
3. Configura las variables de entorno en `backend/.env`:
   ```env
   DATABASE_URL="mysql://USER:PASSWORD@localhost:3306/teamtrack_db"
   PORT=3000
   JWT_SECRET="replace_with_a_long_random_secret"
   JWT_EXPIRES_IN="7d"

   # Firebase Admin SDK (Opcional para desarrollo local: si estÃ¡ vacÃ­o utiliza el motor en memoria)
   FIREBASE_PROJECT_ID="teamtrack-utn"
   FIREBASE_CLIENT_EMAIL=""
   FIREBASE_PRIVATE_KEY=""
   ```
4. Sincroniza la estructura de la base de datos MySQL con Prisma:
   ```bash
   npx prisma db push
   ```
5. Carga los datos de prueba iniciales:
   ```bash
   npx ts-node prisma/seed.ts
   ```
6. Inicia el servidor backend en modo desarrollo:
   ```bash
   npm run start:dev
   ```
   El backend quedarÃ¡ escuchando en: `http://localhost:3000/api`

---

### 3. ConfiguraciÃ³n del Frontend

1. Abre otra terminal y navega a la carpeta frontend:
   ```bash
   cd frontend
   ```
2. Instala las dependencias:
   ```bash
   npm install
   ```
3. Verifica el archivo `frontend/.env`:
   ```env
   VITE_API_BASE_URL="http://localhost:3000/api"

   # Firebase Client SDK (Firestore Web)
   VITE_FIREBASE_API_KEY="your_firebase_api_key"
   VITE_FIREBASE_AUTH_DOMAIN="your_project.firebaseapp.com"
   VITE_FIREBASE_PROJECT_ID="your_project_id"
   VITE_FIREBASE_STORAGE_BUCKET="your_project.appspot.com"
   VITE_FIREBASE_MESSAGING_SENDER_ID="your_sender_id"
   VITE_FIREBASE_APP_ID="your_app_id"
   ```
4. Inicia el servidor de desarrollo de Vite:
   ```bash
   npm run dev
   ```
5. Abre en tu navegador: `http://localhost:5173`

---

## ðŸ§ª Flujo de Pruebas Recomendado

1. **Ingreso como Entrenador (`luciano@teamtrack.com`)**:
   - Observa en el **Dashboard** el resumen de atletas y el bloque de **Monitoreo en Tiempo Real (Firestore)**.
   - Ve a **Equipos & Atletas**: crea un nuevo equipo y asocia al atleta disponible "Camila Ruiz".
   - Ve a **Constructor de Rutinas**: crea una rutina seleccionando ejercicios, definiendo series y repeticiones, y asÃ­gnala al equipo "Halcones Rugby" (RB-05).
   - Ve a **Control de Asistencia**: consulta el historial de asistencia de los atletas y registra una asistencia.

2. **Ingreso como Atleta (`joaquin@teamtrack.com`)**:
   - En **Mi Panel**, verifica el resumen de asistencias y las rutinas asignadas.
   - Presiona **"Iniciar Entrenamiento"** en una rutina asignada.
   - En la pantalla de **SesiÃ³n Activa**:
     - Incrementa o decrementa los pesos y las repeticiones con los botones tÃ¡ctiles (+ / -) o ingresando el nÃºmero directamente.
     - Marca las series como completadas (se actualizan en vivo en Firestore).
     - Si abres en otra pestaÃ±a el panel del Entrenador, verÃ¡s cÃ³mo el progreso se refleja en tiempo real en la tarjeta del atleta.
     - Presiona **"Finalizar"** y confirma: los datos se guardarÃ¡n de inmediato en la tabla `series_realizadas` de MySQL y la sesiÃ³n en Firestore pasarÃ¡ a `finalizada`.
   - Ve a **Mi Progreso**: observa la grÃ¡fica interactiva de Chart.js con la evoluciÃ³n de carga a lo largo del tiempo.

---

## ðŸ”’ Reglas de Negocio Verificadas

- **RB-01**: ValidaciÃ³n exhaustiva con `class-validator` en todos los DTOs.
- **RB-02**: Cada equipo pertenece a un Ãºnico entrenador responsable.
- **RB-03**: Cada atleta pertenece como mÃ¡ximo a un equipo.
- **RB-04 / RB-05**: Toda asignaciÃ³n individual o grupal genera registros en `AsignacionRutina`.
- **RB-06**: RestricciÃ³n de una Ãºnica sesiÃ³n activa: el backend rechaza iniciar una nueva sesiÃ³n si el atleta ya tiene una con estado `en_curso`.
- **RB-07**: RestricciÃ³n Ãºnica en base de datos para `(usuario_id, fecha)` en `Asistencia`.
- **RB-08**: Las rachas consecutivas no se implementan por decisión de alcance del proyecto.
- **RB-09**: Persistencia atÃ³mica con `$transaction` en MySQL y actualizaciÃ³n a `finalizada` en Firestore al terminar la sesiÃ³n.
- **RNF-01**: Aislamiento de datos: los usuarios no pueden consultar ni modificar informaciÃ³n de equipos ajenos.
