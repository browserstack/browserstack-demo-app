/**
 * @swagger
 * /api/control/error/server-fail:
 *   get:
 *     description: Returns 503 error for testing 5xx count
 *     responses:
 *       503:
 *         description: Service unavailable
 *       401:
 *         description: Unauthorized
 */
export default function handler(req, res) {

  res.status(503).json({ error: 'Service Unavailable (503)' });
}
