FROM node:13.10.1-alpine3.10

WORKDIR /workspace
COPY . .
RUN apk add --update gcc make g++ ffmpeg python
RUN rm -rf node_modules
RUN yarn install ref@latest
CMD ["yarn", "start"]