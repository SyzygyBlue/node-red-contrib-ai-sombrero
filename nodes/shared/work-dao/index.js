/**
 * Work DAO – persistence layer for job & work_units tables
 *
 * Usage:
 * const workDao = require('nodes/shared/work-dao')(RED);
 * await workDao.initialize(dbConfigNode);
 * await workDao.createOrUpdateJob(dbConfigNode, {...});
 */
module.exports = function (RED) {
  const dbUtils = require('../db-config-utils')(RED);

  const JOBS_TABLE = 'jobs';
  const WORK_UNITS_TABLE = 'work_units';

  /**
   * Create the jobs & work_units tables if they do not exist.
   * @param {Object} dbConfigNode - The dbconfig-node instance.
   */
  async function initialize(dbConfigNode) {
    // Jobs table schema – generic subset valid for SQLite/MySQL/Postgres
    const jobsSchema = `
      job_id TEXT PRIMARY KEY,
      role_id TEXT,
      payload TEXT,
      status TEXT DEFAULT 'pending',
      attempts INTEGER DEFAULT 0,
      created_at INTEGER,
      last_error TEXT,
      raw_response TEXT
    `;

    const workUnitsSchema = `
      job_id TEXT,
      role_id TEXT,
      seq INTEGER,
      unit_json TEXT,
      status TEXT DEFAULT 'ready',
      attempts INTEGER DEFAULT 0,
      processed_at INTEGER,
      last_error TEXT,
      PRIMARY KEY (job_id, role_id, seq)
    `;

    await dbUtils.createTableIfNotExists(dbConfigNode, JOBS_TABLE, jobsSchema);
    await dbUtils.createTableIfNotExists(dbConfigNode, WORK_UNITS_TABLE, workUnitsSchema);
  }

  /**
   * Create or update a job row. Attempts is incremented if row exists.
   */
  async function createOrUpdateJob(dbConfigNode, job) {
    const {
      jobId,
      roleId = null,
      payload = null,
      status = 'pending',
      attempts = 0,
      lastError = null,
      rawResponse = null,
    } = job;

    if (!jobId) throw new Error('jobId is required');

    // Generic UPSERT compatible with SQLite ≥3.24, Postgres 9.5, MySQL 5.7
    const query = `INSERT INTO ${JOBS_TABLE} (job_id, role_id, payload, status, attempts, created_at, last_error, raw_response)
                   VALUES ($1,$2,$3,$4,$5,strftime('%s','now'),$6,$7)
                   ON CONFLICT(job_id) DO UPDATE SET
                     role_id = excluded.role_id,
                     payload = excluded.payload,
                     status = excluded.status,
                     attempts = ${JOBS_TABLE}.attempts + 1,
                     last_error = excluded.last_error,
                     raw_response = excluded.raw_response`;
    const params = [jobId, roleId, payload, status, attempts, lastError, rawResponse];

    return dbUtils.executeQuery(dbConfigNode, query, params);
  }

  /**
   * Update job status / error columns.
   */
  async function updateJobStatus(dbConfigNode, jobId, { status, lastError, rawResponse }) {
    const query = `UPDATE ${JOBS_TABLE} SET status=$2, last_error=$3, raw_response=$4 WHERE job_id=$1`;
    const params = [jobId, status, lastError || null, rawResponse || null];
    return dbUtils.executeQuery(dbConfigNode, query, params);
  }

  /**
   * Insert or replace a work unit row.
   */
  async function upsertWorkUnit(dbConfigNode, workUnit) {
    const {
      jobId,
      roleId,
      seq,
      unitJson,
      status = 'ready',
      attempts = 0,
      processedAt = null,
      lastError = null,
    } = workUnit;

    if (!jobId || seq === undefined || seq === null) {
      throw new Error('jobId and seq are required');
    }

    const query = `INSERT INTO ${WORK_UNITS_TABLE} (job_id, role_id, seq, unit_json, status, attempts, processed_at, last_error)
                   VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
                   ON CONFLICT(job_id, role_id, seq) DO UPDATE SET
                     unit_json = excluded.unit_json,
                     status = excluded.status,
                     attempts = ${WORK_UNITS_TABLE}.attempts + 1,
                     processed_at = excluded.processed_at,
                     last_error = excluded.last_error`;
    const params = [jobId, roleId, seq, unitJson, status, attempts, processedAt, lastError];
    return dbUtils.executeQuery(dbConfigNode, query, params);
  }

  /**
   * Update work unit status.
   */
  async function updateWorkUnitStatus(dbConfigNode, jobId, roleId, seq, { status, lastError }) {
    const query = `UPDATE ${WORK_UNITS_TABLE} SET status=$4, last_error=$5 WHERE job_id=$1 AND role_id=$2 AND seq=$3`;
    const params = [jobId, roleId, seq, status, lastError || null];
    return dbUtils.executeQuery(dbConfigNode, query, params);
  }

  /**
   * Retrieve jobs with error status under attempt cap.
   */
  async function getErroredJobs(dbConfigNode, maxAttempts = 3) {
    const query = `SELECT * FROM ${JOBS_TABLE} WHERE status='error' AND attempts < $1`;
    const params = [maxAttempts];
    return dbUtils.executeQuery(dbConfigNode, query, params);
  }

  return {
    initialize,
    createOrUpdateJob,
    updateJobStatus,
    upsertWorkUnit,
    updateWorkUnitStatus,
    getErroredJobs,
  };
};
