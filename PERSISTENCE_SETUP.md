# MC-Router Persistence Setup

The MC-Router Web GUI now supports persistent storage of route mappings through a JSON configuration file.

## How It Works

1. **Config File**: Routes are saved to `routes.json` in the mc-router directory
2. **Automatic Sync**: When mc-router is running, changes are saved to both mc-router and the config file
3. **Offline Mode**: When mc-router is offline, routes can still be managed through the config file
4. **Auto-Load**: When mc-router starts with the config file, it automatically loads all saved routes

## Usage

### Starting MC-Router with Persistence

To enable persistence, start mc-router with the `--routes-config` flag:

```bash
./mc-router --api-binding=:8080 --port=25565 --routes-config=routes.json
```

### Config File Format

The `routes.json` file uses this format:

```json
{
  "default-server": "backend-server:port",
  "mappings": {
    "hostname1.example.com": "backend1:25565",
    "hostname2.example.com": "backend2:25566"
  }
}
```

### Web GUI Features

- **Status Indicator**: Shows if mc-router is online/offline
- **Persistent Routes**: Routes are saved even when mc-router is offline
- **Automatic Sync**: Changes sync between web GUI and mc-router
- **Config Info**: View config file location at `/config` endpoint

### API Endpoints

- `GET /routes` - Get current routes (from mc-router or config file)
- `POST /routes` - Add new route
- `DELETE /routes/:hostname` - Delete route
- `POST /defaultRoute` - Set default route
- `GET /status` - Check mc-router status
- `GET /config` - View config file info

### Benefits

1. **Persistence**: Routes survive mc-router restarts
2. **Offline Management**: Configure routes even when mc-router is down
3. **Backup**: Config file serves as a backup of your routing configuration
4. **Version Control**: Config file can be committed to git for team sharing

## Authentication

The Web GUI includes simple username/password authentication to protect access to your routing configuration.

### Environment Variables

- `AUTH_USERNAME` - Username for web GUI authentication (default: admin)
- `AUTH_PASSWORD` - Password for web GUI authentication (default: password)
- `SESSION_SECRET` - Secret key for session encryption (default: auto-generated)

### Default Credentials

- **Username**: admin
- **Password**: password

### Customizing Authentication

Set environment variables to customize the login credentials:

```bash
export AUTH_USERNAME=myusername
export AUTH_PASSWORD=mysecurepassword
export SESSION_SECRET=your-secret-key-here
npm run dev
```

### Security Features

- **Session Management**: Secure session-based authentication
- **Protected Routes**: All API endpoints require authentication
- **Auto-Redirect**: Unauthenticated users are redirected to login
- **Logout**: Secure logout functionality with session cleanup

### Example Workflow

1. Start web GUI: `npm run dev`
2. Navigate to `http://localhost:3000` - you'll be redirected to login
3. Login with your credentials (default: admin/password)
4. Add routes through the web interface (works offline)
5. Start mc-router with config: `./mc-router --routes-config=routes.json`
6. Routes are automatically loaded and active
7. Any changes through web GUI are saved to both mc-router and config file