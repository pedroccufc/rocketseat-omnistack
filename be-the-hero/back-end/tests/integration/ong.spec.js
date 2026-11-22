const request = require('supertest');
const app = require('../../src/app');
const connection = require('../../src/database/connection');

describe('ONG', () => {
	beforeEach(async () => {
		await connection.migrate.rollback();
		await connection.migrate.latest();
	});

	afterAll(async () => {
		await connection.destroy();
	});

	it('should be able to create a new ONG', async () => {
		const response = await request(app)
			.post('/ongs')
			.send({
				name: "APAD2",
				email: "contato@apad.com",
				whatsapp: "8855558989",
				city: "Rio do Sul",
				uf: "SC",
			});

		expect(response.body).toHaveProperty('id');
		expect(response.body.id).toHaveLength(8);
	});
	it('rejects ONG registration with an invalid email', async () => {
		const response = await request(app)
			.post('/ongs')
			.send({
				name: 'Invalid NGO',
				email: 'not-an-email',
				whatsapp: '11999999999',
				city: 'Fortaleza',
				uf: 'CE',
			});

		expect(response.status).toBe(400);
	});

});