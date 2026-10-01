FROM node:20-alpine

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy application code
COPY . .

# Expose Vite's default port
EXPOSE 5173

# Run Vite development server exposed to the network
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
