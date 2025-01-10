FROM node:18

# Create and set the working directory
WORKDIR /app

# Copy package.json and package-lock.json from the build context
COPY package.json .
COPY package-lock.json .

# Install dependencies
RUN npm install

# Install PM2 globally
RUN npm install pm2 -g

# Create the logs directory
RUN mkdir -p /var/logs/VTS

# Copy the rest of the application code
COPY . .

# Expose the application port
EXPOSE 5000

# Start the application using PM2
CMD ["pm2-runtime", "index.js"]