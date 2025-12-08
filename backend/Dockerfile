FROM node:20
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
ENV PORT=3000
ENV MONGO_URI=mongodb://mongo:27017/dailyReport
EXPOSE 3000
CMD ["node", "index.js"]