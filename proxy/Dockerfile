FROM node:20-alpine

WORKDIR /app

COPY package*.json ./

# Use npm install to avoid requiring a lockfile; omit dev dependencies for production.
RUN npm install --omit=dev

COPY . .

ENV NODE_ENV=production

EXPOSE 3000

CMD ["npm", "start"]

