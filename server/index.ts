import express, { type Request, Response, NextFunction } from "express";
import session from "express-session";
import helmet from "helmet";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import { autoSeedIfEmpty } from "./auto-seed";
import { storage } from "./storage";

declare module "express-session" {
  interface SessionData {
    userId: string;
  }
}

const app = express();
const httpServer = createServer(app);

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

const isProduction = process.env.NODE_ENV === "production";

// Always trust proxy — Replit runs behind a reverse proxy in all environments
app.set("trust proxy", 1);

if (isProduction) {
  if (!process.env.SESSION_SECRET) {
    console.error("[SECURITY] SESSION_SECRET environment variable is not set. Refusing to start in production.");
    process.exit(1);
  }
}

app.use(
  helmet({
    crossOriginEmbedderPolicy: false,
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: [
          "'self'",
          "'unsafe-inline'",
          "'unsafe-eval'",
          "cdn.tailwindcss.com",
          "cdnjs.cloudflare.com",
          "cdn.jsdelivr.net",
          "unpkg.com",
        ],
        styleSrc: [
          "'self'",
          "'unsafe-inline'",
          "fonts.googleapis.com",
          "cdn.tailwindcss.com",
          "cdnjs.cloudflare.com",
          "unpkg.com",
        ],
        fontSrc: [
          "'self'",
          "fonts.gstatic.com",
          "cdnjs.cloudflare.com",
        ],
        imgSrc: [
          "'self'",
          "data:",
          "blob:",
          "replit.com",
          "images.unsplash.com",
          "images.pexels.com",
          "cdn-icons-png.flaticon.com",
          "www.transparenttextures.com",
          "grainy-gradients.vercel.app",
          "lh3.googleusercontent.com",
          "img.freepik.com",
        ],
        connectSrc: [
          "'self'",
          "ws:",
          "wss:",
        ],
        frameSrc: ["https://maps.google.com"],
        objectSrc: ["'none'"],
        ...(isProduction ? { upgradeInsecureRequests: [] } : {}),
      },
    },
  }),
);

app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false }));

app.use(
  session({
    name: "clinic_sid",
    secret: process.env.SESSION_SECRET || "dental-clinic-dev-secret-do-not-use-in-prod",
    resave: false,
    saveUninitialized: false,
    rolling: true,
    cookie: {
      secure: isProduction,
      httpOnly: true,
      maxAge: 8 * 60 * 60 * 1000,
      sameSite: isProduction ? "strict" : "lax",
    },
  }),
);

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      log(logLine);
    }
  });

  next();
});

async function requireAdminSession(req: Request, res: Response, next: NextFunction) {
  // When mounted at /admin, Express strips the prefix — req.path is /login not /admin/login
  const isLoginPage = req.path === "/login" || req.path === "/login/" || req.path === "/" || req.path === "";
  if (!req.session?.userId) {
    if (isLoginPage) {
      return next();
    }
    return res.redirect("/admin/login");
  }
  try {
    const user = await storage.getUser(req.session.userId);
    if (!user) {
      req.session.destroy(() => {});
      return res.redirect("/admin/login");
    }
    next();
  } catch {
    res.redirect("/admin/login");
  }
}

(async () => {
  await registerRoutes(httpServer, app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (process.env.NODE_ENV === "production") {
    app.use("/admin", requireAdminSession);
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || "5000", 10);
  httpServer.listen(
    {
      port,
      host: "0.0.0.0",
      reusePort: true,
    },
    async () => {
      log(`serving on port ${port}`);
      await autoSeedIfEmpty();
    },
  );
})();
