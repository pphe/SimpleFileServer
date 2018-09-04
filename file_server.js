"use strict";

const { createServer } = require("http");
const { parse } = require("url");
const { resolve } = require("path");
const { createReadStream, createWriteStream } = require("fs");
const { stat, readdir, rmdir, unlink } = require("mz/fs");
const mime = require("mime");
const baseDirectory = process.cwd();

// holds the HTTP commands for GET, POST, PUT, etc.
const methods = Object.create(null);

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

// handler method for GET requests
methods.GET = async function (request) {
    let path = urlPath(request.url);
    let stats;

    // get info about file/directory
    try {
        stats = await stat(path);
    } catch (error) {
        if (error.code != "ENOENT") throw error;
        else return { status: 404, body: "File not found" };
    }

    // return appropriate info
    if (stats.isDirectory()) {
        return { body: (await readdir(path)).join("\n") };
    } else {
        // read file contents
        return {
            body: createReadStream(path),
            type: mime.getType(path)
        };
    }
};

// handler method for DELETE requests
methods.DELETE = async function (request) {
    let path = urlPath(request.url);
    let stats;

    // get info about file/directory
    try {
        stats = await stat(path);
    } catch (error) {
        if (error.code != "ENOENT") throw error;
        else return { status: 204 };
    }

    // perform delete operation
    if (stats.isDirectory()) await rmdir(path);
    else await unlink(path);
    return { status: 204 };
};

// handler method for PUT requests
methods.PUT = async function(request) {
    let path = urlPath(request.url);
    await pipeStream(request, createWriteStream(path));
    return { status: 204 };
};

// helper for piping from readable stream to writeable stream
// as a Promise
function pipeStream(from, to) {
    return new Promise((resolve, reject) => {
        from.on("error", reject);
        to.on("error", reject);
        to.on("finish", resolve);
        from.pipe(to);
    });
}

// to deny unsupported requests
async function notAllowed(request) {
    return {
        status: 405,
        body: `Method ${request.method} not allowed.`
    };
}

// helper to resolve valid file paths for requests
function urlPath(url) {
    let { pathname } = parse(url);

    // prevent client from traversing outside of base directory
    let path = resolve(decodeURIComponent(pathname).slice(1));

    if (path != baseDirectory && !path.startsWith(baseDirectory + "/")) {
        throw { status: 403, body: "Forbidden" };
    }

    return path;
}