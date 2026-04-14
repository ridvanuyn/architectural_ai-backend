FROM node:20-alpine

RUN apk add --no-cache vips-dev

WORKDIR /app

COPY package*.json ./

RUN npm ci --only=production

COPY src/ ./src/
COPY scripts/ ./scripts/

RUN mkdir -p uploads

EXPOSE 4000

CMD ["node", "src/server.js"]
