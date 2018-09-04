"use strict";

const { createServer } = require("http");

// object holds the handlers for GET, PUT, DELETE, etc.
const methods = require("./handlers");

createServer((request, response) => {
    let handler = methods[request.method] || notAllowed;
    handler(request)
        .catch(error => {
            if (error.status != null) return error;
            return { body: String(error), status: 500 };
        })
        .then(({ body, status = 200, type = "text/plain" }) => {
            response.writeHead(status, { "Content-Type": type });
            if (body && body.pipe) body.pipe(response);
            else response.end(body);
        });
}).listen(8000);

// to deny unsupported requests
async function notAllowed(request) {
    return {
        status: 405,
        body: `Method ${request.method} not allowed.`
    };
}
