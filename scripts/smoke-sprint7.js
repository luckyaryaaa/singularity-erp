'use strict';
require('../backend/core/env').loadEnv();
const { Client } = require('pg');
const auth = require('../backend/infrastructure/database/repositories/auth');

(async () => {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  let session;
  try {
    const user = (await client.query("SELECT * FROM app_users WHERE role='owner' AND active LIMIT 1")).rows[0];
    session = await auth.createSession(client, { id: user.id }, { ip: '127.0.0.1', device: 'sprint7-live-smoke' });
    const headers = { cookie: `mat_session=${session.token}` };
    const get = async (path) => {
      const response = await fetch(`http://127.0.0.1:${process.env.PORT || 4173}${path}`, { headers });
      const body = await response.json();
      if (!response.ok) throw new Error(`${path}: ${response.status} ${JSON.stringify(body)}`);
      return body;
    };
    const organization = await get('/api/organization');
    const employees = await get('/api/employees?limit=1');
    const employee = employees.items[0] ? await get(`/api/masters/employees/${employees.items[0].id}`) : null;
    const selfTest = await get('/api/system/self-test');
    const organizationCheck = selfTest.results.find((item) => item.name === 'Organization & Employee Master');
    const result = {
      organization: { loaded: !!organization.id, completeness: organization.completeness?.score },
      employee: { loaded: !!employee, enterpriseSummary: !!employee?.enterpriseSummary },
      selfTest: { passed: selfTest.passed, failed: selfTest.failed, blocked: selfTest.releaseBlocked, organization: organizationCheck?.status }
    };
    if (!result.organization.loaded || !result.employee.loaded || !result.employee.enterpriseSummary || result.selfTest.blocked || result.selfTest.organization !== 'pass') {
      throw new Error(`Sprint 7 smoke gagal: ${JSON.stringify(result)}`);
    }
    console.log(JSON.stringify(result, null, 2));
  } finally {
    if (session) await client.query('DELETE FROM user_sessions WHERE id=$1', [session.id]);
    await client.end();
  }
})().catch((error) => { console.error(error.message); process.exitCode = 1; });
