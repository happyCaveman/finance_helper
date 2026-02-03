FROM node:20-slim

WORKDIR /app

COPY package*.json ./
RUN npm install --legacy-peer-deps

COPY . .

# 빌드 (환경 변수 포함)
RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]