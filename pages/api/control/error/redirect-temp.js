/**
 * @swagger
 * /api/control/error/redirect-temp:
 *   get:
 *     description: Returns 307 redirect for testing 3xx count
 *     responses:
 *       307:
 *         description: Temporary redirect
 *       401:
 *         description: Unauthorized
 */
export default function handler(req, res) {

  res.redirect(307, '/api/control/error/success');
}
