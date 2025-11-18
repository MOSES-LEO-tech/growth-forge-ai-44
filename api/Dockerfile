FROM node:18-alpine
WORKDIR /app
COPY package.json ./
RUN npm install --only=production
COPY server.js ./
COPY db.js ./
ENV NODE_ENV=production
EXPOSE 3000
CMD ["npm", "start"]