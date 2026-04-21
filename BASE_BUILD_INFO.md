# Base Build & Builder Codes - NEO-FlowOFF

This document captures the current state of the integration with **Base Build** and **Builder Codes** (ERC-8021)
as of 2026-04-03.

## 📊 Connection Details

| Field | Value | Location |
| --- | --- | --- |
| **Base App ID** | `6951db634d3a403912ed8464` | `.env` / `index.html` (meta) |
| **Builder Code** | `bc_vtdb7381` | `.env` |
| **Dashboard URL** | [Base Build Dashboard](https://base.dev/apps/6951db634d3a403912ed8464/dashboard) | Online |

## ✅ Completed Tasks

1. **Dashboard Registration:** App registered on `base.dev` under the "NEØ PROTOCOL" organization.
2. **Meta Tag Integration:** Added the following to the `<head>` of `index.html` and `mint.astro`:

   ```html
   <meta name="base:app_id" content="6951db634d3a403912ed8464" />
   ```

   _This enables analytics surfacing within the Base App / Mini App ecosystem._

## 🚀 Next Steps (Implementation)

To officially attribute on-chain transactions (like the "Claim $NEOFLW" feature) to the NEO Protocol, the **Builder
Code suffix** needs to be appended to all transaction calldata.

### 1. Requirements

Builder Codes use **ERC-8021**. The suffix is a 16-byte value appended to the end of the `data` field in any
Ethereum transaction.

- **Suffix structure:** `0x...[Code]...8021802180218021` (ending in 8021 repeating).

### 2. Implementation with Viem/Wagmi

If the project moves from mock logic to real `viem` transactions:

```javascript
import { encodePacked } from "viem";

// Example: Appending the builder code suffix
const BUILDER_CODE = "bc_vtdb7381";
// Note: Base standard usually handles this via specific libraries or by manually
// appending the hex representation of the code followed by the ERC-8021 marker.

// Manual suffix calculation (simplified):
// The suffix is usually 16 bytes.
// Check https://docs.base.org for the exact encoding helper.
```

### 3. Monitoring

- Progress can be tracked in the **"Onchain"** tab of the Base Build Dashboard.
- Attribution counts increment when transactions with the `bc_vtdb7381` suffix are processed.

---

> [!TIP]
> Verified transactions on Base using Builder Codes can unlock rewards and increase visibility in the Base ecosystem
> leaderboards.
