FROM node:18-alpine

WORKDIR /app

# Копируем package.json
COPY package*.json ./

# Устанавливаем ВСЕ зависимости
RUN npm install

# Копируем остальной код
COPY . .

EXPOSE 8081

CMD ["node", "server.js"]