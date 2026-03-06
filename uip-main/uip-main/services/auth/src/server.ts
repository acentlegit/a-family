
import Fastify from "fastify";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { createClient } from "redis";

const app = Fastify();

// Redis client (with in-memory fallback)
let redisClient: any = null;
const inMemoryStore: Map<string, string> = new Map();

// Initialize Redis client (with fallback to in-memory storage)
(async () => {
  try {
    redisClient = createClient({
      url: process.env.REDIS_URL || "redis://localhost:6379"
    });
    
    redisClient.on("error", (err: Error) => {
      console.warn("Redis connection error, using in-memory storage:", err.message);
      redisClient = null;
    });
    
    await redisClient.connect();
    console.log("✓ Redis connected successfully");
  } catch (error: any) {
    console.warn("Redis not available, using in-memory storage:", error.message);
    redisClient = null;
  }
})();

// Role definitions
export enum Role {
  SUPER_USER = "super_user",
  BUSINESS_ADMIN = "business_admin",
  USER = "user"
}

// Permission definitions
export enum Permission {
  // Tenant Management
  CREATE_TENANT = "create_tenant",
  MANAGE_ALL_TENANTS = "manage_all_tenants",
  
  // User Management
  MANAGE_ALL_USERS = "manage_all_users",
  MANAGE_TENANT_USERS = "manage_tenant_users",
  
  // Role Assignment
  ASSIGN_ROLES = "assign_roles",
  ASSIGN_TENANT_ROLES = "assign_tenant_roles",
  
  // Intent Configuration
  CONFIGURE_INTENTS = "configure_intents",
  CONFIGURE_TENANT_INTENTS = "configure_tenant_intents",
  
  // Dashboards
  VIEW_ALL_DASHBOARDS = "view_all_dashboards",
  VIEW_TENANT_DASHBOARDS = "view_tenant_dashboards",
  VIEW_LIMITED_DASHBOARDS = "view_limited_dashboards",
  
  // Integrations
  MANAGE_GLOBAL_INTEGRATIONS = "manage_global_integrations",
  MANAGE_TENANT_INTEGRATIONS = "manage_tenant_integrations",
  
  // Billing
  MANAGE_PLATFORM_BILLING = "manage_platform_billing",
  MANAGE_TENANT_BILLING = "manage_tenant_billing",
  
  // Audit Logs
  VIEW_ALL_AUDIT_LOGS = "view_all_audit_logs",
  VIEW_TENANT_AUDIT_LOGS = "view_tenant_audit_logs",
  
  // Cross-tenant Access
  CROSS_TENANT_ACCESS = "cross_tenant_access"
}

// Permission matrix: Role -> Permissions
const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  [Role.SUPER_USER]: [
    Permission.CREATE_TENANT,
    Permission.MANAGE_ALL_TENANTS,
    Permission.MANAGE_ALL_USERS,
    Permission.ASSIGN_ROLES,
    Permission.CONFIGURE_INTENTS,
    Permission.VIEW_ALL_DASHBOARDS,
    Permission.MANAGE_GLOBAL_INTEGRATIONS,
    Permission.MANAGE_PLATFORM_BILLING,
    Permission.VIEW_ALL_AUDIT_LOGS,
    Permission.CROSS_TENANT_ACCESS
  ],
  [Role.BUSINESS_ADMIN]: [
    Permission.MANAGE_TENANT_USERS,
    Permission.ASSIGN_TENANT_ROLES,
    Permission.CONFIGURE_TENANT_INTENTS,
    Permission.VIEW_TENANT_DASHBOARDS,
    Permission.MANAGE_TENANT_INTEGRATIONS,
    Permission.MANAGE_TENANT_BILLING,
    Permission.VIEW_TENANT_AUDIT_LOGS
  ],
  [Role.USER]: [
    Permission.VIEW_LIMITED_DASHBOARDS
  ]
};

// In-memory stores (in production, use a database)
interface Tenant {
  id: string;
  name: string;
  createdAt: string;
  createdBy: string;
}

interface User {
  id: string;
  username: string;
  email: string;
  password: string; // hashed
  role: Role;
  tenantId: string | null; // null for super users
  createdAt: string;
  createdBy: string;
}

const users: Map<string, User> = new Map();
const tenants: Map<string, Tenant> = new Map();

const JWT_SECRET = process.env.JWT_SECRET || "uip-secret-key-change-in-production";

// Helper: Get permissions for a role
function getPermissions(role: Role): Permission[] {
  return ROLE_PERMISSIONS[role] || [];
}

// Helper: Check if user has permission
function hasPermission(userRole: Role, permission: Permission): boolean {
  return getPermissions(userRole).includes(permission);
}

// Helper: Validate tenant access
function canAccessTenant(user: User, tenantId: string): boolean {
  // Super users can access all tenants
  if (user.role === Role.SUPER_USER) {
    return true;
  }
  // Business admins and users can only access their own tenant
  return user.tenantId === tenantId;
}

// Initialize default super user
function initializeSuperUser() {
  const superUserId = "super-user-001";
  
  // Remove ALL existing users with username "admin" to avoid conflicts
  const usersToDelete: string[] = [];
  for (const [userId, user] of users.entries()) {
    if (user.username === "admin") {
      usersToDelete.push(userId);
    }
  }
  usersToDelete.forEach(userId => {
    users.delete(userId);
    console.log(`Removed conflicting admin user: ${userId}`);
  });
  
  // Always create the super user (override if exists)
  const hashedPassword = bcrypt.hashSync("admin123", 10);
  users.set(superUserId, {
    id: superUserId,
    username: "admin",
    email: "admin@uip.platform",
    password: hashedPassword,
    role: Role.SUPER_USER,
    tenantId: null,
    createdAt: new Date().toISOString(),
    createdBy: "system"
  });
  
  // Verify it was created correctly
  const createdUser = users.get(superUserId);
  if (createdUser && createdUser.role === Role.SUPER_USER) {
    console.log("✓ Initialized default super user: admin / admin123");
    console.log(`✓ User ID: ${superUserId}, Role: ${createdUser.role}`);
  } else {
    console.error("ERROR: Failed to initialize super user correctly!");
  }
}

// Create Tenant (Super User only)
app.post("/tenants", async (req: any, reply) => {
  try {
    // Get auth token from header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return reply.code(401).send({ error: "Unauthorized" });
    }
    
    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    const user = users.get(decoded.sub);
    
    if (!user || !hasPermission(user.role, Permission.CREATE_TENANT)) {
      return reply.code(403).send({ error: "Forbidden: Super user access required" });
    }
    
    const { name } = req.body;
    if (!name) {
      return reply.code(400).send({ error: "Tenant name is required" });
    }
    
    // Check if tenant name already exists
    for (const tenant of tenants.values()) {
      if (tenant.name.toLowerCase() === name.toLowerCase()) {
        return reply.code(400).send({ error: "Tenant name already exists" });
      }
    }
    
    const tenantId = `tenant-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newTenant: Tenant = {
      id: tenantId,
      name,
      createdAt: new Date().toISOString(),
      createdBy: user.id
    };
    
    tenants.set(tenantId, newTenant);
    
    reply.send({
      id: tenantId,
      name,
      createdAt: newTenant.createdAt
    });
  } catch (error: any) {
    reply.code(500).send({ error: error.message });
  }
});

// List Tenants
app.get("/tenants", async (req: any, reply) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return reply.code(401).send({ error: "Unauthorized" });
    }
    
    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    const user = users.get(decoded.sub);
    
    if (!user) {
      return reply.code(401).send({ error: "Unauthorized" });
    }
    
    // Super users see all tenants
    if (user.role === Role.SUPER_USER) {
      const allTenants = Array.from(tenants.values()).map(t => ({
        id: t.id,
        name: t.name,
        createdAt: t.createdAt
      }));
      return reply.send({ tenants: allTenants });
    }
    
    // Business admins and users see only their tenant
    if (user.tenantId) {
      const tenant = tenants.get(user.tenantId);
      if (tenant) {
        return reply.send({ tenants: [{
          id: tenant.id,
          name: tenant.name,
          createdAt: tenant.createdAt
        }] });
      }
    }
    
    reply.send({ tenants: [] });
  } catch (error: any) {
    reply.code(500).send({ error: error.message });
  }
});

// Register new user
app.post("/register", async (req: any, reply) => {
  try {
    const { username, email, password, role, tenantId } = req.body;
    
    if (!username || !email || !password) {
      return reply.code(400).send({ error: "Username, email, and password are required" });
    }
    
    // Validate role
    let userRole: Role;
    if (role === "super_user") {
      userRole = Role.SUPER_USER;
    } else if (role === "business_admin") {
      userRole = Role.BUSINESS_ADMIN;
    } else {
      userRole = Role.USER;
    }
    
    const isSuperUser = userRole === Role.SUPER_USER;

    // Super users cannot be created through registration (must be created by system)
    if (isSuperUser) {
      return reply.code(403).send({ error: "Super user accounts cannot be created through registration" });
    }
    
    // Business admins and users require a tenant
    if (!tenantId) {
      return reply.code(400).send({ error: "Tenant ID is required for business admin and user roles" });
    }
    
    // Validate tenant exists if provided
    if (tenantId && !tenants.has(tenantId)) {
      return reply.code(400).send({ error: "Invalid tenant ID" });
    }
    
    // Check if user already exists
    for (const user of users.values()) {
      if (user.username === username || user.email === email) {
        return reply.code(400).send({ error: "Username or email already exists" });
      }
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Create user
    const userId = `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newUser: User = {
      id: userId,
      username,
      email,
      password: hashedPassword,
      role: userRole,
      tenantId: isSuperUser ? null : tenantId,
      createdAt: new Date().toISOString(),
      createdBy: "self-registration"
    };
    
    users.set(userId, newUser);
    
    // Generate JWT token
    const token = jwt.sign({ 
      sub: userId, 
      username, 
      email, 
      role: userRole,
      tenantId: newUser.tenantId
    }, JWT_SECRET, { expiresIn: "30d" });
    
    reply.send({ 
      token,
      user: {
        id: userId,
        username,
        email,
        role: userRole,
        tenantId: newUser.tenantId
      }
    });
  } catch (error: any) {
    reply.code(500).send({ error: error.message });
  }
});

// Login user
app.post("/login", async (req: any, reply) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return reply.code(400).send({ error: "Username and password are required" });
    }
    
    // Find user by username or email (prioritize super_user if multiple matches)
    let user: User | undefined;
    let superUserMatch: User | undefined;
    for (const u of users.values()) {
      if (u.username === username || u.email === username) {
        if (u.role === Role.SUPER_USER) {
          superUserMatch = u;
          break; // Prioritize super_user
        }
        if (!user) {
          user = u; // Store first match as fallback
        }
      }
    }
    // Use super_user if found, otherwise use first match
    if (superUserMatch) {
      user = superUserMatch;
    }
    
    if (!user) {
      return reply.code(401).send({ error: "Invalid username or password" });
    }
    
    // Verify password
    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return reply.code(401).send({ error: "Invalid username or password" });
    }
    
    // Generate JWT token
    const token = jwt.sign({ 
      sub: user.id, 
      username: user.username, 
      email: user.email,
      role: user.role,
      tenantId: user.tenantId
    }, JWT_SECRET, { expiresIn: "30d" });
    
    reply.send({ 
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        tenantId: user.tenantId
      }
    });
  } catch (error: any) {
    reply.code(500).send({ error: error.message });
  }
});

// Create user (Admin only - for user management)
app.post("/users", async (req: any, reply) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return reply.code(401).send({ error: "Unauthorized" });
    }
    
    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    const currentUser = users.get(decoded.sub);
    
    if (!currentUser) {
      return reply.code(401).send({ error: "Unauthorized" });
    }
    
    const { username, email, password, role, tenantId } = req.body;
    
    if (!username || !email || !password) {
      return reply.code(400).send({ error: "Username, email, and password are required" });
    }
    
    // Check permissions
    let canCreate = false;
    let targetTenantId = tenantId;
    
    if (currentUser.role === Role.SUPER_USER) {
      canCreate = hasPermission(currentUser.role, Permission.MANAGE_ALL_USERS);
    } else if (currentUser.role === Role.BUSINESS_ADMIN) {
      canCreate = hasPermission(currentUser.role, Permission.MANAGE_TENANT_USERS);
      // Business admins can only create users in their own tenant
      targetTenantId = currentUser.tenantId;
    }
    
    if (!canCreate) {
      return reply.code(403).send({ error: "Forbidden: Insufficient permissions" });
    }
    
    // Validate role assignment permissions
    let userRole: Role;
    if (role === "business_admin") {
      userRole = Role.BUSINESS_ADMIN;
      if (currentUser.role === Role.BUSINESS_ADMIN && !hasPermission(currentUser.role, Permission.ASSIGN_TENANT_ROLES)) {
        return reply.code(403).send({ error: "Forbidden: Cannot assign business admin role" });
      }
    } else {
      userRole = Role.USER;
    }
    
    // Super users cannot be created this way
    if (role === "super_user") {
      return reply.code(403).send({ error: "Super user accounts cannot be created through this endpoint" });
    }
    
    // Validate tenant
    if (targetTenantId && !tenants.has(targetTenantId)) {
      return reply.code(400).send({ error: "Invalid tenant ID" });
    }
    
    // Check if user already exists
    for (const user of users.values()) {
      if (user.username === username || user.email === email) {
        return reply.code(400).send({ error: "Username or email already exists" });
      }
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Create user
    const userId = `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newUser: User = {
      id: userId,
      username,
      email,
      password: hashedPassword,
      role: userRole,
      tenantId: targetTenantId,
      createdAt: new Date().toISOString(),
      createdBy: currentUser.id
    };
    
    users.set(userId, newUser);
    
    reply.send({
      id: userId,
      username,
      email,
      role: userRole,
      tenantId: newUser.tenantId,
      createdAt: newUser.createdAt
    });
  } catch (error: any) {
    reply.code(500).send({ error: error.message });
  }
});

// List users
app.get("/users", async (req: any, reply) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return reply.code(401).send({ error: "Unauthorized" });
    }
    
    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    const currentUser = users.get(decoded.sub);
    
    if (!currentUser) {
      return reply.code(401).send({ error: "Unauthorized" });
    }
    
    let userList: User[] = [];
    
    if (currentUser.role === Role.SUPER_USER) {
      // Super users see all users
      userList = Array.from(users.values());
    } else if (currentUser.role === Role.BUSINESS_ADMIN && currentUser.tenantId) {
      // Business admins see only users in their tenant
      userList = Array.from(users.values()).filter(u => u.tenantId === currentUser.tenantId);
    }
    
    // Return user list without passwords
    const safeUserList = userList.map(u => ({
      id: u.id,
      username: u.username,
      email: u.email,
      role: u.role,
      tenantId: u.tenantId,
      createdAt: u.createdAt
    }));
    
    reply.send({ users: safeUserList });
  } catch (error: any) {
    reply.code(500).send({ error: error.message });
  }
});

// Get user permissions
app.get("/users/me/permissions", async (req: any, reply) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return reply.code(401).send({ error: "Unauthorized" });
    }
    
    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    const user = users.get(decoded.sub);
    
    if (!user) {
      return reply.code(401).send({ error: "Unauthorized" });
    }
    
    const permissions = getPermissions(user.role);
    
    reply.send({
      userId: user.id,
      role: user.role,
      tenantId: user.tenantId,
      permissions
    });
  } catch (error: any) {
    reply.code(500).send({ error: error.message });
  }
});

// Verify token
app.post("/verify", async (req: any, reply) => {
  try {
    const { token } = req.body;
    
    if (!token) {
      return reply.code(400).send({ error: "Token is required" });
    }
    
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    const user = users.get(decoded.sub);
    
    if (!user) {
      return reply.code(401).send({ error: "User not found" });
    }
    
    reply.send({ 
      valid: true,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        tenantId: user.tenantId
      },
      permissions: getPermissions(user.role)
    });
  } catch (error: any) {
    reply.code(401).send({ error: "Invalid token", valid: false });
  }
});

// Save case file to Redis (stores only the latest)
app.post("/case-file/save", async (req: any, reply) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return reply.code(401).send({ error: "Unauthorized" });
    }
    
    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    const user = users.get(decoded.sub);
    
    if (!user) {
      return reply.code(401).send({ error: "Unauthorized" });
    }
    
    const { caseFileData } = req.body;
    
    if (!caseFileData) {
      return reply.code(400).send({ error: "Case file data is required" });
    }
    
    const caseFileRecord = {
      ...caseFileData,
      savedBy: user.id,
      savedAt: new Date().toISOString(),
      userId: user.id,
      tenantId: user.tenantId
    };
    
    const key = "case-file:latest";
    const value = JSON.stringify(caseFileRecord);
    
    // Store in Redis or in-memory fallback
    if (redisClient) {
      await redisClient.set(key, value);
    } else {
      inMemoryStore.set(key, value);
    }
    
    reply.send({
      success: true,
      message: "Case file saved successfully"
    });
  } catch (error: any) {
    reply.code(500).send({ error: error.message });
  }
});

// Get latest case file from Redis
app.get("/case-file/history", async (req: any, reply) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return reply.code(401).send({ error: "Unauthorized" });
    }
    
    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    const user = users.get(decoded.sub);
    
    if (!user) {
      return reply.code(401).send({ error: "Unauthorized" });
    }
    
    const key = "case-file:latest";
    let value: string | null = null;
    
    // Get from Redis or in-memory fallback
    if (redisClient) {
      value = await redisClient.get(key);
    } else {
      value = inMemoryStore.get(key) || null;
    }
    
    if (!value) {
      return reply.send({ caseFileData: null });
    }
    
    const caseFileData = JSON.parse(value);
    reply.send({ caseFileData });
  } catch (error: any) {
    reply.code(500).send({ error: error.message });
  }
});

// Legacy endpoint for backward compatibility
app.post("/token", async (req, reply) => {
  const token = jwt.sign({ 
    sub: "guest-user", 
    role: Role.USER,
    tenantId: null
  }, JWT_SECRET);
  reply.send({ token });
});

// CORS middleware
app.addHook('onRequest', async (request, reply) => {
  reply.header('Access-Control-Allow-Origin', '*');
  reply.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  reply.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (request.method === 'OPTIONS') {
    reply.code(200).send();
  }
});

// Initialize super user on startup
initializeSuperUser();

app.listen({ port: 4000, host: "0.0.0.0" }).then(() => {
  console.log("Auth service listening on port 4000");
  console.log("RBAC System initialized:");
  console.log("  - Super User: admin / admin123");
  console.log("  - Roles: super_user, business_admin, user");
  console.log("  - Multi-tenant support enabled");
});
