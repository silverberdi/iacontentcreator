FROM node:22-alpine AS build

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
ARG VITE_MINIO_BASE_URL
ARG VITE_N8N_WEBHOOK_BASE_URL=/webhook
ENV VITE_MINIO_BASE_URL=${VITE_MINIO_BASE_URL}
ENV VITE_N8N_WEBHOOK_BASE_URL=${VITE_N8N_WEBHOOK_BASE_URL}
RUN npm run build

FROM node:22-alpine AS runtime

WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=build /app/dist ./dist
COPY server ./server
RUN mkdir -p /data
EXPOSE 8088
CMD ["npm", "run", "start"]
