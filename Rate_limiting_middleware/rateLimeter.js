const WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS = 5;

const requestLog = new Map(); // ip -> array of timestamps

export function rateLimiter(req, res, next) {

    const ip = req.ip || req.connection.remoteAdress;

    const timestamps = requestLog.get(ip) || [];
    const now = Date.now()

    const recents = timestamps.filter(rec => now - rec < WINDOW_MS);


    if (recents.length >= MAX_REQUESTS) {
        const retryAfter = now - recents[0];
        res.set("Retry-After", String(retryAfter));
        return res.status(429).json({
            error: 'Too many requests, please try again later.',
            retryAfter,
        });

    }

    recents.push(now);
    requestLog.set(ip, recents);
    next()
}


setInterval(() => {

    const now = Date.now();

    for (let [ip, timestamps] of requestLog.entries()) {
        const recents = timestamps.filter((ts) => now - ts < WINDOW_MS);

        if (recents.length === 0) {
            requestLog.delete(ip);
        } else {
            requestLog.set(ip, recents);
        }
    }

}, WINDOW_MS)