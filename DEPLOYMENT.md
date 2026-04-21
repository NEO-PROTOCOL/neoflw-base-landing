# 🚀 DEPLOYMENT GUIDE - neoflowoff.eth.limo

## Step 1: Deploy to Vercel (5 min)

### Option A: CLI

```bash
npm install -g vercel
vercel login
vercel deploy --prod
```

### Option B: GitHub

1. Create GitHub repo: `NEO-FlowOFF/neoflw-token-page`
2. Push code: `git push origin main`
3. Go to <https://vercel.com>
4. Import GitHub repo
5. Set domain: `neoflowoff.vercel.app` (auto)
6. Deploy

### Expected Output

```text
✓ Production: https://neoflowoff.vercel.app
✓ Domain: neoflowoff.vercel.app
✓ Status: Ready
```

---

## Step 2: Setup ENS (10 min)

### Via ENS Manager (<https://app.ens.domains>)

1. **Connect Wallet** (MetaMask, Rabby, etc.)

2. **Search:** `neoflowoff.eth`

3. **Click:** "Set Records" → "Edit Records"

4. **Add Text Record:**

   - Type: `url`
   - Value: `https://neoflowoff.vercel.app`

5. **Alternative - Add IPFS (if using IPFS):**

   - Type: `contenthash`
   - Value: `ipfs://QmXXXXXX...` (IPFS hash)

6. **Save & Confirm Transaction**

---

## Step 3: Access via .limo Gateway (Automatic)

Once ENS is set, automatically accessible via:

- **Cloudflare:** `https://neoflowoff.eth.limo`
- **EthDNS:** `https://neoflowoff.eth.limo`
- **Vercel Direct:** `https://neoflowoff.vercel.app`

---

## Step 4: Custom Domain (Optional - 15 min)

If you want `https://token.flowoff.xyz` or similar:

### On Vercel

1. Go to Project Settings → Domains
2. Add custom domain: `token.flowoff.xyz`
3. Add DNS records (Vercel will show)

### On DNS Provider (Cloudflare, Route53, etc.)

```text
CNAME: token.flowoff.xyz → neoflowoff.vercel.app
CNAME: www.token.flowoff.xyz → neoflowoff.vercel.app
```

---

## ✅ Verification Checklist

- [ ] Site deployed to Vercel
- [ ] Production URL working
- [ ] ENS record updated (if using .limo)
- [ ] Links accessible:
  - [ ] <https://neoflowoff.eth.limo>
  - [ ] <https://neoflowoff.vercel.app>
  - [ ] Links to Basescan work
  - [ ] Links to Uniswap work
- [ ] Mobile responsive (test on phone)
- [ ] SEO tags present

---

## 🎯 Final URLs for Listings

Use these URLs when submitting to listing platforms:

- **Primary:** `https://neoflowoff.eth.limo` (ENS gateway)
- **Backup:** `https://neoflowoff.vercel.app` (direct)
- **Alternative:** `https://token.flowoff.xyz` (if custom domain added)

---

## 📊 Monitoring

### Vercel Analytics

- <https://vercel.com/[team]/neoflw-token-page/analytics>

### Check Status

```bash
# Test site accessibility
curl -I https://neoflowoff.eth.limo

# Check DNS
nslookup neoflowoff.eth.limo
```

---

## 🔄 Updates

To update site after deployment:

```bash
# Edit files locally
# e.g., index.html

# Commit & push
git add .
git commit -m "docs: update token info"
git push origin main

# Auto-deploys to Vercel
# OR manually: vercel deploy --prod
```

---

## 🆘 Troubleshooting

| Issue | Solution |
| --- | --- |
| `neoflowoff.eth.limo` not resolving | Wait 5-10 min for ENS to propagate, clear cache, try incognito |
| Vercel deploy fails | Check `npm run build` locally, ensure no errors |
| ENS record not updating | Confirm wallet is owner, check gas, wait for confirmation |
| Links broken | Verify Basescan/Uniswap URLs still work |
| Slow loading | Clear browser cache, check Vercel analytics for issues |

---

## 📝 Next Steps

After deployment:

1. ✅ Share link in Discord/Telegram
2. ✅ Add to listing submissions (DexScreener, Basescan, etc.)
3. ✅ Monitor site analytics
4. ✅ Update content as needed

---

**Deployed:** 2026-03-17

**Status:** 🟢 Ready for listing submissions
