const request = require('supertest');
const app = require('../../src/app');
const connection = require('../../src/database/connection');

afterAll(async () => {
  await connection.destroy();
});

describe('incident mutation request validation', () => {
  const validBody = {
    title: 'Test incident',
    description: 'Test description',
    value: 50,
  };

  it('requires an authorization header for updates', async () => {
    const response = await request(app).put('/incidents/1').send(validBody);
    expect(response.status).toBe(400);
  });

  it('rejects nonnumeric incident identifiers for updates', async () => {
    const response = await request(app)
      .put('/incidents/not-a-number')
      .set('authorization', 'ong-id')
      .send(validBody);
    expect(response.status).toBe(400);
  });

  it('rejects invalid update payloads', async () => {
    const response = await request(app)
      .put('/incidents/1')
      .set('authorization', 'ong-id')
      .send({ ...validBody, value: 'invalid' });
    expect(response.status).toBe(400);
  });

  it('requires an authorization header for deletes', async () => {
    const response = await request(app).delete('/incidents/1');
    expect(response.status).toBe(400);
  });
});
