/**
 * LLM Connector Job Helper
 * -----------------------
 * Handles persistence of jobs and units of work using the shared Work DAO.
 * Follows architecture rails: <400 LOC and single responsibility.
 */

module.exports = function (RED) {
  // Prefer sortable UUID v7 where available; fallback to v4 in older uuid versions
  const { v7: uuidv7, v4: uuidv4 } = require('uuid');
  const createWorkDao = require('../shared/work-dao');

  // Instantiate DAO once per RED runtime
  const workDao = createWorkDao(RED);

  /**
   * Ensure job & work unit persistence and enrich connector output.
   *
   * @param {Object} node - The LLM Connector node instance.
   * @param {Object} originalMsg - The incoming message to the node.
   * @param {Object} processedMsg - The message after LLM processing.
   * @returns {Promise<Object>} The message enriched with workId, roleId & units.
   */
  async function handleJob(node, originalMsg, processedMsg) {
    const dbConfig = node.dbConfig;
    if (!dbConfig) {
      // No DB configured – skip persistence but still ensure IDs
      ensureIds(originalMsg, processedMsg, node);
      return processedMsg;
    }

    try {
      // Lazily create tables once per node instance
      if (!node.__workDaoInitialized) {
        await workDao.initialize(dbConfig);
        node.__workDaoInitialized = true;
      }

      // Ensure IDs present on both original & processed message
      ensureIds(originalMsg, processedMsg, node);
      const { workId, roleId } = processedMsg;

      // Persist / upsert job row (status will be updated later when done)
      await workDao.createOrUpdateJob(dbConfig, {
        jobId: workId,
        roleId,
        payload: safeJson(originalMsg.payload),
        status: 'processing',
        attempts: 0,
      });

      // If payload is an array treat as units of work
      if (Array.isArray(processedMsg.payload)) {
        processedMsg.units = [];

        for (let i = 0; i < processedMsg.payload.length; i++) {
          const unitPayload = processedMsg.payload[i];
          const unitEnvelope = {
            workId,
            roleId,
            payload: unitPayload,
            meta: { seq: i },
          };
          processedMsg.units.push(unitEnvelope);

          await workDao.upsertWorkUnit(dbConfig, {
            jobId: workId,
            roleId,
            seq: i,
            unitJson: JSON.stringify(unitEnvelope),
            status: 'ready',
            attempts: 0,
          });
        }

        // Mark job done now that units persisted
        await workDao.updateJobStatus(dbConfig, workId, { status: 'done' });
      } else {
        // Single payload – mark done immediately
        await workDao.updateJobStatus(dbConfig, workId, { status: 'done', rawResponse: safeJson(processedMsg.payload) });
      }

      return processedMsg;
    } catch (err) {
      // Update job status to error and rethrow
      try {
        if (dbConfig && processedMsg.workId) {
          await workDao.updateJobStatus(dbConfig, processedMsg.workId, { status: 'error', lastError: err.message });
        }
      } catch (inner) {
        node.error(`Failed updating job status: ${inner.message}`);
      }
      throw err;
    }
  }

  /**
   * Ensure workId & roleId fields present on messages.
   */
  function ensureIds(originalMsg, processedMsg, node) {
        const workId = originalMsg.workId || processedMsg.workId || (uuidv7 ? uuidv7() : uuidv4());
        const roleId = originalMsg.roleId || processedMsg.roleId || (node.roleIdentity || (uuidv7 ? uuidv7() : uuidv4()));

    originalMsg.workId = workId;
    processedMsg.workId = workId;
    originalMsg.roleId = roleId;
    processedMsg.roleId = roleId;

    // Also expose human-friendly identity if provided
    if (node.roleIdentity) {
      originalMsg.roleIdentity = node.roleIdentity;
      processedMsg.roleIdentity = node.roleIdentity;
    }
  }

  /**
   * Safely stringify JSON or return string directly.
   */
  function safeJson(value) {
    if (value === null || value === undefined) return null;
    if (typeof value === 'string') return value;
    try {
      return JSON.stringify(value);
    } catch (_) {
      return String(value);
    }
  }

  return { handleJob };
};
