const express = require('express');
const crypto = require('crypto');
const router = express.Router();
const pool = require('../db');

router.post('/', async (req, res) => {
    const { link } = req.body;
    if (!link) {
        return res.status(400).json({ code: 400, error: 'Link is required' });
    }
    try {
        const shortUrl = crypto.randomBytes(4).toString('hex');
        const expiresAt = new Date(Date.now() + 120 * 60000);
        const result = await pool.query('INSERT INTO urls (original_url, short_url, expires_at) VALUES ($1, $2, $3) RETURNING *', [link, shortUrl, expiresAt]);
        console.log("Inserted URL:", result.rows[0]);
        res.status(200).json({
            code: 200,
            shortened_link: `https://link-shortener-express.vercel.app/api/shorten/${shortUrl}`,
            lifespan: 60,
        });
    } catch (error) {
        console.error("Error during POST /api/shorten:", error.stack);
        res.status(500).json({ code: 500, error: 'Internal Server Error' });
    }
});
router.get('/:shortUrl', async (req, res) => {
    const { shortUrl } = req.params;
    try {
        const result = await pool.query(
            `SELECT original_url, expires_at, expires_at > NOW() AS is_active, NOW() AS current_time FROM urls WHERE short_url = $1`, 
            [shortUrl]
        );

        if (result.rows.length > 0) {
            const { original_url, is_active, expires_at, current_time } = result.rows[0];

            // Log expiration and current time for debugging
            console.log(`URL Expires At: ${expires_at}, Current Time: ${current_time}`);

            if (is_active) {
                res.redirect(original_url); // URL is active, so redirect
            } else {
                res.status(404).json({ code: 404, error: 'URL has expired' });
            }
        } else {
            res.status(404).json({ code: 404, error: 'URL not found' });
        }
    } catch (error) {
        console.error("Error during GET /api/shorten:", error.stack);
        res.status(500).json({ code: 500, error: 'Internal Server Error' });
    }
});



router.get('/:shortUrl/expires', async (req, res) => {
    const { shortUrl } = req.params;
    try {
        const result = await pool.query(
            'SELECT expires_at FROM urls WHERE short_url = $1',
            [shortUrl]
        );
        if (result.rows.length > 0) {
            res.status(200).json({
                code: 200,
                shortUrl,
                expires_at: result.rows[0].expires_at
            });
        } else {
            res.status(404).json({ code: 404, error: 'URL not found' });
        }
    } catch (error) {
        console.error("Error during GET /api/shorten/expires:", error.stack);
        res.status(500).json({ code: 500, error: 'Internal Server Error' });
    }
});

module.exports = router;
