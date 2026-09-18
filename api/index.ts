import "dotenv/config";

let appPromise: Promise<any> | null = null;

async function getApp() {
  if (!appPromise) {
    appPromise = import("../dist/index.js")
      .then(({ createApp }) => {
        if (typeof createApp !== "function") {
          throw new Error("NUMI bundled server does not export createApp");
        }
        return createApp();
      })
      .catch(error => {
        console.error("[Vercel] NUMI app initialization failed", error);
        appPromise = null;
        throw error;
      });
  }
  return appPromise;
}

export default async function handler(req: any, res: any) {
  try {
    const app = await getApp();
    return app(req, res);
  } catch (error) {
    console.error("[Vercel] NUMI function invocation failed", error);
    if (!res.headersSent) {
      res.status(500).json({
        error: "NUMI server initialization failed",
        requestId: req.headers?.["x-vercel-id"] || null,
      });
    }
  }
}
