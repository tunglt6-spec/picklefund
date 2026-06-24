FROM node:20-alpine
WORKDIR /app
COPY services/maika-adapter/package*.json ./
RUN npm install --omit=dev
COPY services/maika-adapter/src ./src
COPY services/picklefund-client/src ./src/picklefund-client
EXPOSE 4101
CMD ["npm", "start"]

