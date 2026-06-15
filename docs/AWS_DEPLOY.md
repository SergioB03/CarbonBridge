# Deploying CarbonBridge on AWS (Amplify + Bedrock copilot)

Two independent pieces. **You can ship Amplify hosting alone** (≈free, gives judges a live URL) and add the copilot later. Everything here is done in your AWS Console — Claude built the configs/code but cannot log into your account.

> 💰 Cost: Amplify hosting ≈ free tier. Bedrock copilot ≈ pennies–$3 at demo volume. **Tear both down after the hackathon** (delete the Amplify app + the Lambda) so nothing lingers. Set a $10 Billing budget alert first.

---

## 1. Amplify hosting (do this first — highest value, lowest effort)

1. AWS Console → **Amplify** → **Create new app** → **GitHub** → authorize → pick **`SergioB03/carbon`**, branch **`main`**.
2. Amplify auto-detects **`amplify.yml`** in the repo (build = `npm ci && npm run build`, output = `dist/`). Accept it.
3. **Deploy.** In ~2–3 min you get a live URL like `https://main.xxxxx.amplifyapp.com`. Share that with judges/teammates.
4. Auto-redeploys on every push to `main`.

That's it for hosting. The Copilot button will show "○ not wired" until you do step 3 below.

---

## 2. Enable Claude on Bedrock

1. Console → **Bedrock** → **Model access** (pick a region, e.g. **us-east-1**).
2. Request access to **Anthropic — Claude Sonnet 4.6** (and Haiku 4.5 if you want the cheap option). Wait for **Access granted** (usually instant).
   - Bedrock model IDs are `anthropic.`-prefixed (e.g. `anthropic.claude-sonnet-4-6`). The Lambda defaults to Sonnet; set `MODEL_ID=anthropic.claude-haiku-4-5` to cut cost.

## 3. Deploy the copilot Lambda

The code is in **`infra/lambda/`** (`copilot.mjs` + `package.json`). It calls Bedrock's Converse API.

```bash
# Bundle it (the Bedrock SDK isn't in the default Lambda runtime, so vendor it):
cd infra/lambda
npm install
zip -r ../copilot.zip .          # copilot.mjs + node_modules
```

1. Console → **Lambda** → **Create function** → **Node.js 20.x** → name `carbonbridge-copilot`. Use the **same region** as Bedrock model access.
2. **Upload** `copilot.zip`. Set **Handler = `copilot.handler`**.
3. **Configuration → Permissions** → click the execution role → add an inline policy:
   ```json
   { "Version": "2012-10-17", "Statement": [
     { "Effect": "Allow", "Action": "bedrock:InvokeModel", "Resource": "*" } ] }
   ```
4. **Configuration → Function URL** → Create → **Auth type: NONE** (demo) → **CORS: Allow origin `*`**. Copy the URL.
   - (Optional) `MODEL_ID` env var to override the model. Increase **timeout to ~30s**.

## 4. Wire the frontend to the copilot

- **Amplify** → your app → **Environment variables** → add `VITE_COPILOT_URL` = the Function URL → **Redeploy**.
- **Local dev**: copy `.env.example` → `.env`, set `VITE_COPILOT_URL`, `npm run dev`.

The Copilot button flips to **"● Bedrock"** and answers for real. Without it, the UI still runs (graceful "not wired" message) — and the rest of the app already uses real data.

---

## Security / teardown checklist
- Function URL auth is **NONE** for the demo — fine for a short-lived hackathon endpoint; delete it after. For anything longer, use `AWS_IAM` + signed requests.
- `bedrock:InvokeModel` on `*` is broad for convenience; scope to the model ARN for production.
- **After the hackathon:** delete the Amplify app, the Lambda, and the Function URL. Confirm $0 in Billing.
