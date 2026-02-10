# Frontend Dockerfile
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Expose port
EXPOSE 5173

# Run development server
# In production, you would build and serve with nginx
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
