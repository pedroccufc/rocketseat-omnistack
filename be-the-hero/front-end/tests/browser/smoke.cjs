const assert = require('node:assert/strict');
const http = require('node:http');
const { spawn } = require('node:child_process');
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');

const PREVIEW_URL = 'http://127.0.0.1:4173';
const incidents = [{
  id: 1,
  title: 'Caso de teste',
  description: 'Descrição de teste',
  value: 100,
  ong_id: 'ong-test',
}];

function respond(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

function createFixtureApi() {
  return http.createServer((req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      return res.end();
    }

    const path = new URL(req.url, 'http://localhost').pathname;
    if (req.method === 'POST' && path === '/sessions') {
      return respond(res, 200, { name: 'ONG Demo' });
    }
    if (req.method === 'GET' && path === '/profile') {
      return respond(res, 200, incidents);
    }
    if (req.method === 'DELETE' && path === '/incidents/1') {
      incidents.splice(0, incidents.findIndex(item => item.id === 1) + 1);
      res.writeHead(204);
      return res.end();
    }
    if (req.method === 'POST' && path === '/incidents') {
      incidents.push({
        id: 2,
        title: 'Novo caso',
        description: 'Descrição do novo caso',
        value: 120,
      });
      return respond(res, 200, { id: 2 });
    }
    if (req.method === 'POST' && path === '/ongs') {
      return respond(res, 200, { id: 'ong-new' });
    }

    return respond(res, 404, { error: 'Unknown fixture route' });
  });
}

async function waitForPreview() {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    try {
      const response = await fetch(PREVIEW_URL);
      if (response.ok) return;
    } catch (_) {
      // The Vite preview process may still be starting.
    }
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  throw new Error('Vite preview did not start');
}

async function main() {
  const api = createFixtureApi();
  await new Promise(resolve => api.listen(3333, resolve));
  const preview = spawn('npm', [
    'run', 'preview', '--', '--host', '127.0.0.1', '--port', '4173', '--strictPort'
  ], { cwd: process.cwd(), stdio: 'inherit' });

  let browser;
  try {
    await waitForPreview();
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));

    await page.goto(PREVIEW_URL);
    await page.getByPlaceholder('Sua ID').fill('ong-test');
    await page.getByRole('button', { name: 'Entrar' }).click();
    await page.waitForURL('**/profile');
    await page.getByText('Casos cadastrados').waitFor();
    await page.getByText('Caso de teste').waitFor();

    await page.locator('button.delete').click();
    await page.getByText('Caso de teste').waitFor({ state: 'detached' });

    await page.getByRole('link', { name: 'Cadastrar novo caso' }).click();
    await page.waitForURL('**/incidents/new');
    await page.getByPlaceholder('Título do caso').fill('Novo caso');
    await page.getByPlaceholder('Descrição').fill('Descrição do novo caso');
    await page.getByPlaceholder('Valor em reais').fill('120');
    await page.getByRole('button', { name: 'Cadastrar' }).click();
    await page.waitForURL('**/profile');
    await page.getByText('Novo caso').waitFor();

    await page.goto(PREVIEW_URL);
    await page.getByRole('link', { name: /Não tenho cadastro/ }).click();
    await page.waitForURL('**/register');
    await page.getByPlaceholder('Nome da ONG').fill('Nova ONG');
    await page.getByPlaceholder('E-mail').fill('contato@example.org');
    await page.getByPlaceholder('WhatsApp').fill('11999999999');
    await page.getByPlaceholder('Cidade').fill('São Paulo');
    await page.getByPlaceholder('UF').fill('SP');
    page.once('dialog', async dialog => {
      assert.match(dialog.message(), /Seu ID de acesso/);
      await dialog.accept();
    });
    await page.getByRole('button', { name: 'Cadastrar' }).click();
    await page.waitForURL(PREVIEW_URL + '/');

    assert.deepEqual(errors, [], 'browser should not report uncaught exceptions');
    console.log('Browser smoke passed: login, list, delete, create, register and navigation.');
  } finally {
    if (browser) await browser.close();
    preview.kill();
    await new Promise(resolve => api.close(resolve));
  }
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
