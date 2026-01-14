# ---- build stage ----
FROM node:20-alpine AS build
WORKDIR /app

# Install deps first (better layer caching)
COPY package*.json ./
RUN npm ci

# Build
COPY . .
# If your package.json uses a different build script, adjust accordingly
RUN npm run build

# ---- runtime stage ----
FROM nginx:1.27-alpine AS runtime

# Optional: custom nginx config for SPA routing
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built artifacts to nginx html dir
RUN rm -rf /usr/share/nginx/html/*
COPY --from=build /app/dist/first-app/browser/ /usr/share/nginx/html/


EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
