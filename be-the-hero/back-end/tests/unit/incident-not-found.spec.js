const connection = require('../../src/database/connection');
const IncidentController = require('../../src/controllers/IncidentController');

jest.mock('../../src/database/connection', () => jest.fn());

describe('incident mutations with nonexistent identifiers', () => {
  beforeEach(() => {
    connection.mockReset();
    connection.mockImplementation(() => ({
      where: () => ({
        select: () => ({ first: async () => undefined })
      })
    }));
  });

  for (const action of ['update', 'delete']) {
    it(`responds with 404 instead of crashing when ${action} target does not exist`, async () => {
      const request = {
        params: { id: '999999' },
        headers: { authorization: 'ong-id' },
        body: { title: 'title', description: 'description', value: 10 }
      };
      const response = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis()
      };

      await IncidentController[action](request, response);

      expect(response.status).toHaveBeenCalledWith(404);
      expect(response.json).toHaveBeenCalledWith({ error: 'Incident not found' });
    });
  }
});
