import redisClient from '../utils/redis';

describe('redis Client', () => {
  it('should be alive', () => {
    expect.assertions(1);
    expect(redisClient.isAlive()).toBe(true);
  });

  it('should set and get data correctly', async () => {
    expect.assertions(1);
    await redisClient.set('test_key', 'test_value', 10);
    const value = await redisClient.get('test_key');
    expect(value).toBe('test_value');
  });

  it('should delete data correctly', async () => {
    expect.assertions(1);
    await redisClient.del('test_key');
    const value = await redisClient.get('test_key');
    expect(value).toBeNull();
  });
});
