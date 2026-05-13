FROM node:20-alpine AS builder
WORKDIR /app
RUN apk add --no-cache openssl
COPY package*.json ./
COPY prisma ./prisma/
RUN npm install
COPY . .
RUN npx prisma generate --schema=prisma/master/schema.prisma
RUN npx prisma generate --schema=prisma/user/schema.prisma
RUN npx prisma generate --schema=prisma/core/schema.prisma
RUN npx prisma generate --schema=prisma/geo/schema.prisma
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
RUN apk add --no-cache openssl
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY start.sh ./
COPY enable-postgis.js ./
COPY init-geo-db.js ./
RUN chmod +x start.sh
EXPOSE 3001
CMD ["./start.sh"]
