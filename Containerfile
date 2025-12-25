# Containerfile for Technitium DNS Server App Configurator
# Uses nginx to serve a static web application

FROM nginx:alpine

# Copy web files
COPY www /usr/share/nginx/html
COPY app-configs /usr/share/nginx/html/app-configs

# Copy nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]

