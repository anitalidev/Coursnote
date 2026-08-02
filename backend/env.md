# Environment variables

The backend reads a `.env` file in the `backend/` directory at startup (via `godotenv`). All variables can also be set as real environment variables, which takes precedence.

## Database

| Variable | Required | Example | Description |
|---|---|---|---|
| `DB_USER` | yes | `root` | MySQL username |
| `DB_PASSWORD` | yes | `yourpassword` | MySQL password |
| `DB_HOST` | yes | `127.0.0.1` | MySQL host (IP or hostname) |
| `DB_PORT` | yes | `3306` | MySQL port |
| `DB_NAME` | yes | `coursnote` | MySQL database name |

These five values are assembled into a DSN of the form `user:password@tcp(host:port)/dbname`.

## Server

| Variable | Required | Default | Example | Description |
|---|---|---|---|---|
| `APP_BASE_URL` | no | `http://localhost:8081` | `https://coursnote.com` | Public origin of the server. Used to build absolute URLs returned by the image upload endpoints (`/api/image`, `/api/user/avatar`). Set this to your production domain when deploying so stored image URLs point to the right host. |

## Frontend assets

These are only needed when the built frontend is not in the default location relative to `main.go` (e.g. inside Docker or a custom build layout).

| Variable | Required | Default | Description |
|---|---|---|---|
| `FRONTEND_ASSETS` | no | `../frontend/assets` | Path to the frontend `assets/` directory, served at `/static/assets/`. |
| `FRONTEND_DIST` | no | `../frontend/dist` | Path to the Vite `dist/` directory. Static files are served from here, and `index.html` inside it is used as the SPA fallback. |

## Example `.env`

```
DB_USER=root
DB_PASSWORD=yourpassword
DB_HOST=127.0.0.1
DB_PORT=3306
DB_NAME=coursnote

APP_BASE_URL=http://localhost:8081
```

For a production deployment, change `APP_BASE_URL` to the public domain and supply real database credentials.
