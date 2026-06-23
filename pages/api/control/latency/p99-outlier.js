import { delay } from '../../../../src/services/sut-utils';

/**
 * @swagger
 * /api/control/latency/p99-outlier:
 *   get:
 *     description: Returns response with 1% of requests delayed to 5 seconds, 99% at 200ms for P99 testing
 *     responses:
 *       200:
 *         description: Success with variable delay
 *       401:
 *         description: Unauthorized
 */
export default async function handler(req, res) {

  const randomValue = Math.random();
  const delayTime = randomValue < 0.01 ? 5000 : 200; // 1% slow, 99% fast
  await delay(delayTime);
  res.status(200).json({ status: 'OK', delay: `${delayTime}ms` });
}
