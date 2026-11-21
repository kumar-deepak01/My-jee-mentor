import { handleFinanceRequest } from './_finance-handler.js';

export default async function financeHandler(req, res) {
  try {
    const protocol = String(req.headers['x-forwarded-proto'] || 'https').split(',')[0];
    const host = req.headers.host || 'localhost';
    const requestUrl = new URL(req.url || '/api/finance', `${protocol}://${host}`).toString();
    const headers = new Headers();
    for (const name of ['cookie', 'content-type', 'origin', 'x-forwarded-for', 'x-real-ip']) {
      if (req.headers[name]) headers.set(name, req.headers[name]);
    }
    const method = req.method || 'GET';
    const hasBody = !['GET', 'HEAD'].includes(method);
    const parsedBody = req.body;
    const requestBody = parsedBody !== undefined ? typeof parsedBody === 'string' ? parsedBody : JSON.stringify(parsedBody) : req;
    const request = new Request(requestUrl, {
      method,
      headers,
      ...(hasBody ? (parsedBody !== undefined ? { body: requestBody } : { body: requestBody, duplex: 'half' }) : {})
    });
    const response = await handleFinanceRequest(request);
    response.headers.forEach((value, name) => res.setHeader(name, value));
    res.statusCode = response.status;
    res.end(Buffer.from(await response.arrayBuffer()));
  } catch (error) {
    console.error('Finance API adapter error:', error);
    res.statusCode = 500;
    res.setHeader('cache-control', 'no-store');
    res.setHeader('content-type', 'application/json; charset=utf-8');
    res.end(JSON.stringify({ message: 'The finance service is temporarily unavailable.' }));
  }
}
