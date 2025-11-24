FROM node:18-alpine

WORKDIR /app

# Copy package files first for better Docker layer caching
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies before copying source code
RUN npm install

# Copy source code after dependencies are installed
COPY . .

EXPOSE 3000

# Use dev server with hot reload
CMD ["npm", "run", "dev"]
