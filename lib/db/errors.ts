// Drizzle wraps the postgres.js error, which carries the SQLSTATE code.
function sqlState(error: unknown) {
  const { code, cause } = (error ?? {}) as { code?: string; cause?: { code?: string } };
  return code ?? cause?.code;
}

export function isForeignKeyViolation(error: unknown) {
  return sqlState(error) === "23503";
}

export function isUniqueViolation(error: unknown) {
  return sqlState(error) === "23505";
}

// A post or comment deleted in the meantime makes the insert fail; there is nothing to add then.
export async function insertIgnoringGone(insert: () => Promise<unknown>) {
  try {
    await insert();
  } catch (error) {
    if (!isForeignKeyViolation(error)) throw error;
  }
}
