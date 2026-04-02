FROM node:20-alpine@sha256:f598378b5240225e6beab68fa9f356db1fb8efe55173e6d4d8153113bb8f333c

WORKDIR /app

COPY package*.json ./

# Use npm install to avoid requiring a lockfile; omit dev dependencies for production.
RUN npm install --omit=dev

COPY . .

ENV NODE_ENV=production

EXPOSE 3000

CMD ["npm", "start"]

