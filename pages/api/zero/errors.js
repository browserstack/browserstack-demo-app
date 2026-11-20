/**
 * @swagger
 * /api/zero/errors:
 *   get:
 *     description: Returns 200 OK for zero error testing
 *     responses:
 *       200:
 *         description: Perfect run, zero errors
 *       401:
 *         description: Unauthorized
 */
export default function handler(req, res) {

  res.status(200).json({ message: 'Perfect run, zero errors targeted.' });
}
