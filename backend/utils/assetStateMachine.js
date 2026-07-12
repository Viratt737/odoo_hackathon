const mongoose = require('mongoose');
const ApiError  = require('./ApiError');

/**
 * Asset Status State Machine
 *
 * Key: current status
 * Value: set of valid next statuses
 */
const TRANSITIONS = {
  Available:        new Set(['Allocated', 'Reserved', 'UnderMaintenance', 'Retired', 'Disposed', 'Lost']),
  Allocated:        new Set(['Available', 'UnderMaintenance', 'Lost']),
  Reserved:         new Set(['Available', 'Allocated']),
  UnderMaintenance: new Set(['Available', 'Retired', 'Disposed']),
  Lost:             new Set(['Available', 'Disposed']),
  Retired:          new Set(['Disposed']),
  Disposed:         new Set(), // terminal — no further transitions
};

/**
 * validateTransition(from, to)
 * Throws ApiError(400) if the transition is invalid.
 * Returns true if valid.
 */
const validateTransition = (from, to) => {
  if (from === to) {
    throw new ApiError(400, `Asset is already in '${from}' status`);
  }
  const allowed = TRANSITIONS[from];
  if (!allowed) {
    throw new ApiError(400, `Unknown current status: '${from}'`);
  }
  if (!allowed.has(to)) {
    throw new ApiError(
      400,
      `Invalid status transition: '${from}' → '${to}'. Allowed next states: ${[...allowed].join(', ') || 'none (terminal)'}`
    );
  }
  return true;
};

const ALL_STATUSES    = Object.keys(TRANSITIONS);
const ALL_CONDITIONS  = ['New', 'Good', 'Fair', 'Poor', 'Damaged'];

module.exports = { validateTransition, ALL_STATUSES, ALL_CONDITIONS, TRANSITIONS };
