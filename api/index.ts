import "dotenv/config";
import { createApp } from "../server/_core/index";

const appPromise = createApp();

export default async function handler(req: any, res: any) {
  const app = await appPromise;
  return app(req, res);
}
