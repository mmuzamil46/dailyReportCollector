FROM node:20
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
ENV PORT=3000
ENV MONGO_URI=mongodb://mongo:27017/dailyReport
ENV REMOTE_MONGO_URI=mongodb+srv://admin:U7gnn1SFiTpxd9o5@todocluster.lktmpgp.mongodb.net/?appName=toDoCluster
EXPOSE 3000
CMD ["node", "index.js"]