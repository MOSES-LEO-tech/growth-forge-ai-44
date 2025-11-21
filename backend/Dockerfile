FROM node:20

WORKDIR /app

COPY package*.json ./

# Install dependencies including dev dependencies for building native modules
RUN npm install

COPY . .

EXPOSE 3000

CMD ["npm", "run", "dev"]
