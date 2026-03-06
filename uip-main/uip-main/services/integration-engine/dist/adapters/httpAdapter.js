"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.httpAdapter = httpAdapter;
async function httpAdapter(endpoint, payload) {
    const res = await fetch(endpoint, {
        method: "POST",
        body: JSON.stringify(payload),
        headers: { "Content-Type": "application/json" }
    });
    return res.json();
}
