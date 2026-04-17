function withCors(headers = {}) {
  return {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'public, max-age=300',
    'access-control-allow-origin': '*',
    ...headers
  };
}

export function json(data, init = {}) {
  const status = Number(init.status) || 200;
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: withCors(init.headers || {})
  });
}

export function methodNotAllowed(allowed = ['GET']) {
  return json({
    ok: false,
    error: {
      code: 'METHOD_NOT_ALLOWED',
      message: 'Only supported HTTP methods are allowed for this endpoint.',
      allowed
    }
  }, {
    status: 405,
    headers: {
      allow: allowed.join(', ')
    }
  });
}
