FROM node:20-alpine
WORKDIR /app
COPY services/lisa-adapter/package*.json ./
RUN npm install --omit=dev
COPY services/lisa-adapter/src ./src
COPY services/picklefund-client/src ./src/picklefund-client
EXPOSE 4102
CMD ["npm", "start"]

