import { clearHash } from './cache.js'; // Use 'import' instead of 'require'

export default async (req, res, next) => {
    await next(); // Wait for the request to finish

    clearHash(req.user._id);
};