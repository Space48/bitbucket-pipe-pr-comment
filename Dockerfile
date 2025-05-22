FROM node:24-alpine
WORKDIR /usr/src/app

COPY dist ./

CMD ["node", "index.js"]
