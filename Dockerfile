FROM node:10.15-alpine

RUN apk add --no-cache make gcc g++ python linux-headers udev \
    && npm uninstall -g yarn

WORKDIR /server

COPY package.json package-lock.json ./

RUN npm install

COPY src ./src

ENV NODE_ENV=production \
    PORT=9000

CMD ["npm", "start"]
