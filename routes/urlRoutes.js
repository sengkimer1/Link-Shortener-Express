const express = require('express');
const crypto = require('crypto');
const router = express.Router();
const pool = require('../db');
const authenticateToken = require('../middleware/authMiddleware');

// Shorten a URL
router.post('/', authenticateToken, async (req, res) => {
    const { link } = req.body;
    const userId = req.user.id;

    if (!link) {
        return res.status(400).json({ code: 400, error: 'Link is required' });
    }

    try {
        // Validate URL format (basic check)
        try {
            new URL(link);
        } catch (err) {
            return res.status(400).json({ code: 400, error: 'Invalid URL format' });
        }

        const shortUrl = crypto.randomBytes(4).toString('hex');
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour expiration
        await pool.query(
            'INSERT INTO shortened_urls (original_url, short_url, user_id, expires_at) VALUES ($1, $2, $3, $4)',
            [link, shortUrl, userId, expiresAt]
        );

        res.status(200).json({
            code: 200,
            shortened_link: `https://link-shortener-express.vercel.app/api/shorten/${shortUrl}`,
            lifespan: 60
        });
    } catch (error) {
        console.error("Error during POST /api/shorten:", error.stack);
        res.status(500).json({ code: 500, error: 'Internal Server Error' });
    }
});

// Redirect to the original URL
router.get('/:shortUrl', async (req, res) => {
    const { shortUrl } = req.params;
    try {
        const result = await pool.query(
            'SELECT original_url, short_url, (expires_at > NOW()) AS is_active FROM shortened_urls WHERE short_url = $1',
            [shortUrl]
        );

        if (result.rows.length > 0 && result.rows[0].is_active) {
            res.redirect(result.rows[0].original_url);
        } else {
            res.status(404).json({ code: 404, error: 'URL not found or expired' });
        }
    } catch (error) {
        console.error("Error during GET /api/shorten:", error.stack);
        res.status(500).json({ code: 500, error: 'Internal Server Error' });
    }
});

// Get expiration time of a shortened URL
router.get('/:shortUrl/expires', async (req, res) => {
    const { shortUrl } = req.params;
    try {
        const result = await pool.query(
            'SELECT expires_at FROM shortened_urls WHERE short_url = $1',
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

// Get all shortened URLs for the authenticated user
router.get('/links', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT original_url, short_url FROM shortened_urls WHERE user_id = $1',
            [req.user.id]
        );
        const links = {};
        result.rows.forEach(row => {
            links[row.original_url] = `https://link-shortener-express.vercel.app/api/shorten/${row.short_url}`;
        });
        res.status(200).json({ code: 200, list_of_converted_links: links });
    } catch (error) {
        console.error("Error during GET /api/shorten/links:", error.stack);
        res.status(500).json({ code: 500, error: 'Internal Server Error' });
    }
});

module.exports = router;
