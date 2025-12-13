FROM node:20
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
ARG REACT_APP_API_URL
ENV REACT_APP_API_URL=$REACT_APP_API_URL
RUN npm run build
CMD ["npx", "serve", "-s", "build", "-l", "3001"]
EXPOSE 3001