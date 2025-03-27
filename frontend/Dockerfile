# Build stage
FROM node:18-alpine AS build

WORKDIR /app

COPY package.json vite.config.js tailwind.config.js ./
COPY index.html ./
RUN npm install

COPY src ./src
RUN npm run build

# Serve stage
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
