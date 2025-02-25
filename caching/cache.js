import mongoose from "mongoose";
import { createClient } from "redis";

const redisUrl = "redis://127.0.0.1:6379";

// Create Redis Client
const client = createClient({ url: redisUrl });

client.on("connect", () => console.log("✅ Connected to Redis"));
client.on("error", (err) => console.error("❌ Redis Client Error:", err));

// Ensure Redis client is connected before use
await client.connect();

const exec = mongoose.Query.prototype.exec;

mongoose.Query.prototype.cache = function(options = {}){
    this.useCache = true;
    this.hashKey = JSON.stringify(options.key || '');
    return this;
}
mongoose.Query.prototype.exec = async function () {
  if(!this.useCache){
    return exec.apply(this, arguments);
  }
    console.log("I AM ABOUT TO RUN A QUERY");

  const key = JSON.stringify({
    ...this.getQuery(),
    collection: this.mongooseCollection.name,
  });

  try {
    const cacheValue = await client.hGet(this.hashKey, key)

    if (cacheValue) {
      console.log("CACHE HIT:", cacheValue);
      const doc = JSON.parse(cacheValue)

      return Array.isArray(doc)
      ? doc.map(d => new this.model(d))
      : new this.model(doc)
      return doc;
    }

    const result = await exec.apply(this, arguments);

    // Store result in Redis (cache for 1 hour)
    // await client.setEx(key, 3600, JSON.stringify(result));
    client.hSet(this.hashKey, key, JSON.stringify(result), 'EX', 10)
    return result;
  } catch (error) {
    console.error("Error accessing Redis:", error);
    throw new Error("Redis Error");
  }
};

export const clearHash = async (hashKey) => {
    if (!client) {
        console.error("Redis client is not initialized.");
        return;
    }

    try {
        const response = await client.del(JSON.stringify(hashKey));
        if (response === 1) {
            console.log(`Successfully deleted cache for key: ${hashKey}`);
        } else {
            console.log(`No cache found for key: ${hashKey}`);
        }
    } catch (error) {
        console.error(`Error deleting hash: ${error}`);
    }
};
