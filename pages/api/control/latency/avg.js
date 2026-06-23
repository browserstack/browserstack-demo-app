import { delay } from '../../../../src/services/sut-utils';

/**
 * @swagger
 * /api/control/latency/avg:
 *   get:
 *     description: Returns response with stable 500ms latency for testing average response time and TTFB
 *     responses:
 *       200:
 *         description: Success with 500ms delay
 *       401:
 *         description: Unauthorized
 */
export default async function handler(req, res) {

  await delay(500);
  res.status(200).json({ status: 'OK', latency: '500ms' });
}
