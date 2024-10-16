import redisClient from '../utils/redis';
import { expect } from 'chai';

describe('Redis Client', () => {
  it('should be alive', () => {
    expect(redisClient.isAlive()).to.be.true;
  });

  it('should set and get data correctly', async () => {
    await redisClient.set('test_key', 'test_value', 10);
    const value = await redisClient.get('test_key');
    expect(value).to.equal('test_value');
  });

  it('should delete data correctly', async () => {
    await redisClient.del('test_key');
    const value = await redisClient.get('test_key');
    expect(value).to.be.null;
  });
});
