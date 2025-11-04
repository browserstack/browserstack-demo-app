import { delay, checkSutAuth } from '../../../../src/services/sut-utils';

/**
 * @swagger
 * /api/control/latency/threshold:
 *   get:
 *     description: Returns response with 3.5 second delay to test slow endpoint flagging
 *     responses:
 *       200:
 *         description: Success with 3.5s delay
 *       401:
 *         description: Unauthorized
 */
export default async function handler(req, res) {
  if (!checkSutAuth(req)) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  await delay(3500);
  res.status(200).json({ status: 'OK', flag: 'slow' });
}
