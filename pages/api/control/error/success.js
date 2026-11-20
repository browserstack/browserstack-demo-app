/**
 * @swagger
 * /api/control/error/success:
 *   get:
 *     description: Returns 200 OK for testing success rate
 *     responses:
 *       200:
 *         description: Success
 *       401:
 *         description: Unauthorized
 */
export default function handler(req, res) {

  res.status(200).json({ message: 'Success (200 OK)' });
}
