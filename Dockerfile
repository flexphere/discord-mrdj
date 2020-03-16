FROM node:13.10.1-alpine3.10

WORKDIR /workspace
COPY . .
RUN apk add --update gcc make g++ ffmpeg python
RUN rm -rf node_modules
RUN npm install
RUN ./node_modules/.bin/tsc
CMD ["node", "dist/index.js"]