import { checkSutAuth } from '../../../../src/services/sut-utils';

/**
 * @swagger
 * /api/control/error/client-fail:
 *   get:
 *     description: Returns 401 error for testing 4xx count
 *     responses:
 *       401:
 *         description: Unauthorized error
 */
export default function handler(req, res) {
  if (!checkSutAuth(req)) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  res.status(401).json({ error: 'Unauthorized (401)' });
}
