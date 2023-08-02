'use strict';

const handleRequest = async (request, env, ctx) => {
  const url = new URL(request.url);
  if (url.pathname.startsWith('/drafts/')) {
    return new Response('Not Found', { status: 404 });
  }

  url.hostname = env.ORIGIN_HOSTNAME;
  const req = new Request(url, request);
  req.headers.set('x-forwarded-host', req.headers.get('host'));
  req.headers.set('x-byo-cdn-type', 'cloudflare');
  // set the following header if push invalidation is configured
  // (see https://www.hlx.live/docs/setup-byo-cdn-push-invalidation#cloudflare)
  req.headers.set('x-push-invalidation', 'enabled');

  let resp = fetchAndStream(req)
  // ctx.passThroughOnException();
  
  return resp;
};

// addEventListener("fetch", event => {
//   event.respondWith(fetchAndStream(event.request))
//   event.passThroughOnException()
// })

export default {
  fetch: handleRequest,
};



async function fetchAndStream(request) {
  let response = await fetch(request, {
    cf: {
      // cf doesn't cache html by default: need to override the default behavior
      cacheEverything: true,
    },
  });

  let contentType = response.headers.get('content-type')

  if (!contentType || !contentType.startsWith("text/")) {
    return response
  }
  let { readable, writable } = new TransformStream()
  let newResponse = new Response(readable, response)
  newResponse.headers.set('cache-control', 'max-age=0')
  newResponse.headers.delete('age');
  newResponse.headers.delete('x-robots-tag');

  streamTransformBody(response.body, writable)
  return newResponse
}

async function handleTemplate(encoder, templateKey) {
  const linkRegex = /(esi:include.*src="(.*?)".*\/)/gm
  let result = linkRegex.exec(templateKey);
  let esi
  if (!result) {
    return encoder.encode(`<${templateKey}>`);
  }
  if (result[2]) {
    esi = await subRequests(result[2]);
  }
  return encoder.encode(
    `${esi}`
  );
}

async function subRequests(target){
  const init = {
            method: 'GET',
            headers: {
                'user-agent': 'cloudflare'
            }
        }
  let response = await fetch(target, init)
  let text = await response.text()
  
  return text
}

async function streamTransformBody(readable, writable) {
  const startTag = "<".charCodeAt(0);
  const endTag = ">".charCodeAt(0);
  let reader = readable.getReader();
  let writer = writable.getWriter();

  let templateChunks = null;
  while (true) {
    let { done, value } = await reader.read();
    if (done) break;
    while (value.byteLength > 0) {
      if (templateChunks) {
        let end = value.indexOf(endTag);
        if (end === -1) {
          templateChunks.push(value);
          break;
        } else {
          templateChunks.push(value.subarray(0, end));
          await writer.write(await translate(templateChunks));
          templateChunks = null;
          value = value.subarray(end + 1);
        }
      }
      let start = value.indexOf(startTag);
      if (start === -1) {
        await writer.write(value);
        break;
      } else {
        await writer.write(value.subarray(0, start));
        value = value.subarray(start + 1);
        templateChunks = [];
      }
    }
  }
  await writer.close();
}

async function translate(chunks) {
  const decoder = new TextDecoder();

  let templateKey = chunks.reduce(
    (accumulator, chunk) =>
      accumulator + decoder.decode(chunk, { stream: true }),
    ""
  );
  templateKey += decoder.decode();

  return handleTemplate(new TextEncoder(), templateKey);
}