# Use Node.js 20 Alpine for smaller image
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy application code
COPY . .

# Expose the Vite dev server port
EXPOSE 5173

# Start the Vite dev server
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "5173"]