import dbClient from '../utils/db';

describe('dB Client', () => {
  it('should be alive', () => {
    expect.assertions(1);
    expect(dbClient.isAlive()).toBe(true);
  });

  it('should return correct number of users', async () => {
    expect.assertions(1);
    const usersCount = await dbClient.nbUsers();
    expect(usersCount).toStrictEqual(expect.any(Number));
  });

  it('should return correct number of files', async () => {
    expect.assertions(1);
    const filesCount = await dbClient.nbFiles();
    expect(filesCount).toStrictEqual(expect.any(Number));
  });
});
