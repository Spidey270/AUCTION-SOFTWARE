# ⚡ AUCTION COMMAND // Tactical War Room & Tournament Platform

A high-performance desktop application designed for **college and tournament sports auctions** (IPL Cricket, European Football, and custom competitions), equipped with **Google Gemini 2.5 Flash** for intelligent sheet reading, rule extraction, and live bidding game theory.

---

## 🌟 What's New in v2.5

### 1. 🏠 Mission Control Homepage
* Manage multiple saved tournaments and mock auctions.
* View live status: Squad progress, purse spent, cumulative ratings, and date created.
* Single-click **"Enter War Room"** to resume any active tournament.

### 2. 🪄 4-Step "New Auction Wizard"
* **Step 1: Tournament Identity & Sport Format** (Cricket / IPL or European Football).
* **Step 2: AI Rule Extractor** 
  * Paste the raw WhatsApp text or competition brochure rules, and **Gemini 2.5 Flash** automatically configures purse budgets, squad minimums, and foreign caps.
* **Step 3: AI-Powered Player List Importer**
  * Drop any messy Excel (.xlsx) or CSV file provided by organizers.
  * Gemini AI parses non-standard column headers, standardizes positions, handles overseas flags, and imputes missing ratings.
* **Step 4: Competitor Radar Setup**
  * Add the rival college teams competing in your auction.

### 3. 🤖 Live AI Auction Strategist ("JARVIS for Auctions")
* **Real-time Tactical Queries:**
  * **Should I Bid?** Evaluates player value vs current bid vs remaining purse vs squad fit.
  * **Trap Rival?** Detects if opposing teams have weak budgets or desperation needs for this role.
  * **Fallback Targets:** Identifies top 3 alternative players if you let the current player go.
  * **Squad Gap Analysis:** Pinpoints missing roster categories and overseas limits.
* **Custom Tactical Chat:** Type any question to the AI strategist during intense bidding wars.

### 4. 🛡️ The "Never Get Disqualified" Safe Bid Lock
* Dynamically calculates your mathematical ceiling:
  $$\text{Max Safe Bid} = \text{Purse Remaining} - (\text{Empty Mandatory Slots} - 1) \times \text{Base Price}$$
* Triggers a hard lock and Red Alert if a bid would make it impossible to legally fill your roster.

---

## 🔑 AI Configuration (Gemini 2.5 Flash)
* Click **"Configure Gemini AI Key"** in the top bar or header.
* Paste your key from [Google AI Studio](https://aistudio.google.com/app/apikey).
* Test connection with 1 click. Key is saved locally on your device.
* *Note:* If no key is set, the software operates using intelligent offline heuristics with zero downtime.

---

## ⌨️ Tactical Speed Keys
| Key | Action |
|---|---|
| `/` | Instant search & filter players |
| `W` or `Enter` | Hammer Down: Won by Me |
| `R` | Sold to selected Rival |
| `U` | Mark player Unsold |
| `1`, `2`, `3`, `4` | Rapid bid increments (+0.2, +0.5, +1, +2) |
| `A` | Toggle AI Strategist Drawer |
| `N` or `Space` | Next player from queue |
| `?` | Keyboard shortcuts cheat sheet |

---

## 🚀 Desktop Launch
* Double click the **`Auction War Room`** shortcut directly on your Windows Desktop.
* Or run:
  ```cmd
  C:\Users\arjun\.gemini\antigravity\scratch\auction-warroom\launch-warroom.bat
  ```

