# ---------- BUILD ----------
FROM node:18-alpine AS build

WORKDIR /app

# Copiar manifests PRIMEIRO
COPY package.json package-lock.json* ./

RUN npm install

# Copiar o resto do código
COPY . .

# Build do Vite
RUN npm run build


# ---------- RUNTIME ----------
FROM node:18-alpine AS runtime

WORKDIR /app

# Instalar servidor estático
RUN npm install -g serve

# Copiar build final
COPY --from=build /app/dist ./dist

# Railway injeta PORT
CMD ["sh", "-c", "serve -s dist -l $PORT"]
