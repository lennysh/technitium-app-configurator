# Technitium DNS Server App Configurator

A web-based configuration UI for Technitium DNS Server apps. This tool allows you to easily configure any Technitium DNS Server app through a user-friendly interface and export the configuration JSON that can be directly used in Technitium DNS Server.

> **⚠️ Pre-Release Notice:** This is currently a pre-release version (0.1.0). Not everything has been fully tested yet. We're actively looking for testers to help identify issues and provide feedback. Please report any bugs or issues by opening an issue on the [GitHub repository](https://github.com/lennysh/technitium-app-configurator).

## Features

- **Web-based UI**: Modern, responsive interface for configuring apps
- **App-specific forms**: Each app has its own configuration form based on JSON config files
- **Import/Export**: Import existing configs or export new ones
- **Containerized**: Runs in Docker or Podman containers
- **Extensible**: Add new apps by simply adding a JSON config file
- **Privacy-First**: **100% client-side processing** - all configurations, imports, and exports are processed entirely in your browser. Nothing is sent to or stored on the server except for loading the static app configuration templates.

## Quick Start

### Using Pre-built Docker Image (Recommended)

The easiest way to get started is using the pre-built image from Docker Hub:

**Docker Run:**
```bash
docker run -d -p 3000:80 --name technitium-config lennysh/technitium-app-configurator:latest
```

Or with Podman:
```bash
podman run -d -p 3000:80 --name technitium-config lennysh/technitium-app-configurator:latest
```

**Docker Compose:**

Create a `docker-compose.yml` file:

```yaml
version: '3.8'

services:
  technitium-config:
    image: lennysh/technitium-app-configurator:latest
    container_name: technitium-config
    ports:
      - "3000:80"
    restart: unless-stopped
```

Then run:

```bash
docker-compose up -d
```

Then access the webapp at `http://localhost:3000`

**Available on Docker Hub:** [lennysh/technitium-app-configurator](https://hub.docker.com/r/lennysh/technitium-app-configurator)

> **Note:** Current version is 0.1.0 (pre-release). Use `:latest` for the most recent build or `:0.1.0` for the specific version.

### Custom Port

**Docker Run:**
```bash
docker run -d -p 8080:80 --name technitium-config lennysh/technitium-app-configurator:latest
```

**Docker Compose:**
```yaml
version: '3.8'

services:
  technitium-config:
    image: lennysh/technitium-app-configurator:latest
    container_name: technitium-config
    ports:
      - "8080:80"
    restart: unless-stopped
```

### Using Specific Version

To use a specific version instead of `latest`:
```bash
docker run -d -p 3000:80 --name technitium-config lennysh/technitium-app-configurator:0.1.0
```

**Current version:** 0.1.0 (pre-release)

### Building from Source

If you prefer to build the container yourself:

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

## Available Versions

Images are available on Docker Hub at [lennysh/technitium-app-configurator](https://hub.docker.com/r/lennysh/technitium-app-configurator):

```bash
docker pull lennysh/technitium-app-configurator:<version>
docker pull lennysh/technitium-app-configurator:latest
```

## Contributing

Contributions are welcome! We're especially looking for:

- **Testers** - Help us test the application and report bugs or issues
- **Feedback** - Share your experience and suggestions for improvements
- **New App Configs** - Add support for additional Technitium DNS Server apps

To add support for new Technitium DNS Server apps:

1. Create a JSON config file following the structure shown in the "Adding New Apps" section
2. Add the filename to `config-files.json`
3. Submit a pull request

To report bugs or issues, please open an issue on the [GitHub repository](https://github.com/lennysh/technitium-app-configurator).
