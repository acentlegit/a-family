"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authorize = authorize;
function authorize(intent, roles) {
    if (roles.includes("ADMIN"))
        return { authorized: true };
    if (intent.type === "EXECUTE" && !roles.includes("AUTHORITY")) {
        return { authorized: false, reason: "Authority role required" };
    }
    return { authorized: true };
}
