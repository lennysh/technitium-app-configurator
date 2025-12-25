# Technitium DNS Server App Configurator

A web-based configuration UI for Technitium DNS Server apps. This tool allows you to easily configure any Technitium DNS Server app through a user-friendly interface and export the configuration JSON that can be directly used in Technitium DNS Server.

## Features

- **Web-based UI**: Modern, responsive interface for configuring apps
- **App-specific forms**: Each app has its own configuration form based on JSON config files
- **Import/Export**: Import existing configs or export new ones
- **Containerized**: Runs in Docker or Podman containers
- **Extensible**: Add new apps by simply adding a JSON config file
- **Privacy-First**: **100% client-side processing** - all configurations, imports, and exports are processed entirely in your browser. Nothing is sent to or stored on the server except for loading the static app configuration templates.

## Quick Start

### Using Docker/Podman

1. **Build the container:**
   ```bash
   ./scripts/build.sh
   ```

2. **Start the container:**
   ```bash
   ./scripts/start.sh
   ```

3. **Access the webapp:**
   Open your browser and navigate to `http://localhost:3000`

### Custom Port

The default port is 3000. To use a different port, set the `PORT` environment variable:
```bash
PORT=8080 ./scripts/start.sh
```

Or for any other port:
```bash
PORT=9000 ./scripts/start.sh
```

### Redeploy

To rebuild and restart the container:
```bash
./scripts/redeploy.sh
```

## Project Structure

```
lennysh-technitium-app-configurator/
├── www/                    # Web application files
│   ├── index.html         # Main HTML file
│   ├── styles.css         # Stylesheet
│   └── app.js             # Application logic
├── app-configs/           # App configuration definitions
│   ├── config-files.json # List of config files to load
│   └── *.json            # Individual app config files (with metadata)
├── scripts/              # Build and deployment scripts
│   ├── build.sh          # Build container image
│   ├── start.sh          # Start container
│   └── redeploy.sh       # Rebuild and restart
├── Containerfile          # Container definition
├── nginx.conf             # Nginx configuration
└── README.md             # This file
```

## Adding New Apps

To add a new app to the configurator:

1. **Create app config file** (`app-configs/MyNewApp.json`) with metadata:
   ```json
   {
     "id": "MyNewApp",
     "name": "My New App",
     "description": "Description of what the app does",
     "fields": [
       {
         "name": "enableFeature",
         "type": "boolean",
         "label": "Enable Feature",
         "default": true,
         "help": "Enable or disable the feature"
       },
       {
         "name": "someSetting",
         "type": "string",
         "label": "Some Setting",
         "placeholder": "Enter value",
         "help": "Description of the setting"
       }
     ]
   }
   ```

2. **Add the filename to** `app-configs/config-files.json`:
   ```json
   {
     "configFiles": [
       "MyNewApp.json",
       ...
     ]
   }
   ```

3. **Rebuild the container:**
   ```bash
   ./scripts/redeploy.sh
   ```

## Field Types

The configurator supports the following field types:

- **boolean**: Checkbox input
- **number**: Number input (with min/max support)
- **string**: Text input
- **url**: URL input with validation
- **textarea**: Multi-line text input
- **select**: Dropdown selection
- **array**: Array of strings
- **object**: Nested object with properties
- **array-of-objects**: Array of objects with defined properties

## Example Field Definitions

### Simple Field
```json
{
  "name": "enableBlocking",
  "type": "boolean",
  "label": "Enable Blocking",
  "default": true,
  "help": "Enable or disable blocking"
}
```

### Array Field
```json
{
  "name": "blockedDomains",
  "type": "array",
  "label": "Blocked Domains",
  "itemLabel": "Domain",
  "itemType": "string",
  "help": "List of domains to block"
}
```

### Array of Objects
```json
{
  "name": "groups",
  "type": "array-of-objects",
  "label": "Groups",
  "itemLabel": "Group",
  "itemProperties": [
    {
      "name": "name",
      "type": "string",
      "label": "Group Name",
      "required": true
    },
    {
      "name": "enable",
      "type": "boolean",
      "label": "Enable",
      "default": true
    }
  ]
}
```

## Usage

1. **Select an app** from the dropdown
2. **Fill in the configuration** using the generated form
3. **Click "Export Config"** to generate the JSON configuration
4. **Copy the JSON** and paste it into your Technitium DNS Server app's `dnsApp.config` file
5. **Or use "Import Config"** to load an existing configuration for editing

## Container Management

### View Logs
```bash
docker logs -f technitium-config
# or
podman logs -f technitium-config
```

### Stop Container
```bash
docker stop technitium-config
# or
podman stop technitium-config
```

### Remove Container
```bash
docker rm technitium-config
# or
podman rm technitium-config
```

### Remove Image
```bash
docker rmi technitium-app-configurator:latest
# or
podman rmi technitium-app-configurator:latest
```

## Development

The webapp is a static site that can be served by any web server. For local development:

1. Serve the `www` directory with a local web server
2. Make sure `app-configs` is accessible at `/app-configs`
3. For example, using Python:
   ```bash
   cd www
   python3 -m http.server 3000
   ```

## Privacy & Security

**This application is designed with privacy in mind:**

- ✅ **100% client-side processing** - All configuration data is processed entirely in your browser
- ✅ **No server-side storage** - Your imports, exports, and configurations are never saved on the server
- ✅ **No tracking** - No analytics, cookies, or tracking scripts
- ✅ **No data transmission** - Only static template files (app configs) are loaded from the server
- ✅ **Open source** - You can review the code to verify these claims

The only data the server receives is standard HTTP request headers (IP address, user agent, etc.) which is standard for any web server. No configuration data is transmitted to the server.

## License

This project is licensed under the GNU General Public License v3.0 (GPL-3.0).

See the [LICENSE](LICENSE) file for the full license text.

## Releases

Releases are automatically built and published to Docker Hub when:

- **Creating a GitHub Release**: When you create a release on GitHub (e.g., `v1.0.0`), the workflow automatically builds and pushes the image with that version tag.
- **Pushing to a release branch**: Push to a branch named `release/X.Y.Z` or `releases/X.Y.Z` (e.g., `release/1.0.0`).
- **Manual trigger**: Use the "Run workflow" button in GitHub Actions and specify a version number.

The image will be available on Docker Hub as:
```
docker pull <your-dockerhub-username>/technitium-app-configurator:<version>
docker pull <your-dockerhub-username>/technitium-app-configurator:latest
```

### Setting up Docker Hub credentials

To enable automatic publishing, add the following secrets to your GitHub repository:

1. Go to Settings → Secrets and variables → Actions
2. Add the following secrets:
   - `DOCKERHUB_USERNAME`: Your Docker Hub username
   - `DOCKERHUB_TOKEN`: Your Docker Hub access token (create one at https://hub.docker.com/settings/security)

## Contributing

Contributions are welcome! To add support for new Technitium DNS Server apps:

1. Create a JSON config file following the structure shown in the "Adding New Apps" section
2. Add the filename to `config-files.json`
3. Submit a pull request
